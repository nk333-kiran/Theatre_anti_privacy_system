"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcementApprovalService = exports.EnforcementApprovalService = void 0;
const database_1 = require("@antipiracy/database");
const logger_1 = require("../logging/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
const enforcementEvidenceService_1 = require("./enforcementEvidenceService");
class EnforcementApprovalService {
    /**
     * Validates whether the actor has authorization to review/approve enforcement actions.
     */
    static validateApproverAuthorization(actor, theatreId, productionCompanyId) {
        if (actor.role === "ADMIN") {
            return; // Global system admins have unrestricted approval authority
        }
        if (actor.role === "THEATRE_ADMIN") {
            if (theatreId && actor.theatreId && actor.theatreId !== theatreId) {
                throw new errorHandler_1.AppError("Cross-theatre approval forbidden: You can only approve actions for your assigned venue", 403, "UNAUTHORIZED_THEATRE_APPROVAL");
            }
            return;
        }
        if (actor.role === "PRODUCTION_COMPANY") {
            if (productionCompanyId && actor.productionCompanyId && actor.productionCompanyId !== productionCompanyId) {
                throw new errorHandler_1.AppError("Studio tenant mismatch: You can only approve actions for your studio releases", 403, "UNAUTHORIZED_STUDIO_APPROVAL");
            }
            return;
        }
        // Regular THEATRE_STAFF cannot perform human approvals
        throw new errorHandler_1.AppError("Insufficient privileges: Human enforcement approval requires ADMIN, THEATRE_ADMIN, or Studio Officer role", 403, "APPROVAL_PERMISSION_DENIED");
    }
    /**
     * Evaluates enforcement package integrity before allowing approval.
     */
    static validatePackageBeforeApproval(pkg) {
        if (!pkg) {
            throw new errorHandler_1.AppError("Cannot approve enforcement action without an evidence package", 400, "MISSING_EVIDENCE_PACKAGE");
        }
        const verification = enforcementEvidenceService_1.EnforcementEvidenceService.verifyPackageIntegrity(pkg);
        if (!verification.isValid) {
            throw new errorHandler_1.AppError("Cryptographic integrity check failed for enforcement package. Potential evidence tampering detected.", 400, "EVIDENCE_TAMPERING_DETECTED");
        }
    }
    /**
     * Records immutable audit log entry for approval decision.
     */
    static async recordApprovalAudit(enforcementId, enforcementNumber, decision, approver, theatreId, correlationId, notes) {
        const corrId = correlationId || `CORR-APP-${Date.now()}`;
        try {
            await database_1.prisma.securityAuditLog.create({
                data: {
                    eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                    severity: database_1.SecuritySeverity.HIGH,
                    userId: approver.id,
                    actorEmail: approver.email,
                    actorRole: approver.role,
                    theatreId: theatreId || null,
                    actionSummary: `Enforcement Action ${enforcementNumber} ${decision} by ${approver.email} (${approver.role})`,
                    metadata: JSON.stringify({
                        enforcementId,
                        enforcementNumber,
                        decision,
                        notes: notes || null,
                        correlationId: corrId,
                        approvedAt: new Date().toISOString(),
                    }),
                    isThreat: false,
                },
            });
        }
        catch (err) {
            logger_1.logger.warn(`[EnforcementApprovalService] Failed to record audit log: ${err.message}`);
        }
    }
}
exports.EnforcementApprovalService = EnforcementApprovalService;
exports.enforcementApprovalService = EnforcementApprovalService;
