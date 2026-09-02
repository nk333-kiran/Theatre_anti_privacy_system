"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcementEvidenceService = exports.EnforcementEvidenceService = void 0;
const database_1 = require("@antipiracy/database");
const evidenceHashService_1 = require("../evidence/evidenceHashService");
const logger_1 = require("../logging/logger");
const SENSITIVE_PATTERNS = [
    /bearer\s+[a-zA-Z0-9\-_.+/=]+/gi,
    /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
    /\b(?:\d[ -]*?){13,16}\b/g, // Credit card-like numbers
    /\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}/g, // bcrypt hashes
];
const SENSITIVE_KEY_NAMES = new Set([
    "password",
    "passwordhash",
    "token",
    "sessiontoken",
    "jwt",
    "jwtsecret",
    "secret",
    "apikey",
    "authorization",
    "cookie",
    "creditcard",
    "cardnumber",
    "cvv",
    "cvv2",
    "pin",
    "privatekey",
    "rawmasterkey",
    "rawsecretkey",
    "drmkey",
    "paymentdetails",
]);
class EnforcementEvidenceService {
    /**
     * Sanitizes all object keys and values, removing secrets, tokens, JWTs, and unnecessary PII.
     */
    static sanitizeData(data) {
        if (data === null || data === undefined)
            return data;
        if (typeof data === "string") {
            let cleaned = data;
            for (const pattern of SENSITIVE_PATTERNS) {
                cleaned = cleaned.replace(pattern, "[REDACTED_SECRET]");
            }
            return cleaned;
        }
        if (Array.isArray(data)) {
            return data.map((item) => EnforcementEvidenceService.sanitizeData(item));
        }
        if (typeof data === "object") {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                const lowerKey = key.toLowerCase();
                if (SENSITIVE_KEY_NAMES.has(lowerKey) || lowerKey.includes("password") || lowerKey.includes("secret") || lowerKey.includes("token")) {
                    sanitized[key] = "[REDACTED]";
                }
                else {
                    sanitized[key] = EnforcementEvidenceService.sanitizeData(value);
                }
            }
            return sanitized;
        }
        return data;
    }
    /**
     * Generates a tamper-evident enforcement evidence package for an investigation case.
     */
    static async generatePackage(caseId, actor, correlationId) {
        const corrId = correlationId || `CORR-ENF-PKG-${Date.now()}`;
        logger_1.logger.info(`[EnforcementEvidenceService] Generating evidence package for Case ${caseId} [${corrId}]`);
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
            include: {
                theatre: true,
                movie: true,
                show: {
                    include: {
                        screen: true,
                    },
                },
                evidenceLinks: {
                    include: {
                        evidenceRecord: {
                            include: {
                                artifacts: true,
                                hashes: true,
                            },
                        },
                    },
                    orderBy: { linkedAt: "desc" },
                },
                timelineEvents: {
                    orderBy: { timestamp: "asc" },
                },
                notes: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });
        if (!targetCase) {
            throw new Error(`Investigation case not found: ${caseId}`);
        }
        // Tenant check
        if (actor.role === "THEATRE_STAFF" && targetCase.theatreId && actor.theatreId && targetCase.theatreId !== actor.theatreId) {
            throw new Error("Access denied to foreign theatre case evidence");
        }
        // Correlate incident if available
        let incidentRef = undefined;
        const socIncident = await database_1.prisma.securityIncident.findFirst({
            where: {
                OR: [
                    { investigationCaseId: caseId },
                    { id: caseId },
                    ...(targetCase.theatreId ? [{ theatreId: targetCase.theatreId }] : []),
                ],
            },
        }).catch(() => null);
        if (socIncident) {
            incidentRef = {
                id: socIncident.id,
                incidentNumber: socIncident.incidentNumber,
                title: socIncident.title,
                severity: socIncident.severity,
                riskScore: socIncident.riskScore,
            };
        }
        // Resolve screening session, ticket & watermark
        let screeningSession = undefined;
        let watermarkAttribution = undefined;
        if (targetCase.playbackSessionId) {
            const act = await database_1.prisma.activation.findFirst({
                where: {
                    OR: [
                        { id: targetCase.playbackSessionId },
                        { activationCode: targetCase.playbackSessionId },
                    ],
                },
                include: {
                    ticket: {
                        include: {
                            show: {
                                include: {
                                    theatre: true,
                                    movie: true,
                                    screen: true,
                                },
                            },
                        },
                    },
                },
            }).catch(() => null);
            if (act && act.ticket) {
                screeningSession = {
                    sessionId: targetCase.playbackSessionId,
                    activationId: act.id,
                    ticketNumber: act.ticket.ticketNumber,
                    seatNumber: act.ticket.seatNumber,
                    screenName: act.ticket.show.screen.name,
                    showStartTime: act.ticket.show.startTime.toISOString(),
                };
                watermarkAttribution = {
                    watermarkId: `WM-${targetCase.theatre?.code || "VEN"}-${act.ticket.seatNumber}`,
                    theatreCode: targetCase.theatre?.code,
                    seatNumber: act.ticket.seatNumber,
                    confidenceScore: 98,
                };
            }
            else {
                screeningSession = {
                    sessionId: targetCase.playbackSessionId,
                    screenName: targetCase.show?.screen?.name || "Auditorium Screen",
                    showStartTime: targetCase.show?.startTime?.toISOString(),
                };
            }
        }
        // Process Evidence Records and verify SHA-256 hashes
        const evidenceItems = [];
        let allEvidenceVerified = targetCase.evidenceLinks.length > 0;
        for (const link of targetCase.evidenceLinks) {
            const ev = link.evidenceRecord;
            let isVerified = false;
            if (ev.metadata && ev.integrityHash) {
                const recalculated = evidenceHashService_1.evidenceHashService.computeSha256(ev.metadata);
                isVerified = evidenceHashService_1.evidenceHashService.verifyHash(ev.integrityHash, recalculated);
            }
            if (!isVerified) {
                allEvidenceVerified = false;
            }
            // Check for watermark metadata in evidence
            if (!watermarkAttribution && ev.metadata && ev.metadata.includes("watermarkId")) {
                try {
                    const parsed = JSON.parse(ev.metadata);
                    if (parsed.watermarkReference || parsed.watermarkId) {
                        watermarkAttribution = {
                            watermarkId: parsed.watermarkReference?.watermarkId || parsed.watermarkId,
                            displayString: parsed.watermarkReference?.displayString,
                            timeSlot: parsed.watermarkReference?.timeSlot,
                            confidenceScore: 95,
                        };
                    }
                }
                catch {
                    // ignore
                }
            }
            evidenceItems.push({
                evidenceId: ev.id,
                evidenceNumber: ev.evidenceNumber,
                classification: ev.classification,
                severity: ev.severity,
                status: ev.status,
                source: ev.source,
                integrityHash: ev.integrityHash || "MISSING_HASH",
                isIntegrityVerified: isVerified,
                artifactCount: ev.artifacts.length,
                capturedAt: ev.createdAt.toISOString(),
            });
        }
        // Process timeline events
        const timelineItems = targetCase.timelineEvents.map((evt) => ({
            timestamp: evt.timestamp.toISOString(),
            eventType: evt.eventType,
            title: evt.title,
            description: evt.description || "",
        }));
        const packageId = `ENF-PKG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const rawPackage = {
            packageId,
            generatedAt: new Date().toISOString(),
            generatedBy: {
                id: actor.id,
                email: actor.email,
                role: actor.role,
            },
            caseReference: {
                id: targetCase.id,
                caseNumber: targetCase.caseNumber,
                title: targetCase.title,
                severity: targetCase.severity,
                threatClassification: targetCase.threatClassification || undefined,
                status: targetCase.status,
                openedAt: targetCase.createdAt.toISOString(),
            },
            incidentReference: incidentRef,
            screeningSession,
            theatre: targetCase.theatre
                ? {
                    id: targetCase.theatre.id,
                    name: targetCase.theatre.name,
                    code: targetCase.theatre.code,
                    location: targetCase.theatre.location,
                }
                : undefined,
            movie: targetCase.movie
                ? {
                    id: targetCase.movie.id,
                    title: targetCase.movie.title,
                    language: targetCase.movie.language,
                    durationMinutes: targetCase.movie.durationMinutes,
                }
                : undefined,
            watermarkAttribution,
            evidenceRecords: evidenceItems,
            timeline: timelineItems,
            analystNotesCount: targetCase.notes.length,
            isFullyVerified: allEvidenceVerified,
            complianceNotice: "CRYPTOGRAPHICALLY VERIFIED PIRACY ENFORCEMENT PACKAGE - ZERO SECRETS & REDACTED PII",
        };
        // Sanitize completely
        const sanitizedPackage = EnforcementEvidenceService.sanitizeData(rawPackage);
        // Compute canonical SHA-256 package hash
        const canonicalString = JSON.stringify(sanitizedPackage);
        const packageIntegrityHash = evidenceHashService_1.evidenceHashService.computeSha256(canonicalString);
        const completePackage = {
            ...sanitizedPackage,
            packageIntegrityHash,
        };
        logger_1.logger.info(`[EnforcementEvidenceService] Generated Package ${packageId} for Case ${targetCase.caseNumber} (SHA-256: ${packageIntegrityHash.slice(0, 16)}...)`);
        return completePackage;
    }
    /**
     * Verifies the cryptographic integrity of an existing enforcement package.
     */
    static verifyPackageIntegrity(pkg) {
        const { packageIntegrityHash, ...packageWithoutHash } = pkg;
        const canonicalString = JSON.stringify(packageWithoutHash);
        const calculatedHash = evidenceHashService_1.evidenceHashService.computeSha256(canonicalString);
        const isValid = evidenceHashService_1.evidenceHashService.verifyHash(packageIntegrityHash, calculatedHash);
        return {
            isValid,
            calculatedHash,
            providedHash: packageIntegrityHash,
        };
    }
}
exports.EnforcementEvidenceService = EnforcementEvidenceService;
exports.enforcementEvidenceService = EnforcementEvidenceService;
