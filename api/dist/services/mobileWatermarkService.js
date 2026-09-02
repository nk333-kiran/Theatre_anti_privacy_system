"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileWatermarkService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const envValidator_1 = require("../config/envValidator");
const errorHandler_1 = require("../middleware/errorHandler");
const evidenceHashService_1 = require("./evidence/evidenceHashService");
const socIncidentManager_1 = require("./soc/socIncidentManager");
class MobileWatermarkService {
    static ROTATION_INTERVAL_SEC = 30;
    /**
     * Generates cryptographic dynamic session watermark
     */
    static generateSessionWatermark(session, customEpochSlot) {
        if (session.protectionStatus !== "ACTIVE") {
            throw new errorHandler_1.AppError("Cannot generate active watermark for expired or inactive session", 400, "SESSION_NOT_ACTIVE");
        }
        const now = new Date();
        const timeSlot = customEpochSlot ?? Math.floor(now.getTime() / (this.ROTATION_INTERVAL_SEC * 1000));
        const sessionSuffix = session.sessionId.split("-").slice(-2).join("");
        // Deterministic HMAC signature over session parameters
        const signaturePayload = `${session.sessionId}:${session.theatre.code}:${session.screen.name}:${session.seatNumber}:${timeSlot}`;
        const hmac = crypto_1.default
            .createHmac("sha256", envValidator_1.env.JWT_SECRET)
            .update(signaturePayload)
            .digest("hex")
            .slice(0, 10)
            .toUpperCase();
        const watermarkId = `WM-${session.theatre.code}.${session.sessionId}.${timeSlot}.${hmac}`;
        const displayString = `${session.theatre.code} • ${session.screen.name} • Seat ${session.seatNumber} • [${watermarkId}]`;
        return {
            watermarkId,
            sessionId: session.sessionId,
            theatreCode: session.theatre.code,
            theatreName: session.theatre.name,
            screenName: session.screen.name,
            seatNumber: session.seatNumber,
            timestamp: now.toISOString(),
            timeSlot,
            rotationIntervalSec: this.ROTATION_INTERVAL_SEC,
            protectionStatus: session.protectionStatus,
            displayString,
        };
    }
    /**
     * Validates watermark identifier integrity & signature
     */
    static validateWatermarkSignature(watermarkId, sessionId, theatreCode, screenName, seatNumber, timeSlot) {
        const signaturePayload = `${sessionId}:${theatreCode}:${screenName}:${seatNumber}:${timeSlot}`;
        const expectedHmac = crypto_1.default
            .createHmac("sha256", envValidator_1.env.JWT_SECRET)
            .update(signaturePayload)
            .digest("hex")
            .slice(0, 10)
            .toUpperCase();
        // Extract HMAC from either dot-separated or dash-separated token
        let providedHmac = "";
        if (watermarkId.includes(".")) {
            const parts = watermarkId.split(".");
            providedHmac = parts[parts.length - 1];
        }
        else {
            const parts = watermarkId.split("-");
            providedHmac = parts[parts.length - 1];
        }
        return Boolean(providedHmac && providedHmac === expectedHmac);
    }
    /**
     * Attribute watermark to the originating protected screening session
     */
    static async attributeWatermark(params) {
        const { watermarkId, userRole, userTheatreId } = params;
        if (!watermarkId || (!watermarkId.startsWith("WM.") && !watermarkId.startsWith("WM-"))) {
            throw new errorHandler_1.AppError("Invalid watermark identifier format", 400, "INVALID_WATERMARK_FORMAT");
        }
        let theatreCode = "";
        let sessionIdCandidate = "";
        let timeSlot = 0;
        if (watermarkId.includes(".")) {
            const parts = watermarkId.split(".");
            if (parts.length < 4) {
                throw new errorHandler_1.AppError("Malformed watermark identifier", 400, "MALFORMED_WATERMARK");
            }
            theatreCode = parts[0].replace(/^WM[-.]/, "");
            sessionIdCandidate = parts[1];
            timeSlot = parseInt(parts[2], 10);
        }
        else {
            const parts = watermarkId.split("-");
            if (parts.length < 4) {
                throw new errorHandler_1.AppError("Malformed watermark identifier", 400, "MALFORMED_WATERMARK");
            }
            theatreCode = parts[1];
            timeSlot = parseInt(parts[parts.length - 2], 10);
        }
        // Locate protection event / session record matching candidate session ID or theatre code
        const protectionEvents = await database_1.prisma.protectionEvent.findMany({
            where: sessionIdCandidate
                ? { metadata: { contains: sessionIdCandidate } }
                : {
                    OR: [
                        { metadata: { contains: theatreCode } },
                        { theatre: { code: theatreCode } },
                    ],
                },
            orderBy: { createdAt: "desc" },
            include: {
                activation: {
                    include: {
                        ticket: {
                            include: {
                                show: {
                                    include: {
                                        movie: true,
                                        theatre: true,
                                        screen: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            take: 30,
        });
        let matchedSession = null;
        for (const evt of protectionEvents) {
            const act = evt.activation;
            if (!act || !act.ticket)
                continue;
            let parsedMeta = {};
            try {
                parsedMeta = JSON.parse(evt.metadata || "{}");
            }
            catch {
                continue;
            }
            const sessId = parsedMeta.sessionId;
            if (!sessId)
                continue;
            // Verify HMAC against this candidate session
            const isValid = this.validateWatermarkSignature(watermarkId, sessId, act.ticket.show.theatre.code, act.ticket.show.screen.name, act.ticket.seatNumber, timeSlot);
            if (isValid) {
                matchedSession = {
                    activation: act,
                    sessionId: sessId,
                };
                break;
            }
        }
        if (!matchedSession) {
            throw new errorHandler_1.AppError("Watermark signature verification failed or tampered", 400, "WATERMARK_VERIFICATION_FAILED");
        }
        const { activation, sessionId } = matchedSession;
        const { ticket } = activation;
        const { show } = ticket;
        // Tenant / Theatre Isolation Enforcement
        if (userTheatreId && userRole !== "ADMIN" && show.theatreId !== userTheatreId) {
            throw new errorHandler_1.AppError("Unauthorized cross-theatre attribution access", 403, "UNAUTHORIZED_THEATRE");
        }
        return {
            watermarkId,
            sessionId,
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            seatNumber: ticket.seatNumber,
            protectionStatus: activation.status,
            movie: {
                id: show.movie.id,
                title: show.movie.title,
                durationMinutes: show.movie.durationMinutes,
                language: show.movie.language,
            },
            theatre: {
                id: show.theatre.id,
                name: show.theatre.name,
                code: show.theatre.code,
                location: show.theatre.location,
            },
            screen: {
                id: show.screen.id,
                name: show.screen.name,
                screenNumber: show.screen.screenNumber,
            },
            show: {
                id: show.id,
                startTime: show.startTime.toISOString(),
                endTime: show.endTime.toISOString(),
                status: show.status,
            },
            attributedAt: new Date().toISOString(),
            confidenceScore: 100, // 100% Cryptographic Match
        };
    }
    /**
     * Create Forensic Evidence Record in Evidence Vault & correlate with SOC
     */
    static async createForensicEvidence(params) {
        const { watermarkId, sessionId, reason = "Dynamic Watermark Forensic Evidence Recorded", incidentId, actorId, actorEmail, actorRole, clientIp, userAgent } = params;
        if (!watermarkId || !sessionId) {
            throw new errorHandler_1.AppError("watermarkId and sessionId are required", 400, "MISSING_EVIDENCE_PARAMS");
        }
        // 1. Locate underlying session / activation
        const protectionEvent = await database_1.prisma.protectionEvent.findFirst({
            where: { metadata: { contains: sessionId } },
            include: {
                activation: {
                    include: {
                        ticket: {
                            include: { show: true },
                        },
                    },
                },
            },
        });
        const theatreId = protectionEvent?.theatreId || protectionEvent?.activation?.ticket?.show?.theatreId;
        const showId = protectionEvent?.showId || protectionEvent?.activation?.ticket?.show?.id;
        const movieId = protectionEvent?.activation?.ticket?.show?.movieId;
        const evidenceNumber = `EV-WM-${Date.now().toString().slice(-6)}-${crypto_1.default.randomBytes(2).toString("hex").toUpperCase()}`;
        const createdAt = new Date();
        // 2. Canonical metadata payload for deterministic SHA-256 hash
        const canonicalMetadata = JSON.stringify({
            evidenceNumber,
            watermarkId,
            sessionId,
            theatreId: theatreId || "UNKNOWN",
            showId: showId || "UNKNOWN",
            movieId: movieId || "UNKNOWN",
            reason,
            createdAt: createdAt.toISOString(),
        });
        const evidenceHash = evidenceHashService_1.evidenceHashService.computeSha256(canonicalMetadata);
        // 3. Create EvidenceRecord in Database (Evidence Vault)
        const evidenceRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber,
                title: `Dynamic Watermark Forensic Trace: ${watermarkId}`,
                classification: "WATERMARK_MATCH",
                severity: "HIGH",
                status: "COLLECTED",
                retentionStatus: "ACTIVE",
                theatreId: theatreId || null,
                movieId: movieId || null,
                showId: showId || null,
                source: "MOBILE_SESSION_WATERMARK",
                metadata: canonicalMetadata,
            },
        });
        // 4. Ingest into SecurityAuditLog
        try {
            await database_1.prisma.securityAuditLog.create({
                data: {
                    eventType: database_1.SecurityEventType.FORENSIC_MATCH || database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                    severity: "HIGH",
                    userId: actorId || null,
                    actorEmail: actorEmail || null,
                    actorRole: actorRole || null,
                    theatreId: theatreId || null,
                    showId: showId || null,
                    ipAddress: clientIp || null,
                    userAgent: userAgent || null,
                    actionSummary: `Forensic evidence ${evidenceNumber} logged for watermark ${watermarkId}`,
                    metadata: canonicalMetadata,
                    isThreat: false,
                },
            });
        }
        catch (auditErr) {
            // Non-fatal
        }
        // 5. Ingest into RealtimeThreatEvent
        try {
            await database_1.prisma.realtimeThreatEvent.create({
                data: {
                    eventId: `EVT-EVD-${Date.now()}`,
                    correlationId: `CORR-EVD-${evidenceNumber}`,
                    eventType: "FORENSIC_EVIDENCE_RECORDED",
                    source: "WATERMARK_FORENSIC_ENGINE",
                    severity: database_1.IncidentSeverity.HIGH,
                    theatreId: theatreId || null,
                    showId: showId || null,
                    movieId: movieId || null,
                    metadata: canonicalMetadata,
                },
            });
        }
        catch (threatErr) {
            // Non-fatal
        }
        // 6. Link to SOC Incident if provided or create if high severity
        let correlatedIncidentId = incidentId;
        if (!correlatedIncidentId && theatreId) {
            try {
                const incident = await socIncidentManager_1.SocIncidentManager.createIncident({
                    title: `Forensic Watermark Evidence: ${evidenceNumber}`,
                    description: `Captured forensic watermark evidence ${watermarkId} for session ${sessionId}`,
                    severity: database_1.IncidentSeverity.HIGH,
                    source: database_1.IncidentSource.FORENSIC_MATCH,
                    theatreId,
                    showId,
                    movieId,
                    riskScore: 70,
                    actorId,
                    actorEmail,
                });
                correlatedIncidentId = incident.id;
            }
            catch {
                // Non-fatal
            }
        }
        return {
            evidenceId: evidenceRecord.id,
            evidenceNumber: evidenceRecord.evidenceNumber,
            evidenceHash,
            classification: evidenceRecord.classification,
            status: evidenceRecord.status,
            sessionId,
            watermarkId,
            createdAt: createdAt.toISOString(),
            correlatedIncidentId,
        };
    }
}
exports.MobileWatermarkService = MobileWatermarkService;
