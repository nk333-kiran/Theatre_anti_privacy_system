"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.investigationService = exports.InvestigationService = void 0;
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../../middleware/errorHandler");
const evidenceHashService_1 = require("./evidenceHashService");
const logger_1 = require("../logging/logger");
class InvestigationService {
    /**
     * Allowed state machine transitions for investigation case lifecycle
     */
    static VALID_TRANSITIONS = {
        OPEN: ["TRIAGED", "INVESTIGATING", "CLOSED"],
        TRIAGED: ["INVESTIGATING", "CONTAINED", "ESCALATED", "RESOLVED", "CLOSED"],
        INVESTIGATING: ["CONTAINED", "ESCALATED", "RESOLVED", "CLOSED"],
        CONTAINED: ["RESOLVED", "INVESTIGATING", "CLOSED"],
        ESCALATED: ["INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"],
        RESOLVED: ["CLOSED", "INVESTIGATING"],
        CLOSED: ["ARCHIVED"],
        ARCHIVED: [],
    };
    /**
     * Generates a canonical CASE-YYYY-XXXX identifier.
     */
    static async generateCaseNumber() {
        const year = new Date().getFullYear();
        const count = await database_1.prisma.investigationCase.count();
        const seq = (count + 1).toString().padStart(4, "0");
        return `CASE-${year}-${seq}`;
    }
    /**
     * Creates a new Investigation Case
     */
    async createCase(params) {
        const correlationId = params.correlationId || `CORR-CASE-${Date.now()}`;
        const caseNumber = await InvestigationService.generateCaseNumber();
        // Verify creator authorization & theatre scoping
        if (params.creator.role === "THEATRE_STAFF" && params.theatreId && params.creator.theatreId && params.creator.theatreId !== params.theatreId) {
            throw new errorHandler_1.AppError("Cannot create investigation case for foreign theatre venue", 403, "UNAUTHORIZED_THEATRE");
        }
        let validPlaybackSessionId = undefined;
        if (params.playbackSessionId) {
            const existingSession = await database_1.prisma.playbackSession.findUnique({
                where: { id: params.playbackSessionId },
            }).catch(() => null);
            if (existingSession) {
                validPlaybackSessionId = existingSession.id;
            }
        }
        const newCase = await database_1.prisma.investigationCase.create({
            data: {
                caseNumber,
                title: params.title,
                description: params.description,
                severity: params.severity || "MEDIUM",
                threatClassification: params.threatClassification || "UNCLASSIFIED_THREAT",
                theatreId: params.theatreId,
                showId: params.showId,
                movieId: params.movieId,
                productionCompanyId: params.productionCompanyId,
                playbackSessionId: validPlaybackSessionId,
                assignedAnalystId: params.assignedAnalystId,
                status: "OPEN",
            },
            include: {
                theatre: true,
                movie: true,
                show: true,
            },
        });
        // 1. Add Initial Timeline Event (Immutable)
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: newCase.id,
                title: "Investigation Case Opened",
                description: `[${correlationId}] Case opened by ${params.creator.email} (${params.creator.role})`,
                eventType: "CASE_CREATED",
                actorId: params.creator.id,
            },
        });
        // 2. Record Status History
        await database_1.prisma.investigationStatusHistory.create({
            data: {
                caseId: newCase.id,
                fromStatus: "OPEN",
                toStatus: "OPEN",
                changedBy: params.creator.email,
                reason: `Initial case creation [${correlationId}]`,
            },
        });
        // 3. Link Security Incident if specified
        const targetIncidentId = params.incidentId || params.securityIncidentId;
        if (targetIncidentId) {
            try {
                const incident = await database_1.prisma.securityIncident.findUnique({
                    where: { id: targetIncidentId },
                });
                if (incident) {
                    await database_1.prisma.investigationTimelineEvent.create({
                        data: {
                            caseId: newCase.id,
                            title: "Security Incident Correlated",
                            description: `[${correlationId}] Linked to SOC Security Incident ${incident.incidentNumber} (${incident.title})`,
                            eventType: "INCIDENT_LINKED",
                            actorId: params.creator.id,
                        },
                    });
                }
            }
            catch {
                // Non-fatal
            }
        }
        // 4. Record Initial Assignment if assigned
        if (params.assignedAnalystId) {
            await database_1.prisma.investigationAssignment.create({
                data: {
                    caseId: newCase.id,
                    analystId: params.assignedAnalystId,
                    assignedBy: params.creator.email,
                    notes: `Initial assignment upon case creation [${correlationId}]`,
                },
            });
        }
        // 5. Ingest into SecurityAuditLog
        try {
            await database_1.prisma.securityAuditLog.create({
                data: {
                    eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                    severity: params.severity === "CRITICAL" ? "CRITICAL" : params.severity === "HIGH" ? "HIGH" : "MEDIUM",
                    userId: params.creator.id,
                    actorEmail: params.creator.email,
                    actorRole: params.creator.role,
                    theatreId: params.theatreId || null,
                    showId: params.showId || null,
                    actionSummary: `Investigation case ${caseNumber} opened: ${params.title}`,
                    metadata: JSON.stringify({
                        caseId: newCase.id,
                        caseNumber,
                        correlationId,
                        severity: newCase.severity,
                    }),
                    isThreat: false,
                },
            });
        }
        catch {
            // Non-fatal
        }
        logger_1.logger.info(`[InvestigationService] Created Case ${caseNumber} (${newCase.id}) [${correlationId}]`);
        return newCase;
    }
    /**
     * Updates case status with lifecycle validation, auditing, and immutable timeline tracking
     */
    async updateCaseStatus(caseId, toStatus, actor, reason, correlationId) {
        const corrId = correlationId || `CORR-STS-${Date.now()}`;
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Investigation case ${caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        // Tenant / theatre check
        if (actor.role === "THEATRE_STAFF" && targetCase.theatreId && actor.theatreId && targetCase.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        const fromStatus = targetCase.status;
        // Validate lifecycle transition state machine
        const allowedTransitions = InvestigationService.VALID_TRANSITIONS[fromStatus] || [];
        if (fromStatus !== toStatus && !allowedTransitions.includes(toStatus) && actor.role !== "ADMIN") {
            throw new errorHandler_1.AppError(`Invalid status transition from ${fromStatus} to ${toStatus}. Allowed transitions: ${allowedTransitions.join(", ")}`, 400, "INVALID_STATUS_TRANSITION");
        }
        const isClosing = toStatus === "RESOLVED" || toStatus === "CLOSED" || toStatus === "ARCHIVED";
        const updated = await database_1.prisma.investigationCase.update({
            where: { id: caseId },
            data: {
                status: toStatus,
                closedAt: isClosing ? new Date() : targetCase.closedAt,
                closureReason: isClosing ? reason || `Transitioned to ${toStatus}` : targetCase.closureReason,
            },
            include: {
                theatre: true,
                movie: true,
                assignedAnalyst: { select: { id: true, name: true, email: true, role: true } },
            },
        });
        // Record Status History
        await database_1.prisma.investigationStatusHistory.create({
            data: {
                caseId,
                fromStatus,
                toStatus,
                changedBy: actor.email,
                reason: reason || `Status transitioned from ${fromStatus} to ${toStatus} [${corrId}]`,
            },
        });
        // Immutable Timeline event
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId,
                title: `Status Changed: ${toStatus}`,
                description: `[${corrId}] Transitioned from ${fromStatus} to ${toStatus} by ${actor.email}. ${reason || ""}`.trim(),
                eventType: "STATUS_CHANGE",
                actorId: actor.id,
            },
        });
        return updated;
    }
    /**
     * Assigns an analyst to the case
     */
    async assignAnalyst(caseId, analystId, assignedBy, notes, correlationId) {
        const corrId = correlationId || `CORR-ASN-${Date.now()}`;
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Case ${caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        // Tenant check
        if (assignedBy.role === "THEATRE_STAFF" && targetCase.theatreId && assignedBy.theatreId && targetCase.theatreId !== assignedBy.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        const analyst = await database_1.prisma.user.findUnique({
            where: { id: analystId },
        });
        if (!analyst) {
            throw new errorHandler_1.AppError(`Analyst user ${analystId} not found`, 404, "ANALYST_NOT_FOUND");
        }
        const updated = await database_1.prisma.investigationCase.update({
            where: { id: caseId },
            data: {
                assignedAnalystId: analystId,
                status: targetCase.status === "OPEN" ? "TRIAGED" : targetCase.status,
            },
            include: {
                assignedAnalyst: { select: { id: true, name: true, email: true, role: true } },
            },
        });
        await database_1.prisma.investigationAssignment.create({
            data: {
                caseId,
                analystId,
                assignedBy: assignedBy.email,
                notes: notes || `Assigned to ${analyst.name} (${analyst.email}) [${corrId}]`,
            },
        });
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId,
                title: "Analyst Assigned",
                description: `[${corrId}] Assigned to ${analyst.name} (${analyst.email}) by ${assignedBy.email}`,
                eventType: "ANALYST_ASSIGNED",
                actorId: assignedBy.id,
            },
        });
        return updated;
    }
    /**
     * Adds an analyst investigation note
     */
    async addNote(caseId, content, author, isInternal = true, correlationId) {
        const corrId = correlationId || `CORR-NOTE-${Date.now()}`;
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Case ${caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        if (author.role === "THEATRE_STAFF" && targetCase.theatreId && author.theatreId && targetCase.theatreId !== author.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        const note = await database_1.prisma.investigationNote.create({
            data: {
                caseId,
                authorId: author.id,
                content,
                isInternal,
            },
            include: {
                author: { select: { id: true, name: true, email: true, role: true } },
            },
        });
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId,
                title: "Analyst Note Added",
                description: `[${corrId}] Note added by ${author.email}`,
                eventType: "NOTE_ADDED",
                actorId: author.id,
            },
        });
        return note;
    }
    /**
     * Links an existing EvidenceRecord to an investigation case with SHA-256 integrity verification
     */
    async linkEvidence(caseIdOrParams, evidenceRecordIdOrActor, actorOrRelevance, relevanceOrCorr, correlationId) {
        let caseId;
        let evidenceRecordId;
        let evidenceNumber;
        let watermarkId;
        let relevance;
        let actor;
        let corrId;
        if (typeof caseIdOrParams === "object") {
            caseId = caseIdOrParams.caseId;
            evidenceRecordId = caseIdOrParams.evidenceRecordId;
            evidenceNumber = caseIdOrParams.evidenceNumber;
            watermarkId = caseIdOrParams.watermarkId;
            relevance = caseIdOrParams.relevance;
            actor = caseIdOrParams.actor;
            corrId = caseIdOrParams.correlationId || `CORR-EVD-LINK-${Date.now()}`;
        }
        else {
            caseId = caseIdOrParams;
            evidenceRecordId = evidenceRecordIdOrActor;
            actor = actorOrRelevance;
            relevance = relevanceOrCorr;
            corrId = correlationId || `CORR-EVD-LINK-${Date.now()}`;
        }
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Case ${caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        // Cross-theatre authorization check
        if (actor.role === "THEATRE_STAFF" && targetCase.theatreId && actor.theatreId && targetCase.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        // Find the target evidence record by ID, number, or watermark
        let evidence = null;
        if (evidenceRecordId) {
            evidence = await database_1.prisma.evidenceRecord.findUnique({ where: { id: evidenceRecordId } });
        }
        else if (evidenceNumber) {
            evidence = await database_1.prisma.evidenceRecord.findUnique({ where: { evidenceNumber } });
        }
        else if (watermarkId) {
            evidence = await database_1.prisma.evidenceRecord.findFirst({
                where: { metadata: { contains: watermarkId } },
            });
        }
        if (!evidence) {
            throw new errorHandler_1.AppError("Target evidence record not found in Evidence Vault", 404, "EVIDENCE_NOT_FOUND");
        }
        // Cross-theatre evidence check
        if (actor.role === "THEATRE_STAFF" && evidence.theatreId && actor.theatreId && evidence.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Cannot link evidence belonging to a foreign theatre", 403, "UNAUTHORIZED_THEATRE");
        }
        // Check for duplicate link
        const existingLink = await database_1.prisma.investigationEvidenceLink.findUnique({
            where: {
                caseId_evidenceRecordId: {
                    caseId,
                    evidenceRecordId: evidence.id,
                },
            },
        });
        if (existingLink) {
            throw new errorHandler_1.AppError("Evidence record is already linked to this investigation case", 400, "ALREADY_LINKED");
        }
        // Verify SHA-256 Integrity of the evidence record
        let isHashValid = true;
        if (evidence.integrityHash && evidence.metadata) {
            const recalculated = evidenceHashService_1.evidenceHashService.computeSha256(evidence.metadata);
            isHashValid = evidenceHashService_1.evidenceHashService.verifyHash(evidence.integrityHash, recalculated);
        }
        const link = await database_1.prisma.investigationEvidenceLink.create({
            data: {
                caseId,
                evidenceRecordId: evidence.id,
                linkedBy: actor.email,
                relevance: relevance || (isHashValid ? "Cryptographically verified forensic evidence" : "WARNING: Flagged for integrity review"),
            },
            include: {
                evidenceRecord: true,
            },
        });
        // Immutable Timeline event
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId,
                title: "Evidence Attached",
                description: `[${corrId}] Evidence ${evidence.evidenceNumber} (${evidence.classification}) attached by ${actor.email}. Integrity: ${isHashValid ? "SHA-256 VERIFIED" : "TAMPER_SUSPECTED"}`,
                eventType: "EVIDENCE_ATTACHED",
                actorId: actor.id,
            },
        });
        return {
            ...link,
            isHashValid,
        };
    }
    /**
     * Request or execute controlled containment actions (with approval safety check)
     */
    async requestContainment(caseId, actionType, actor, reason, correlationId) {
        const corrId = correlationId || `CORR-CONT-${Date.now()}`;
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Case ${caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        if (actor.role === "THEATRE_STAFF" && targetCase.theatreId && actor.theatreId && targetCase.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        // Record automated response / approval record
        const responseRecord = await database_1.prisma.automatedResponse.create({
            data: {
                actionType,
                status: actor.role === "ADMIN" ? "EXECUTED" : "RECOMMENDED",
                targetId: targetCase.playbackSessionId || targetCase.id,
                reason: reason || `Containment action requested for Case ${targetCase.caseNumber}`,
                executedBy: actor.email,
                correlationId: corrId,
                metadata: JSON.stringify({
                    caseId,
                    caseNumber: targetCase.caseNumber,
                    severity: targetCase.severity,
                }),
            },
        });
        // Update case status to CONTAINED if approved or executed
        if (actor.role === "ADMIN") {
            await database_1.prisma.investigationCase.update({
                where: { id: caseId },
                data: { status: "CONTAINED" },
            });
        }
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId,
                title: actor.role === "ADMIN" ? "Containment Executed" : "Containment Requested (Pending Approval)",
                description: `[${corrId}] Action: ${actionType}. Reason: ${reason} (by ${actor.email})`,
                eventType: "CONTAINMENT_TRIGGERED",
                actorId: actor.id,
            },
        });
        return responseRecord;
    }
    /**
     * Resolves an investigation case
     */
    async resolveCase(caseId, resolution, actor, correlationId) {
        const corrId = correlationId || `CORR-RES-${Date.now()}`;
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Case ${caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        if (actor.role === "THEATRE_STAFF" && targetCase.theatreId && actor.theatreId && targetCase.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        const updated = await database_1.prisma.investigationCase.update({
            where: { id: caseId },
            data: {
                status: "RESOLVED",
                resolution,
            },
            include: {
                theatre: true,
                movie: true,
                assignedAnalyst: { select: { id: true, name: true, email: true, role: true } },
            },
        });
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId,
                title: "Case Resolved",
                description: `[${corrId}] Resolution: ${resolution} (by ${actor.email})`,
                eventType: "CASE_RESOLVED",
                actorId: actor.id,
            },
        });
        return updated;
    }
    /**
     * Closes an investigation case
     */
    async closeCase(caseId, closureReason, actor, correlationId) {
        const corrId = correlationId || `CORR-CLS-${Date.now()}`;
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Case ${caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        if (actor.role === "THEATRE_STAFF" && targetCase.theatreId && actor.theatreId && targetCase.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        const updated = await database_1.prisma.investigationCase.update({
            where: { id: caseId },
            data: {
                status: "CLOSED",
                closureReason,
                closedAt: new Date(),
            },
            include: {
                theatre: true,
                movie: true,
            },
        });
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId,
                title: "Case Closed",
                description: `[${corrId}] Closure reason: ${closureReason} (by ${actor.email})`,
                eventType: "CASE_CLOSED",
                actorId: actor.id,
            },
        });
        return updated;
    }
    /**
     * Retrieves investigation cases with multi-tenant scoping
     */
    async getCases(scope) {
        const whereClause = {};
        if (scope?.productionCompanyId)
            whereClause.productionCompanyId = scope.productionCompanyId;
        if (scope?.theatreId)
            whereClause.theatreId = scope.theatreId;
        if (scope?.status && scope.status !== "ALL")
            whereClause.status = scope.status;
        if (scope?.severity && scope.severity !== "ALL")
            whereClause.severity = scope.severity;
        return database_1.prisma.investigationCase.findMany({
            where: whereClause,
            include: {
                theatre: { select: { id: true, name: true, code: true } },
                movie: { select: { id: true, title: true } },
                assignedAnalyst: { select: { id: true, name: true, email: true } },
                _count: {
                    select: {
                        evidenceLinks: true,
                        notes: true,
                        timelineEvents: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    /**
     * Retrieves detailed case by ID with full relations & zero-secret sanitization
     */
    async getCaseById(caseId, actor) {
        const item = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseId },
            include: {
                theatre: true,
                movie: true,
                show: true,
                productionCompany: true,
                assignedAnalyst: { select: { id: true, name: true, email: true, role: true } },
                assignments: {
                    include: { analyst: { select: { id: true, name: true, email: true } } },
                    orderBy: { assignedAt: "desc" },
                },
                notes: {
                    include: { author: { select: { id: true, name: true, email: true, role: true } } },
                    orderBy: { createdAt: "asc" },
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
                statusHistory: {
                    orderBy: { changedAt: "asc" },
                },
            },
        });
        if (!item) {
            throw new errorHandler_1.AppError("Investigation case not found", 404, "CASE_NOT_FOUND");
        }
        if (actor && actor.role === "THEATRE_STAFF" && item.theatreId && actor.theatreId && item.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        return item;
    }
}
exports.InvestigationService = InvestigationService;
exports.investigationService = new InvestigationService();
