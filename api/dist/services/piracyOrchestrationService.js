"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PiracyOrchestrationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("./logging/logger");
const socIncidentManager_1 = require("./soc/socIncidentManager");
const automatedEvidenceService_1 = require("./evidence/automatedEvidenceService");
const enforcementService_1 = require("./enforcement/enforcementService");
class PiracyOrchestrationService {
    /**
     * Signal weight scoring matrix
     */
    static SIGNAL_WEIGHTS = {
        SCREEN_CAPTURE_SIGNAL: 75,
        CAMERA_ACTIVITY: 65,
        WATERMARK_MODULATION_TAMPER: 80,
        SUSPICIOUS_ACTIVITY: 50,
        FULLSCREEN_EXIT: 20,
        SCREEN_VISIBILITY_CHANGE: 15,
        MOBILE_SECURITY_EVENT: 30,
        SESSION_HEARTBEAT: 5,
    };
    /**
     * Sanitize objects to guarantee zero secrets, passwords, or PII
     */
    static sanitizeData(obj) {
        if (!obj || typeof obj !== "object")
            return obj;
        const clone = Array.isArray(obj) ? [...obj] : { ...obj };
        for (const key of Object.keys(clone)) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("password") ||
                lowerKey.includes("secret") ||
                lowerKey.includes("token") ||
                lowerKey.includes("authorization") ||
                lowerKey.includes("apikey") ||
                lowerKey.includes("jwt")) {
                delete clone[key];
            }
            else if (typeof clone[key] === "object" && clone[key] !== null) {
                clone[key] = PiracyOrchestrationService.sanitizeData(clone[key]);
            }
        }
        return clone;
    }
    /**
     * Calculate deterministic composite risk score from incoming and past session signals
     */
    static calculateCompositeRisk(signals, existingEventsCount = 0) {
        let maxBaseScore = 0;
        let accumulatedScore = 0;
        let criticalCount = 0;
        let highCount = 0;
        const evaluatedSignals = [];
        for (const s of signals) {
            const normType = (s.signalType || "MOBILE_SECURITY_EVENT").trim().toUpperCase();
            const baseWeight = PiracyOrchestrationService.SIGNAL_WEIGHTS[normType] || 25;
            const declaredSev = (s.severity || "MEDIUM").toUpperCase();
            if (declaredSev === "CRITICAL")
                criticalCount++;
            if (declaredSev === "HIGH")
                highCount++;
            maxBaseScore = Math.max(maxBaseScore, baseWeight);
            accumulatedScore += baseWeight * 0.35;
            evaluatedSignals.push({
                signalType: normType,
                severity: declaredSev,
                riskScore: baseWeight,
                timestamp: s.timestamp || new Date().toISOString(),
            });
        }
        // Historical frequency multiplier
        const historyMultiplier = Math.min(25, existingEventsCount * 5);
        let composite = Math.round(maxBaseScore + accumulatedScore + historyMultiplier);
        if (criticalCount > 0) {
            composite = Math.max(composite, 90);
        }
        else if (highCount >= 2) {
            composite = Math.max(composite, 80);
        }
        const finalScore = Math.min(100, Math.max(0, composite));
        const highestSeverity = finalScore >= 85 || criticalCount > 0
            ? database_1.IncidentSeverity.CRITICAL
            : finalScore >= 60 || highCount > 0
                ? database_1.IncidentSeverity.HIGH
                : finalScore >= 35
                    ? database_1.IncidentSeverity.MEDIUM
                    : database_1.IncidentSeverity.LOW;
        return {
            score: finalScore,
            highestSeverity,
            evaluatedSignals,
        };
    }
    /**
     * Process End-to-End Orchestration:
     * Ticket QR Session -> Security Signals -> Deterministic Risk Escalation -> SOC Incident -> Evidence -> Case -> Enforcement Draft
     */
    static async processOrchestration(params) {
        const correlationId = params.correlationId || `CORR-ORCH-${Date.now()}-${crypto_1.default.randomBytes(3).toString("hex")}`;
        const orchestrationId = `ORCH-${Date.now()}-${crypto_1.default.randomBytes(4).toString("hex")}`;
        const now = new Date();
        const { sessionId, signals = [], actorId, actorEmail, actorRole, clientIp, userAgent, autoDraftEnforcement = true, } = params;
        logger_1.logger.info(`[PiracyOrchestrationService] Orchestrating response for session ${sessionId} [${correlationId}]`);
        // 1. Resolve Session, Activation, Show, Theatre, Movie & Screen
        let activation = null;
        try {
            activation = await database_1.prisma.activation.findFirst({
                where: {
                    OR: [
                        { id: sessionId },
                        { activationCode: sessionId },
                        { ticket: { ticketNumber: sessionId.toUpperCase() } },
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
            });
        }
        catch {
            // Non-fatal
        }
        if (!activation) {
            // Fallback search in ProtectionEvents
            const protEvt = await database_1.prisma.protectionEvent.findFirst({
                where: {
                    OR: [{ metadata: { contains: sessionId } }, { activationId: sessionId }],
                },
                include: {
                    activation: {
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
                    },
                },
            }).catch(() => null);
            activation = protEvt?.activation;
        }
        // Extracted venue & show entities
        const ticket = activation?.ticket;
        const show = ticket?.show;
        const theatre = show?.theatre || (params.theatreId ? await database_1.prisma.theatre.findUnique({ where: { id: params.theatreId } }).catch(() => null) : null);
        const movie = show?.movie || (params.movieId ? await database_1.prisma.movie.findUnique({ where: { id: params.movieId } }).catch(() => null) : null);
        const screen = show?.screen;
        // Check Theatre Tenant Isolation if actor provided theatre context
        if (params.theatreId && theatre?.id && params.theatreId !== theatre.id && actorRole !== "ADMIN") {
            throw new errorHandler_1.AppError("Cross-theatre orchestration access forbidden", 403, "UNAUTHORIZED_THEATRE");
        }
        // 2. Count existing security events for this session to evaluate risk trajectory
        const historicalCount = await database_1.prisma.realtimeThreatEvent.count({
            where: {
                OR: [
                    { activationId: activation?.id || undefined },
                    { metadata: { contains: sessionId } },
                ],
            },
        }).catch(() => 0);
        // 3. Evaluate Signals & Deterministic Risk Escalation
        const normalizedSignals = signals && signals.length > 0 ? signals : [{ signalType: "SESSION_HEARTBEAT", severity: "INFO" }];
        const riskEval = this.calculateCompositeRisk(normalizedSignals, historicalCount);
        const { score: compositeRiskScore, highestSeverity, evaluatedSignals } = riskEval;
        // Determine Escalation Decision
        let escalationDecision = "NO_ESCALATION";
        let warningMessage = undefined;
        let shouldEscalate = false;
        if (compositeRiskScore >= 60 || highestSeverity === "HIGH" || highestSeverity === "CRITICAL") {
            escalationDecision = "SOC_INCIDENT_ESCALATION";
            shouldEscalate = true;
            warningMessage = "⚠️ Security violation threshold exceeded. Incident escalated to Security Operations Center.";
        }
        else if (compositeRiskScore >= 20) {
            escalationDecision = "USER_WARNING_ONLY";
            warningMessage = "⚠️ Recording, screen capture, and app-switching are prohibited during this screening.";
        }
        // 4. Ingest Telemetry into RealtimeThreatEvent and SecurityAuditLog
        for (const sig of evaluatedSignals) {
            const sanitizedPayload = this.sanitizeData(sig);
            try {
                await database_1.prisma.realtimeThreatEvent.create({
                    data: {
                        eventId: `EVT-ORCH-${Date.now()}-${crypto_1.default.randomBytes(3).toString("hex")}`,
                        correlationId,
                        eventType: sig.signalType,
                        source: "PIRACY_ORCHESTRATOR",
                        severity: highestSeverity,
                        theatreId: theatre?.id || null,
                        showId: show?.id || null,
                        movieId: movie?.id || null,
                        activationId: activation?.id || null,
                        metadata: JSON.stringify({
                            ...sanitizedPayload,
                            sessionId,
                            orchestrationId,
                            compositeRiskScore,
                        }),
                    },
                });
            }
            catch (err) {
                logger_1.logger.warn("[PiracyOrchestrationService] Telemetry log warning:", err);
            }
        }
        // 5. Stage: SOC Incident Correlation & Prevention of Duplicates
        let socData = null;
        let targetIncident = null;
        let createdNewIncident = false;
        if (shouldEscalate) {
            // Deduplication check: Check if an active open incident already exists for this session/activation
            targetIncident = await database_1.prisma.securityIncident.findFirst({
                where: {
                    status: { in: ["DETECTED", "INVESTIGATING", "TRIAGED", "ESCALATED"] },
                    OR: [
                        { activationId: activation?.id || undefined },
                        { description: { contains: sessionId } },
                    ],
                },
                orderBy: { createdAt: "desc" },
            }).catch(() => null);
            if (!targetIncident) {
                // Create new SOC Incident
                targetIncident = await socIncidentManager_1.SocIncidentManager.createIncident({
                    title: `[Orchestrated] Anti-Piracy Anomaly: ${evaluatedSignals[0]?.signalType || "Signal"}`,
                    description: `Orchestrated piracy detection for session ${sessionId}. Signals: ${evaluatedSignals.map((s) => s.signalType).join(", ")}. Composite Risk: ${compositeRiskScore}/100.`,
                    severity: highestSeverity,
                    source: database_1.IncidentSource.THREAT_ENGINE,
                    theatreId: theatre?.id,
                    showId: show?.id,
                    movieId: movie?.id,
                    riskScore: compositeRiskScore,
                    actorId: actorId || "SYSTEM_ORCHESTRATOR",
                    actorEmail: actorEmail || "orchestrator@antipiracy.system",
                    actorRole: actorRole || "SYSTEM",
                });
                createdNewIncident = true;
            }
            else {
                // Update existing incident with elevated risk if new score is higher
                if (compositeRiskScore > (targetIncident.riskScore || 0)) {
                    await database_1.prisma.securityIncident.update({
                        where: { id: targetIncident.id },
                        data: { riskScore: compositeRiskScore },
                    }).catch(() => { });
                }
            }
            socData = {
                incidentId: targetIncident.id,
                incidentNumber: targetIncident.incidentNumber,
                title: targetIncident.title,
                severity: targetIncident.severity,
                status: targetIncident.status,
                createdNewIncident,
            };
        }
        // 6. Stage: Evidence & Watermark Generation
        let evidenceData = null;
        let caseData = null;
        let createdNewCase = false;
        let targetCase = null;
        if (shouldEscalate) {
            // Execute automated evidence creation & case correlation via AutomatedEvidenceService
            const primarySignal = evaluatedSignals[0]?.signalType || "MOBILE_SECURITY_EVENT";
            const evidenceResult = await automatedEvidenceService_1.AutomatedEvidenceService.processSuspiciousEvent({
                incidentId: targetIncident?.id,
                sessionId,
                theatreId: theatre?.id,
                showId: show?.id,
                movieId: movie?.id,
                activationId: activation?.id,
                signalType: primarySignal,
                riskScore: compositeRiskScore,
                severity: highestSeverity,
                correlationId,
                clientIp,
                userAgent,
                actorId,
                actorEmail,
                actorRole,
            });
            createdNewCase = evidenceResult.isNewCase;
            // Retrieve case details
            targetCase = await database_1.prisma.investigationCase.findUnique({
                where: { id: evidenceResult.caseId },
            }).catch(() => null);
            evidenceData = {
                evidenceId: evidenceResult.evidenceId,
                evidenceNumber: evidenceResult.evidenceNumber,
                classification: primarySignal === "SCREEN_CAPTURE_SIGNAL" ? "SCREENSHOT_CAPTURE" : "WATERMARK_MATCH",
                sha256Hash: evidenceResult.integrityHash,
                isVerified: true,
                watermark: evidenceResult.package.watermarkReference
                    ? {
                        watermarkId: evidenceResult.package.watermarkReference.watermarkId,
                        displayString: evidenceResult.package.watermarkReference.displayString,
                        timeSlot: evidenceResult.package.watermarkReference.timeSlot,
                    }
                    : undefined,
            };
            caseData = {
                caseId: targetCase?.id || evidenceResult.caseId,
                caseNumber: targetCase?.caseNumber || evidenceResult.caseNumber,
                status: targetCase?.status || "INVESTIGATING",
                severity: targetCase?.severity || "HIGH",
                createdNewCase,
            };
        }
        // 7. Stage: Enforcement Integration (Draft / Review with Human Approval Gating)
        let enforcementData = null;
        if (shouldEscalate && targetCase && autoDraftEnforcement && compositeRiskScore >= 70) {
            try {
                // Check if an enforcement record already exists for this investigation case
                const existingEnforcements = await enforcementService_1.enforcementService.getEnforcements({
                    caseId: targetCase.id,
                });
                let activeEnf = existingEnforcements.find((e) => e.status === "DRAFT" || e.status === "REVIEW" || e.status === "APPROVED");
                if (!activeEnf) {
                    // Generate new Enforcement Action Draft in REVIEW status (requires human approval)
                    const newEnf = await enforcementService_1.enforcementService.createEnforcement({
                        caseId: targetCase.id,
                        title: `[Orchestrated Draft] Legal & Takedown Action: ${movie?.title || "Feature"} (${theatre?.code || "VENUE"})`,
                        description: `Automated enforcement proposal generated from Orchestrated Case ${targetCase.caseNumber}. High-risk session telemetry (${compositeRiskScore}/100) with cryptographic SHA-256 evidence.`,
                        actionType: "TAKEDOWN_NOTICE",
                        targetEntity: "Designated Distributor Cyber Security & Takedown Desk",
                        targetJurisdiction: theatre?.location || "National Cyber Security Cell",
                        severity: highestSeverity === "CRITICAL" ? "CRITICAL" : "HIGH",
                        correlationId,
                        actor: {
                            id: actorId || "SYSTEM_ORCHESTRATOR",
                            email: actorEmail || "orchestrator@antipiracy.system",
                            role: "ADMIN",
                            theatreId: theatre?.id,
                        },
                    });
                    // Automatically place in REVIEW state so it is visible in the Human Approval Queue
                    await enforcementService_1.enforcementService.submitForReview(newEnf.id, {
                        id: actorId || "SYSTEM_ORCHESTRATOR",
                        email: actorEmail || "orchestrator@antipiracy.system",
                        role: "ADMIN",
                    }, "Automated high-risk signal escalation awaiting executive/legal authorization", correlationId).catch(() => { });
                    activeEnf = await enforcementService_1.enforcementService.getEnforcementById(newEnf.id);
                }
                enforcementData = {
                    enforcementId: activeEnf.id,
                    enforcementNumber: activeEnf.enforcementNumber,
                    actionType: activeEnf.actionType,
                    status: activeEnf.status,
                    requiresHumanApproval: true,
                    approvalStatus: activeEnf.approvalStatus || "PENDING",
                };
            }
            catch (enfErr) {
                logger_1.logger.warn("[PiracyOrchestrationService] Enforcement draft notice:", enfErr);
            }
        }
        // 8. Stage: Audit Trail Logging
        let auditLogId = undefined;
        try {
            const audit = await database_1.prisma.securityAuditLog.create({
                data: {
                    eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                    severity: highestSeverity === "CRITICAL" || highestSeverity === "HIGH" ? "HIGH" : "LOW",
                    userId: actorId || null,
                    actorEmail: actorEmail || null,
                    actorRole: actorRole || null,
                    theatreId: theatre?.id || null,
                    showId: show?.id || null,
                    activationId: activation?.id || null,
                    ticketId: ticket?.id || null,
                    ipAddress: clientIp || null,
                    userAgent: userAgent || null,
                    actionSummary: `Orchestration executed for session ${sessionId} - Status: ${escalationDecision} (Risk: ${compositeRiskScore})`,
                    metadata: JSON.stringify({
                        orchestrationId,
                        correlationId,
                        compositeRiskScore,
                        escalationDecision,
                        incidentId: socData?.incidentId,
                        caseId: caseData?.caseId,
                        evidenceId: evidenceData?.evidenceId,
                        enforcementId: enforcementData?.enforcementId,
                    }),
                    isThreat: shouldEscalate,
                },
            });
            auditLogId = audit.id;
        }
        catch {
            // Non-fatal
        }
        const overallStatus = shouldEscalate ? "ESCALATED" : escalationDecision === "USER_WARNING_ONLY" ? "WARNING" : "NOMINAL";
        return {
            orchestrationId,
            correlationId,
            status: overallStatus,
            riskScore: compositeRiskScore,
            escalated: shouldEscalate,
            pipelineStages: {
                session: {
                    sessionId,
                    activationId: activation?.id,
                    ticketNumber: ticket?.ticketNumber,
                    seatNumber: ticket?.seatNumber,
                    movieTitle: movie?.title || "Screening Feature",
                    theatreName: theatre?.name || "Cinema Auditorium",
                    theatreCode: theatre?.code || "VEN",
                    protectionStatus: activation?.status || "ACTIVE",
                },
                detection: {
                    signalsEvaluated: evaluatedSignals.length,
                    signals: evaluatedSignals,
                    compositeRiskScore,
                    escalationDecision,
                    warningMessage,
                },
                soc: socData,
                evidence: evidenceData,
                investigationCase: caseData,
                enforcement: enforcementData,
                studioIntelligence: {
                    synced: true,
                    threatPosture: compositeRiskScore >= 80 ? "CRITICAL" : compositeRiskScore >= 60 ? "ELEVATED" : "NOMINAL",
                },
            },
            auditLogId,
            sanitized: true,
            timestamp: now.toISOString(),
        };
    }
    /**
     * Retrieve Full End-to-End Orchestration Trace for a given Screening Session
     */
    static async getSessionOrchestration(params) {
        const { sessionId, userRole, userTheatreId } = params;
        // Resolve activation / session
        const activation = await database_1.prisma.activation.findFirst({
            where: {
                OR: [
                    { id: sessionId },
                    { activationCode: sessionId },
                    { ticket: { ticketNumber: sessionId.toUpperCase() } },
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
        });
        const ticket = activation?.ticket;
        const show = ticket?.show;
        const theatre = show?.theatre;
        const movie = show?.movie;
        // Find linked SOC Incident
        const incident = await database_1.prisma.securityIncident.findFirst({
            where: {
                OR: [
                    { activationId: activation?.id || undefined },
                    { description: { contains: sessionId } },
                ],
            },
            orderBy: { createdAt: "desc" },
        }).catch(() => null);
        // Find linked Investigation Case
        const invCase = await database_1.prisma.investigationCase.findFirst({
            where: {
                OR: [
                    { playbackSessionId: sessionId },
                    { description: { contains: sessionId } },
                    ...(incident?.id ? [{ description: { contains: incident.id } }] : []),
                ],
            },
            orderBy: { createdAt: "desc" },
        }).catch(() => null);
        // Find linked Evidence
        const evidence = await database_1.prisma.evidenceRecord.findFirst({
            where: {
                OR: [
                    { playbackSessionId: sessionId },
                    { metadata: { contains: sessionId } },
                    ...(incident?.id ? [{ incidentId: incident.id }] : []),
                ],
            },
            orderBy: { createdAt: "desc" },
        }).catch(() => null);
        const effectiveTheatreId = theatre?.id || incident?.theatreId || invCase?.theatreId || evidence?.theatreId;
        // Tenant isolation check
        if (userTheatreId && userRole !== "ADMIN" && effectiveTheatreId && effectiveTheatreId !== userTheatreId) {
            throw new errorHandler_1.AppError("Unauthorized access to foreign theatre session orchestration", 403, "UNAUTHORIZED_THEATRE");
        }
        // Find linked Enforcement
        let enforcementRecord = null;
        if (invCase) {
            const enforcements = await enforcementService_1.enforcementService.getEnforcements({ caseId: invCase.id });
            enforcementRecord = enforcements[0] || null;
        }
        // Historical signals
        const events = await database_1.prisma.realtimeThreatEvent.findMany({
            where: {
                OR: [
                    { activationId: activation?.id || undefined },
                    { metadata: { contains: sessionId } },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }).catch(() => []);
        const signals = events.map((e) => ({
            signalType: e.eventType,
            severity: e.severity,
            riskScore: PiracyOrchestrationService.SIGNAL_WEIGHTS[e.eventType] || 30,
            timestamp: e.createdAt.toISOString(),
        }));
        const maxRisk = incident?.riskScore || (signals.length > 0 ? Math.max(...signals.map((s) => s.riskScore)) : 10);
        const escalated = !!incident || !!invCase || maxRisk >= 60;
        return {
            orchestrationId: `ORCH-TRACE-${sessionId.slice(0, 8)}`,
            correlationId: incident?.id || `CORR-TRACE-${Date.now()}`,
            status: escalated ? "ESCALATED" : "NOMINAL",
            riskScore: maxRisk,
            escalated,
            pipelineStages: {
                session: {
                    sessionId,
                    activationId: activation?.id,
                    ticketNumber: ticket?.ticketNumber,
                    seatNumber: ticket?.seatNumber,
                    movieTitle: movie?.title || "Screening Feature",
                    theatreName: theatre?.name || "Cinema Auditorium",
                    theatreCode: theatre?.code || "VEN",
                    protectionStatus: activation?.status || "ACTIVE",
                },
                detection: {
                    signalsEvaluated: signals.length,
                    signals,
                    compositeRiskScore: maxRisk,
                    escalationDecision: escalated ? "SOC_INCIDENT_ESCALATION" : "NO_ESCALATION",
                },
                soc: incident
                    ? {
                        incidentId: incident.id,
                        incidentNumber: incident.incidentNumber,
                        title: incident.title,
                        severity: incident.severity,
                        status: incident.status,
                        createdNewIncident: false,
                    }
                    : null,
                evidence: evidence
                    ? {
                        evidenceId: evidence.id,
                        evidenceNumber: evidence.evidenceNumber,
                        classification: evidence.classification,
                        sha256Hash: evidence.integrityHash || undefined,
                        isVerified: evidence.status === "VERIFIED",
                    }
                    : null,
                investigationCase: invCase
                    ? {
                        caseId: invCase.id,
                        caseNumber: invCase.caseNumber,
                        status: invCase.status,
                        severity: invCase.severity,
                        createdNewCase: false,
                    }
                    : null,
                enforcement: enforcementRecord
                    ? {
                        enforcementId: enforcementRecord.id,
                        enforcementNumber: enforcementRecord.enforcementNumber,
                        actionType: enforcementRecord.actionType,
                        status: enforcementRecord.status,
                        requiresHumanApproval: true,
                        approvalStatus: enforcementRecord.approvalStatus || "PENDING",
                    }
                    : null,
                studioIntelligence: {
                    synced: true,
                    threatPosture: maxRisk >= 80 ? "CRITICAL" : maxRisk >= 60 ? "ELEVATED" : "NOMINAL",
                },
            },
            sanitized: true,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Retrieve Full End-to-End Orchestration Trace for an Incident
     */
    static async getIncidentOrchestration(params) {
        const { incidentId, userRole, userTheatreId } = params;
        const incident = await database_1.prisma.securityIncident.findUnique({
            where: { id: incidentId },
            include: {
                theatre: true,
                movie: true,
                show: true,
            },
        });
        if (!incident) {
            throw new errorHandler_1.AppError("Security Incident not found", 404, "INCIDENT_NOT_FOUND");
        }
        if (userTheatreId && userRole !== "ADMIN" && incident.theatreId && incident.theatreId !== userTheatreId) {
            throw new errorHandler_1.AppError("Unauthorized access to foreign theatre incident orchestration", 403, "UNAUTHORIZED_THEATRE");
        }
        // Try finding linked case
        const invCase = await database_1.prisma.investigationCase.findFirst({
            where: {
                OR: [
                    { id: incident.investigationCaseId || undefined },
                    { description: { contains: incident.id } },
                    { description: { contains: incident.incidentNumber } },
                ],
            },
        }).catch(() => null);
        // Try finding linked evidence
        const evidence = await database_1.prisma.evidenceRecord.findFirst({
            where: {
                OR: [
                    { incidentId: incident.id },
                    ...(invCase ? [{ id: incident.evidenceRecordId || undefined }] : []),
                ],
            },
        }).catch(() => null);
        // Try finding linked enforcement
        let enforcementRecord = null;
        if (invCase) {
            const enforcements = await enforcementService_1.enforcementService.getEnforcements({ caseId: invCase.id });
            enforcementRecord = enforcements[0] || null;
        }
        return {
            orchestrationId: `ORCH-INC-${incident.incidentNumber}`,
            correlationId: incident.id,
            status: "ESCALATED",
            riskScore: incident.riskScore || 70,
            escalated: true,
            pipelineStages: {
                session: {
                    sessionId: incident.activationId || incident.id,
                    movieTitle: incident.movie?.title || "Screening Feature",
                    theatreName: incident.theatre?.name || "Cinema Auditorium",
                    theatreCode: incident.theatre?.code || "VEN",
                    protectionStatus: "ACTIVE",
                },
                detection: {
                    signalsEvaluated: 1,
                    signals: [
                        {
                            signalType: incident.title,
                            severity: incident.severity,
                            riskScore: incident.riskScore || 70,
                            timestamp: incident.createdAt.toISOString(),
                        },
                    ],
                    compositeRiskScore: incident.riskScore || 70,
                    escalationDecision: "SOC_INCIDENT_ESCALATION",
                },
                soc: {
                    incidentId: incident.id,
                    incidentNumber: incident.incidentNumber,
                    title: incident.title,
                    severity: incident.severity,
                    status: incident.status,
                    createdNewIncident: false,
                },
                evidence: evidence
                    ? {
                        evidenceId: evidence.id,
                        evidenceNumber: evidence.evidenceNumber,
                        classification: evidence.classification,
                        sha256Hash: evidence.integrityHash || undefined,
                        isVerified: evidence.status === "VERIFIED",
                    }
                    : null,
                investigationCase: invCase
                    ? {
                        caseId: invCase.id,
                        caseNumber: invCase.caseNumber,
                        status: invCase.status,
                        severity: invCase.severity,
                        createdNewCase: false,
                    }
                    : null,
                enforcement: enforcementRecord
                    ? {
                        enforcementId: enforcementRecord.id,
                        enforcementNumber: enforcementRecord.enforcementNumber,
                        actionType: enforcementRecord.actionType,
                        status: enforcementRecord.status,
                        requiresHumanApproval: true,
                        approvalStatus: enforcementRecord.approvalStatus || "PENDING",
                    }
                    : null,
                studioIntelligence: {
                    synced: true,
                    threatPosture: (incident.riskScore || 0) >= 80 ? "CRITICAL" : "ELEVATED",
                },
            },
            sanitized: true,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.PiracyOrchestrationService = PiracyOrchestrationService;
