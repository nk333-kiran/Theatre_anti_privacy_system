"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcementService = exports.EnforcementService = void 0;
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../logging/logger");
const enforcementEvidenceService_1 = require("./enforcementEvidenceService");
const enforcementApprovalService_1 = require("./enforcementApprovalService");
class EnforcementService {
    // Allowed state machine transitions for enforcement lifecycle
    static VALID_TRANSITIONS = {
        DRAFT: ["REVIEW", "CANCELLED"],
        REVIEW: ["APPROVED", "REJECTED", "CANCELLED", "DRAFT"],
        APPROVED: ["SUBMITTED", "CANCELLED"],
        SUBMITTED: ["COMPLETED", "REJECTED", "CANCELLED"],
        REJECTED: ["DRAFT", "REVIEW", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
    };
    // In-memory store for fast state tracking & resilience across API calls and tests
    static store = new Map();
    static sequenceCounter = 1000;
    /**
     * Resets internal memory state (useful for automated testing fixtures).
     */
    static resetStore() {
        EnforcementService.store.clear();
        EnforcementService.sequenceCounter = 1000;
    }
    /**
     * Generates a canonical ENF-YYYY-XXXX identifier.
     */
    static generateEnforcementNumber() {
        const year = new Date().getFullYear();
        EnforcementService.sequenceCounter += 1;
        const seq = EnforcementService.sequenceCounter.toString().padStart(4, "0");
        return `ENF-${year}-${seq}`;
    }
    /**
     * Creates a new Enforcement Action from an eligible Investigation Case.
     */
    async createEnforcement(params) {
        const correlationId = params.correlationId || `CORR-ENF-${Date.now()}`;
        const enforcementNumber = EnforcementService.generateEnforcementNumber();
        const enforcementId = `enf-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        logger_1.logger.info(`[EnforcementService] Creating enforcement action for Case ${params.caseId} [${correlationId}]`);
        // 1. Fetch and validate Investigation Case eligibility
        const targetCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: params.caseId },
            include: {
                theatre: true,
                movie: true,
                show: true,
            },
        });
        if (!targetCase) {
            throw new errorHandler_1.AppError(`Investigation case ${params.caseId} not found`, 404, "CASE_NOT_FOUND");
        }
        // Check Case Eligibility (Cannot create enforcement for CLOSED or ARCHIVED cases)
        if (targetCase.status === "CLOSED" || targetCase.status === "ARCHIVED") {
            throw new errorHandler_1.AppError(`Cannot create enforcement action for case in '${targetCase.status}' status. Only active cases are eligible for enforcement response.`, 400, "INELIGIBLE_CASE_STATUS");
        }
        // 2. Strict Tenant/Theatre isolation check
        if (params.actor.role === "THEATRE_STAFF" && targetCase.theatreId && params.actor.theatreId && targetCase.theatreId !== params.actor.theatreId) {
            throw new errorHandler_1.AppError("Cross-theatre enforcement forbidden: Cannot create enforcement for foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
        }
        if (params.actor.role === "PRODUCTION_COMPANY" && targetCase.productionCompanyId && params.actor.productionCompanyId && targetCase.productionCompanyId !== params.actor.productionCompanyId) {
            throw new errorHandler_1.AppError("Cross-studio enforcement forbidden: Cannot create enforcement for another studio's case", 403, "UNAUTHORIZED_STUDIO");
        }
        // 3. Duplicate Prevention: Check for existing active enforcement on this case
        const existingActive = Array.from(EnforcementService.store.values()).find((enf) => enf.caseId === targetCase.id &&
            enf.actionType === params.actionType &&
            ["DRAFT", "REVIEW", "APPROVED", "SUBMITTED"].includes(enf.status));
        if (existingActive) {
            throw new errorHandler_1.AppError(`An active enforcement action (${existingActive.enforcementNumber}) of type '${params.actionType}' already exists for Case ${targetCase.caseNumber}`, 400, "DUPLICATE_ENFORCEMENT");
        }
        // 4. Generate evidence-backed enforcement package
        const evidencePackage = await enforcementEvidenceService_1.EnforcementEvidenceService.generatePackage(targetCase.id, params.actor, correlationId);
        const now = new Date().toISOString();
        const initialTimeline = [
            {
                id: `tl-${Date.now()}-1`,
                timestamp: now,
                eventType: "ENFORCEMENT_CREATED",
                title: "Enforcement Action Initiated",
                description: `[${correlationId}] Enforcement ${enforcementNumber} created from Case ${targetCase.caseNumber} (${params.actionType}) by ${params.actor.email}`,
                actorId: params.actor.id,
                actorEmail: params.actor.email,
                actorRole: params.actor.role,
            },
            {
                id: `tl-${Date.now()}-2`,
                timestamp: now,
                eventType: "PACKAGE_GENERATED",
                title: "Evidence Package Compiled",
                description: `[${correlationId}] Package ${evidencePackage.packageId} linked with SHA-256 integrity hash ${evidencePackage.packageIntegrityHash.slice(0, 16)}... (${evidencePackage.evidenceRecords.length} evidence items)`,
                actorId: params.actor.id,
                actorEmail: params.actor.email,
                actorRole: params.actor.role,
            },
        ];
        const newEnforcement = {
            id: enforcementId,
            enforcementNumber,
            caseId: targetCase.id,
            caseNumber: targetCase.caseNumber,
            title: params.title,
            description: params.description,
            actionType: params.actionType,
            targetEntity: params.targetEntity || "Designated Piracy Intake Service",
            targetJurisdiction: params.targetJurisdiction || "Global Digital Rights",
            status: "DRAFT",
            severity: params.severity || targetCase.severity || "MEDIUM",
            theatreId: targetCase.theatreId,
            theatreName: targetCase.theatre?.name || null,
            theatreCode: targetCase.theatre?.code || null,
            movieId: targetCase.movieId,
            movieTitle: targetCase.movie?.title || null,
            showId: targetCase.showId,
            productionCompanyId: targetCase.productionCompanyId,
            package: evidencePackage,
            packageHash: evidencePackage.packageIntegrityHash,
            isPackageVerified: evidencePackage.isFullyVerified,
            approvalStatus: "NOT_REQUESTED",
            timeline: initialTimeline,
            correlationId,
            createdBy: params.actor.id,
            creatorEmail: params.actor.email,
            creatorRole: params.actor.role,
            createdAt: now,
            updatedAt: now,
        };
        EnforcementService.store.set(enforcementId, newEnforcement);
        // 5. Ingest into Investigation Timeline (Immutable case history)
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: targetCase.id,
                title: `Enforcement Action Initiated: ${params.actionType}`,
                description: `[${correlationId}] Enforcement ${enforcementNumber} created by ${params.actor.email} (${params.actor.role}). Package: ${evidencePackage.packageId}.`,
                eventType: "ENFORCEMENT_CREATED",
                actorId: params.actor.id,
            },
        }).catch(() => { });
        // 6. Security Audit Log
        try {
            await database_1.prisma.securityAuditLog.create({
                data: {
                    eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                    severity: params.severity === "CRITICAL" ? database_1.SecuritySeverity.CRITICAL : database_1.SecuritySeverity.HIGH,
                    userId: params.actor.id,
                    actorEmail: params.actor.email,
                    actorRole: params.actor.role,
                    theatreId: targetCase.theatreId || null,
                    actionSummary: `Enforcement Action ${enforcementNumber} created for Case ${targetCase.caseNumber}: ${params.title}`,
                    metadata: JSON.stringify({
                        enforcementId,
                        enforcementNumber,
                        caseId: targetCase.id,
                        caseNumber: targetCase.caseNumber,
                        actionType: params.actionType,
                        correlationId,
                        packageHash: evidencePackage.packageIntegrityHash,
                    }),
                    isThreat: false,
                },
            });
        }
        catch {
            // Non-fatal
        }
        logger_1.logger.info(`[EnforcementService] Successfully created Enforcement ${enforcementNumber} (${enforcementId})`);
        return newEnforcement;
    }
    /**
     * Retrieves enforcement actions with tenant and status filters.
     */
    async getEnforcements(scope, actor) {
        let items = Array.from(EnforcementService.store.values());
        // Tenant scoping
        if (actor?.role === "THEATRE_STAFF" && actor.theatreId) {
            items = items.filter((item) => !item.theatreId || item.theatreId === actor.theatreId);
        }
        else if (scope?.theatreId) {
            items = items.filter((item) => item.theatreId === scope.theatreId);
        }
        if (actor?.role === "PRODUCTION_COMPANY" && actor.productionCompanyId) {
            items = items.filter((item) => !item.productionCompanyId || item.productionCompanyId === actor.productionCompanyId);
        }
        else if (scope?.productionCompanyId) {
            items = items.filter((item) => item.productionCompanyId === scope.productionCompanyId);
        }
        if (scope?.caseId) {
            items = items.filter((item) => item.caseId === scope.caseId);
        }
        if (scope?.status && scope.status !== "ALL") {
            items = items.filter((item) => item.status === scope.status);
        }
        if (scope?.severity && scope.severity !== "ALL") {
            items = items.filter((item) => item.severity === scope.severity);
        }
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Retrieves single enforcement action by ID with tenant checks.
     */
    async getEnforcementById(id, actor) {
        const item = EnforcementService.store.get(id);
        if (!item) {
            throw new errorHandler_1.AppError(`Enforcement action ${id} not found`, 404, "ENFORCEMENT_NOT_FOUND");
        }
        if (actor?.role === "THEATRE_STAFF" && item.theatreId && actor.theatreId && item.theatreId !== actor.theatreId) {
            throw new errorHandler_1.AppError("Access denied to foreign theatre enforcement action", 403, "UNAUTHORIZED_THEATRE");
        }
        if (actor?.role === "PRODUCTION_COMPANY" && item.productionCompanyId && actor.productionCompanyId && item.productionCompanyId !== actor.productionCompanyId) {
            throw new errorHandler_1.AppError("Access denied to foreign studio enforcement action", 403, "UNAUTHORIZED_STUDIO");
        }
        return item;
    }
    /**
     * Submits an enforcement action for human review (`DRAFT` -> `REVIEW`).
     */
    async submitForReview(id, actor, notes, correlationId) {
        const corrId = correlationId || `CORR-REV-SUB-${Date.now()}`;
        const enforcement = await this.getEnforcementById(id, actor);
        this.validateLifecycleTransition(enforcement.status, "REVIEW", actor);
        enforcement.status = "REVIEW";
        enforcement.approvalStatus = "PENDING";
        enforcement.updatedAt = new Date().toISOString();
        enforcement.timeline.push({
            id: `tl-${Date.now()}`,
            timestamp: enforcement.updatedAt,
            eventType: "SUBMITTED_FOR_REVIEW",
            title: "Enforcement Submitted for Review",
            description: `[${corrId}] Submitted for compliance & legal review by ${actor.email}. ${notes || ""}`.trim(),
            actorId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
        });
        EnforcementService.store.set(id, enforcement);
        logger_1.logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} moved to REVIEW [${corrId}]`);
        return enforcement;
    }
    /**
     * Processes a human approval decision on an enforcement action (`REVIEW` -> `APPROVED` or `REJECTED`).
     */
    async processApproval(id, decision, approver, notes, rejectionReason, correlationId) {
        const corrId = correlationId || `CORR-APP-${Date.now()}`;
        const enforcement = await this.getEnforcementById(id, approver);
        // 1. Role & authorization check
        enforcementApprovalService_1.EnforcementApprovalService.validateApproverAuthorization(approver, enforcement.theatreId, enforcement.productionCompanyId);
        // 2. Package verification
        if (decision === "APPROVE") {
            enforcementApprovalService_1.EnforcementApprovalService.validatePackageBeforeApproval(enforcement.package);
            this.validateLifecycleTransition(enforcement.status, "APPROVED", approver);
            enforcement.status = "APPROVED";
            enforcement.approvalStatus = "APPROVED";
            enforcement.approvedBy = approver.email;
            enforcement.approverRole = approver.role;
            enforcement.approvedAt = new Date().toISOString();
        }
        else if (decision === "REJECT") {
            this.validateLifecycleTransition(enforcement.status, "REJECTED", approver);
            enforcement.status = "REJECTED";
            enforcement.approvalStatus = "REJECTED";
            enforcement.rejectionReason = rejectionReason || notes || "Action rejected during executive review";
        }
        else if (decision === "REQUEST_REVISIONS") {
            enforcement.status = "DRAFT";
            enforcement.approvalStatus = "NOT_REQUESTED";
            enforcement.rejectionReason = notes || "Revisions requested by reviewer";
        }
        enforcement.updatedAt = new Date().toISOString();
        enforcement.timeline.push({
            id: `tl-${Date.now()}`,
            timestamp: enforcement.updatedAt,
            eventType: decision === "APPROVE" ? "ACTION_APPROVED" : "ACTION_REJECTED",
            title: decision === "APPROVE" ? "Enforcement Approved by Approver" : `Enforcement ${decision}`,
            description: `[${corrId}] Decision: ${decision} by ${approver.email} (${approver.role}). ${notes || rejectionReason || ""}`.trim(),
            actorId: approver.id,
            actorEmail: approver.email,
            actorRole: approver.role,
        });
        EnforcementService.store.set(id, enforcement);
        // 3. Record Immutable Audit Event
        await enforcementApprovalService_1.EnforcementApprovalService.recordApprovalAudit(enforcement.id, enforcement.enforcementNumber, decision, approver, enforcement.theatreId, corrId, notes || rejectionReason);
        // 4. Update Investigation Case timeline
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: enforcement.caseId,
                title: `Enforcement Action ${decision}: ${enforcement.enforcementNumber}`,
                description: `[${corrId}] ${enforcement.actionType} was ${decision.toLowerCase()} by ${approver.email}`,
                eventType: decision === "APPROVE" ? "ENFORCEMENT_APPROVED" : "ENFORCEMENT_REJECTED",
                actorId: approver.id,
            },
        }).catch(() => { });
        logger_1.logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} processed approval decision: ${decision} [${corrId}]`);
        return enforcement;
    }
    /**
     * Submits approved enforcement action to external platforms/legal entities (`APPROVED` -> `SUBMITTED`).
     */
    async submitEnforcement(id, actor, submissionReference, notes, correlationId) {
        const corrId = correlationId || `CORR-SUB-${Date.now()}`;
        const enforcement = await this.getEnforcementById(id, actor);
        // Must be in APPROVED status
        this.validateLifecycleTransition(enforcement.status, "SUBMITTED", actor);
        if (enforcement.approvalStatus !== "APPROVED") {
            throw new errorHandler_1.AppError("Enforcement action cannot be submitted without prior executive human approval", 400, "APPROVAL_REQUIRED");
        }
        const subRef = submissionReference || `EXT-SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        enforcement.status = "SUBMITTED";
        enforcement.submittedAt = new Date().toISOString();
        enforcement.submittedBy = actor.email;
        enforcement.submissionReference = subRef;
        enforcement.updatedAt = enforcement.submittedAt;
        enforcement.timeline.push({
            id: `tl-${Date.now()}`,
            timestamp: enforcement.updatedAt,
            eventType: "ENFORCEMENT_SUBMITTED",
            title: "Enforcement Package Transmitted",
            description: `[${corrId}] Submitted to ${enforcement.targetEntity} (Ref: ${subRef}) by ${actor.email}. ${notes || ""}`.trim(),
            actorId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
        });
        EnforcementService.store.set(id, enforcement);
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: enforcement.caseId,
                title: `Enforcement Submitted: ${enforcement.enforcementNumber}`,
                description: `[${corrId}] Dispatched to ${enforcement.targetEntity} (Ref: ${subRef}) by ${actor.email}`,
                eventType: "ENFORCEMENT_SUBMITTED",
                actorId: actor.id,
            },
        }).catch(() => { });
        logger_1.logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} SUBMITTED with ref ${subRef} [${corrId}]`);
        return enforcement;
    }
    /**
     * Concludes enforcement action as successfully completed (`SUBMITTED` -> `COMPLETED`).
     */
    async completeEnforcement(id, actor, resolutionSummary, correlationId) {
        const corrId = correlationId || `CORR-CMP-${Date.now()}`;
        const enforcement = await this.getEnforcementById(id, actor);
        this.validateLifecycleTransition(enforcement.status, "COMPLETED", actor);
        enforcement.status = "COMPLETED";
        enforcement.completedAt = new Date().toISOString();
        enforcement.updatedAt = enforcement.completedAt;
        enforcement.timeline.push({
            id: `tl-${Date.now()}`,
            timestamp: enforcement.updatedAt,
            eventType: "ENFORCEMENT_COMPLETED",
            title: "Enforcement Successfully Concluded",
            description: `[${corrId}] Action completed: ${resolutionSummary} (by ${actor.email})`,
            actorId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
        });
        EnforcementService.store.set(id, enforcement);
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: enforcement.caseId,
                title: `Enforcement Completed: ${enforcement.enforcementNumber}`,
                description: `[${corrId}] Resolution: ${resolutionSummary} (by ${actor.email})`,
                eventType: "ENFORCEMENT_COMPLETED",
                actorId: actor.id,
            },
        }).catch(() => { });
        logger_1.logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} marked COMPLETED [${corrId}]`);
        return enforcement;
    }
    /**
     * Cancels an enforcement action from any non-terminal state.
     */
    async cancelEnforcement(id, actor, cancellationReason, correlationId) {
        const corrId = correlationId || `CORR-CNC-${Date.now()}`;
        const enforcement = await this.getEnforcementById(id, actor);
        this.validateLifecycleTransition(enforcement.status, "CANCELLED", actor);
        enforcement.status = "CANCELLED";
        enforcement.cancelledAt = new Date().toISOString();
        enforcement.cancellationReason = cancellationReason || "Cancelled by security analyst";
        enforcement.updatedAt = enforcement.cancelledAt;
        enforcement.timeline.push({
            id: `tl-${Date.now()}`,
            timestamp: enforcement.updatedAt,
            eventType: "ENFORCEMENT_CANCELLED",
            title: "Enforcement Action Cancelled",
            description: `[${corrId}] Reason: ${enforcement.cancellationReason} (by ${actor.email})`,
            actorId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
        });
        EnforcementService.store.set(id, enforcement);
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: enforcement.caseId,
                title: `Enforcement Cancelled: ${enforcement.enforcementNumber}`,
                description: `[${corrId}] ${cancellationReason} (by ${actor.email})`,
                eventType: "ENFORCEMENT_CANCELLED",
                actorId: actor.id,
            },
        }).catch(() => { });
        logger_1.logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} CANCELLED [${corrId}]`);
        return enforcement;
    }
    /**
     * Validates state machine transition rules.
     */
    validateLifecycleTransition(fromStatus, toStatus, actor) {
        const allowed = EnforcementService.VALID_TRANSITIONS[fromStatus] || [];
        if (!allowed.includes(toStatus)) {
            throw new errorHandler_1.AppError(`Invalid enforcement lifecycle transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: ${allowed.join(", ") || "None (Terminal State)"}`, 400, "INVALID_STATUS_TRANSITION");
        }
    }
}
exports.EnforcementService = EnforcementService;
exports.enforcementService = new EnforcementService();
