"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomatedEvidenceService = void 0;
const database_1 = require("@antipiracy/database");
const evidenceHashService_1 = require("./evidenceHashService");
const investigationService_1 = require("./investigationService");
const mobileWatermarkService_1 = require("../mobileWatermarkService");
const logger_1 = require("../logging/logger");
class AutomatedEvidenceService {
    /**
     * Process incoming mobile/protection security telemetry, correlate with active investigation cases,
     * create automated evidence package with SHA-256 hash, and link to case with timeline tracking.
     */
    static async processSuspiciousEvent(params) {
        const correlationId = params.correlationId || `CORR-AUTO-EVD-${Date.now()}`;
        const { incidentId, sessionId, theatreId, showId, movieId, activationId, signalType, riskScore, severity, actorId, actorEmail, actorRole, } = params;
        logger_1.logger.info(`[AutomatedEvidenceService] Processing suspicious event ${signalType} for session ${sessionId} [${correlationId}]`);
        // 1. Resolve Session, Theatre, Movie, Screen & Ticket details
        let sessionData = null;
        let theatreRecord = null;
        let movieRecord = null;
        let screenName = "Auditorium Screen";
        let seatNumber = "UNBOUND";
        let ticketNumber = "UNBOUND";
        let watermarkRef = null;
        if (theatreId) {
            theatreRecord = await database_1.prisma.theatre.findUnique({ where: { id: theatreId } }).catch(() => null);
        }
        if (movieId) {
            movieRecord = await database_1.prisma.movie.findUnique({ where: { id: movieId } }).catch(() => null);
        }
        // Try finding activation and ticket
        if (activationId || sessionId) {
            const act = await database_1.prisma.activation.findFirst({
                where: activationId ? { id: activationId } : { OR: [{ id: sessionId }, { activationCode: sessionId }] },
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
                sessionData = act;
                seatNumber = act.ticket.seatNumber;
                ticketNumber = act.ticket.ticketNumber;
                theatreRecord = theatreRecord || act.ticket.show.theatre;
                movieRecord = movieRecord || act.ticket.show.movie;
                screenName = act.ticket.show.screen.name;
                // Generate current watermark reference for this session
                try {
                    const wm = mobileWatermarkService_1.MobileWatermarkService.generateSessionWatermark({
                        sessionId,
                        theatre: {
                            id: theatreRecord.id,
                            name: theatreRecord.name,
                            code: theatreRecord.code,
                            location: theatreRecord.location || "",
                        },
                        movie: {
                            id: movieRecord.id,
                            title: movieRecord.title,
                            durationMinutes: movieRecord.durationMinutes,
                            language: movieRecord.language,
                            rating: movieRecord.rating || null,
                        },
                        screen: {
                            id: act.ticket.show.screen.id,
                            name: screenName,
                            screenNumber: act.ticket.show.screen.screenNumber || 1,
                            capacity: act.ticket.show.screen.capacity || 200,
                        },
                        show: {
                            id: act.ticket.show.id,
                            startTime: act.ticket.show.startTime.toISOString(),
                            endTime: act.ticket.show.endTime.toISOString(),
                            status: act.ticket.show.status,
                        },
                        seatNumber,
                        activationId: act.id,
                        ticketId: act.ticket.id,
                        ticketNumber,
                        protectionStatus: act.status === "ACTIVE" ? "ACTIVE" : "EXPIRED",
                        activatedAt: act.activatedAt ? act.activatedAt.toISOString() : act.createdAt.toISOString(),
                        expiresAt: act.expiresAt ? act.expiresAt.toISOString() : null,
                        verifiedAt: act.updatedAt.toISOString(),
                    });
                    watermarkRef = {
                        watermarkId: wm.watermarkId,
                        displayString: wm.displayString,
                        timeSlot: wm.timeSlot,
                    };
                }
                catch {
                    // Non-fatal if session is not in active status
                }
            }
        }
        // 2. Resolve or Correlate SOC Incident
        let incidentRecord = null;
        if (incidentId) {
            incidentRecord = await database_1.prisma.securityIncident.findUnique({ where: { id: incidentId } }).catch(() => null);
        }
        // 3. Find or Create InvestigationCase (Never create duplicate cases for the same active session/incident)
        let targetCase = null;
        // A. Check if an active case already exists for this screening session or incident
        if (theatreRecord?.id) {
            targetCase = await database_1.prisma.investigationCase.findFirst({
                where: {
                    theatreId: theatreRecord.id,
                    status: { in: ["OPEN", "TRIAGED", "INVESTIGATING", "CONTAINED"] },
                    OR: [
                        ...(incidentId ? [{ description: { contains: incidentId } }] : []),
                        { playbackSessionId: sessionId },
                        { description: { contains: sessionId } },
                    ],
                },
                include: {
                    theatre: true,
                    movie: true,
                },
            }).catch(() => null);
        }
        const caseSeverity = severity === "CRITICAL" ? "CRITICAL" : severity === "HIGH" || riskScore >= 75 ? "HIGH" : "MEDIUM";
        let isNewCase = false;
        if (!targetCase) {
            // Create new InvestigationCase
            isNewCase = true;
            targetCase = await investigationService_1.investigationService.createCase({
                title: `Automated Incident Investigation: ${movieRecord?.title || "Screening"} (${theatreRecord?.code || "VENUE"})`,
                description: `[Auto-Triggered by ${signalType}] Security signal detected for session ${sessionId}. Initial risk score: ${riskScore}.`,
                severity: caseSeverity,
                threatClassification: signalType === "SCREEN_CAPTURE_SIGNAL" ? "SCREEN_RECORDING_ATTEMPT" : "MOBILE_SECURITY_ANOMALY",
                theatreId: theatreRecord?.id,
                showId: showId || sessionData?.ticket?.showId,
                movieId: movieRecord?.id,
                productionCompanyId: movieRecord?.productionCompanyId || null,
                playbackSessionId: sessionId,
                incidentId,
                correlationId,
                creator: {
                    id: actorId || "SYSTEM_AUTOMATION",
                    email: actorEmail || "automation@antipiracy.system",
                    role: actorRole || "SYSTEM",
                },
            });
        }
        else {
            // Existing case found - update timeline with new correlated signal & update risk
            await database_1.prisma.investigationTimelineEvent.create({
                data: {
                    caseId: targetCase.id,
                    title: "Correlated Mobile Security Event",
                    description: `[${correlationId}] Additional ${signalType} signal recorded for session ${sessionId}. Risk Delta: ${riskScore}.`,
                    eventType: "RISK_UPDATED",
                    actorId: actorId || "SYSTEM_AUTOMATION",
                },
            }).catch(() => { });
            if (incidentRecord) {
                await database_1.prisma.investigationTimelineEvent.create({
                    data: {
                        caseId: targetCase.id,
                        title: "Security Incident Correlated",
                        description: `[${correlationId}] Correlated with SOC Incident ${incidentRecord.incidentNumber}: ${incidentRecord.title}`,
                        eventType: "INCIDENT_LINKED",
                        actorId: actorId || "SYSTEM_AUTOMATION",
                    },
                }).catch(() => { });
            }
        }
        // 4. Fetch recent security event history for this session
        const recentEvents = await database_1.prisma.realtimeThreatEvent.findMany({
            where: {
                OR: [
                    { activationId: activationId || undefined },
                    { metadata: { contains: sessionId } },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }).catch(() => []);
        const eventTimeline = recentEvents.map((evt) => ({
            eventType: evt.eventType,
            timestamp: evt.createdAt.toISOString(),
            severity: evt.severity,
            eventId: evt.eventId,
        }));
        // 5. Construct Canonical Automated Evidence Package
        const packageId = `PKG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const packagePayload = {
            packageId,
            incidentReference: incidentRecord
                ? {
                    id: incidentRecord.id,
                    incidentNumber: incidentRecord.incidentNumber,
                    title: incidentRecord.title,
                    severity: incidentRecord.severity,
                    riskScore: incidentRecord.riskScore,
                }
                : undefined,
            screeningSession: {
                sessionId,
                activationId: activationId || sessionData?.id,
                seatNumber,
                ticketNumber,
            },
            theatre: {
                id: theatreRecord?.id,
                name: theatreRecord?.name || "Auditorium Venue",
                code: theatreRecord?.code || "VEN",
            },
            movie: {
                id: movieRecord?.id,
                title: movieRecord?.title || "Active Screening Feature",
            },
            screen: {
                name: screenName,
            },
            securityEventTimeline: eventTimeline,
            watermarkReference: watermarkRef || undefined,
            riskScore,
            severity: String(severity),
            generatedAt: new Date().toISOString(),
        };
        // Calculate deterministic SHA-256 hash on sanitized package
        const canonicalPackageStr = JSON.stringify(packagePayload);
        const integrityHash = evidenceHashService_1.evidenceHashService.computeSha256(canonicalPackageStr);
        // 6. Create Evidence Vault Record (EV-AUTO-*)
        const evidenceNumber = `EV-AUTO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const classification = signalType === "SCREEN_CAPTURE_SIGNAL"
            ? "SCREENSHOT_CAPTURE"
            : watermarkRef
                ? "WATERMARK_MATCH"
                : "PLAYBACK_ANOMALY";
        let validPlaybackSessionId = null;
        if (sessionId) {
            const existingSession = await database_1.prisma.playbackSession.findUnique({
                where: { id: sessionId },
            }).catch(() => null);
            if (existingSession) {
                validPlaybackSessionId = existingSession.id;
            }
        }
        const evidenceRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber,
                title: `Automated Evidence Package: ${movieRecord?.title || "Feature Film"} - Seat ${seatNumber}`,
                description: `Automated forensic telemetry bundle captured for session ${sessionId} [Signal: ${signalType}]`,
                classification,
                severity,
                status: "VERIFIED",
                retentionStatus: "ACTIVE",
                theatreId: theatreRecord?.id || null,
                showId: showId || sessionData?.ticket?.showId || null,
                movieId: movieRecord?.id || null,
                productionCompanyId: movieRecord?.productionCompanyId || null,
                playbackSessionId: validPlaybackSessionId,
                incidentId: incidentId || null,
                source: "AUTOMATED_EVIDENCE_ENGINE",
                capturedBy: "SYSTEM_AUTOMATION",
                metadata: canonicalPackageStr,
                integrityHash,
            },
        });
        // Create Hash verification record
        await database_1.prisma.evidenceHash.create({
            data: {
                evidenceRecordId: evidenceRecord.id,
                calculatedHash: integrityHash,
                algorithm: "SHA-256",
                verificationStatus: "VALID",
            },
        }).catch(() => { });
        // 7. Link Evidence to Investigation Case
        await investigationService_1.investigationService.linkEvidence({
            caseId: targetCase.id,
            evidenceRecordId: evidenceRecord.id,
            relevance: `Automated forensic package with verified SHA-256 integrity [${packageId}]`,
            actor: {
                id: actorId || "SYSTEM_AUTOMATION",
                email: actorEmail || "automation@antipiracy.system",
                role: "SYSTEM",
                theatreId: theatreRecord?.id,
            },
            correlationId,
        });
        // 8. Add Automated Timeline Events to Case
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: targetCase.id,
                title: "Automated Evidence Package Created",
                description: `[${correlationId}] Package ${evidenceNumber} (${packageId}) recorded in Evidence Vault. SHA-256: ${integrityHash.slice(0, 16)}...`,
                eventType: "EVIDENCE_PACKAGE_CREATED",
                actorId: actorId || "SYSTEM_AUTOMATION",
            },
        }).catch(() => { });
        if (watermarkRef) {
            await database_1.prisma.investigationTimelineEvent.create({
                data: {
                    caseId: targetCase.id,
                    title: "Session Watermark Linked",
                    description: `[${correlationId}] Cryptographic session watermark ${watermarkRef.watermarkId} linked to evidence package.`,
                    eventType: "WATERMARK_LINKED",
                    actorId: actorId || "SYSTEM_AUTOMATION",
                },
            }).catch(() => { });
        }
        return {
            success: true,
            caseId: targetCase.id,
            caseNumber: targetCase.caseNumber,
            isNewCase,
            evidenceId: evidenceRecord.id,
            evidenceNumber: evidenceRecord.evidenceNumber,
            integrityHash,
            correlationId,
            package: packagePayload,
        };
    }
    /**
     * Cryptographically verify integrity of all evidence records attached to an investigation case
     */
    static async verifyCaseEvidenceIntegrity(caseId) {
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
            include: {
                evidenceLinks: {
                    include: {
                        evidenceRecord: true,
                    },
                },
            },
        });
        if (!targetCase) {
            throw new Error(`Investigation case ${caseId} not found`);
        }
        let verifiedCount = 0;
        let tamperedCount = 0;
        const details = [];
        for (const link of targetCase.evidenceLinks) {
            const ev = link.evidenceRecord;
            if (!ev.metadata || !ev.integrityHash) {
                tamperedCount++;
                details.push({
                    evidenceId: ev.id,
                    evidenceNumber: ev.evidenceNumber,
                    status: "MISSING_HASH",
                    isValid: false,
                });
                continue;
            }
            const recalculated = evidenceHashService_1.evidenceHashService.computeSha256(ev.metadata);
            const isValid = evidenceHashService_1.evidenceHashService.verifyHash(ev.integrityHash, recalculated);
            if (isValid) {
                verifiedCount++;
                details.push({
                    evidenceId: ev.id,
                    evidenceNumber: ev.evidenceNumber,
                    status: "VALID",
                    isValid: true,
                    hash: ev.integrityHash,
                });
            }
            else {
                tamperedCount++;
                details.push({
                    evidenceId: ev.id,
                    evidenceNumber: ev.evidenceNumber,
                    status: "TAMPERED",
                    isValid: false,
                    expectedHash: ev.integrityHash,
                    calculatedHash: recalculated,
                });
            }
        }
        return {
            caseId,
            caseNumber: targetCase.caseNumber,
            isIntegrityValid: tamperedCount === 0,
            totalEvidenceCount: targetCase.evidenceLinks.length,
            verifiedCount,
            tamperedCount,
            verifiedAt: new Date().toISOString(),
            details,
        };
    }
}
exports.AutomatedEvidenceService = AutomatedEvidenceService;
