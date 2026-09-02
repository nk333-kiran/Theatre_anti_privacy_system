import { prisma, SecurityEventType, SecuritySeverity } from "@antipiracy/database";
import { logger } from "../logging/logger";
import { AppError } from "../../middleware/errorHandler";
import { EnforcementPackageData, EnforcementEvidenceService } from "./enforcementEvidenceService";

export type ApprovalDecision = "APPROVE" | "REJECT" | "REQUEST_REVISIONS";

export interface ApprovalActor {
  id: string;
  email: string;
  role: string;
  theatreId?: string | null;
  productionCompanyId?: string | null;
}

export interface ProcessApprovalParams {
  enforcementId: string;
  decision: ApprovalDecision;
  approver: ApprovalActor;
  notes?: string;
  rejectionReason?: string;
  correlationId?: string;
}

export interface ApprovalRecord {
  id: string;
  enforcementId: string;
  decision: ApprovalDecision;
  approverId: string;
  approverEmail: string;
  approverRole: string;
  notes?: string;
  timestamp: string;
  correlationId: string;
}

export class EnforcementApprovalService {
  /**
   * Validates whether the actor has authorization to review/approve enforcement actions.
   */
  public static validateApproverAuthorization(
    actor: ApprovalActor,
    theatreId?: string | null,
    productionCompanyId?: string | null
  ): void {
    if (actor.role === "ADMIN") {
      return; // Global system admins have unrestricted approval authority
    }

    if (actor.role === "THEATRE_ADMIN") {
      if (theatreId && actor.theatreId && actor.theatreId !== theatreId) {
        throw new AppError("Cross-theatre approval forbidden: You can only approve actions for your assigned venue", 403, "UNAUTHORIZED_THEATRE_APPROVAL");
      }
      return;
    }

    if (actor.role === "PRODUCTION_COMPANY") {
      if (productionCompanyId && actor.productionCompanyId && actor.productionCompanyId !== productionCompanyId) {
        throw new AppError("Studio tenant mismatch: You can only approve actions for your studio releases", 403, "UNAUTHORIZED_STUDIO_APPROVAL");
      }
      return;
    }

    // Regular THEATRE_STAFF cannot perform human approvals
    throw new AppError(
      "Insufficient privileges: Human enforcement approval requires ADMIN, THEATRE_ADMIN, or Studio Officer role",
      403,
      "APPROVAL_PERMISSION_DENIED"
    );
  }

  /**
   * Evaluates enforcement package integrity before allowing approval.
   */
  public static validatePackageBeforeApproval(pkg?: EnforcementPackageData): void {
    if (!pkg) {
      throw new AppError("Cannot approve enforcement action without an evidence package", 400, "MISSING_EVIDENCE_PACKAGE");
    }

    const verification = EnforcementEvidenceService.verifyPackageIntegrity(pkg);
    if (!verification.isValid) {
      throw new AppError(
        "Cryptographic integrity check failed for enforcement package. Potential evidence tampering detected.",
        400,
        "EVIDENCE_TAMPERING_DETECTED"
      );
    }
  }

  /**
   * Records immutable audit log entry for approval decision.
   */
  public static async recordApprovalAudit(
    enforcementId: string,
    enforcementNumber: string,
    decision: ApprovalDecision,
    approver: ApprovalActor,
    theatreId?: string | null,
    correlationId?: string,
    notes?: string
  ): Promise<void> {
    const corrId = correlationId || `CORR-APP-${Date.now()}`;

    try {
      await prisma.securityAuditLog.create({
        data: {
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.HIGH,
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
    } catch (err: any) {
      logger.warn(`[EnforcementApprovalService] Failed to record audit log: ${err.message}`);
    }
  }
}

export const enforcementApprovalService = EnforcementApprovalService;
