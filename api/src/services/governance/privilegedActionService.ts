import { prisma } from "@antipiracy/database";
import {
  PrivilegedActionStatus,
  PrivilegedRiskLevel,
  GovernanceEventType,
  SecuritySeverity,
} from "@prisma/client";
import crypto from "crypto";
import { GovernanceAuditService } from "./governanceAuditService";

export interface RequestPrivilegedActionParams {
  actionType: string;
  requestedBy: string;
  requesterEmail?: string;
  requesterRole?: string;
  targetResource: string;
  targetResourceId?: string;
  reason: string;
  riskLevel?: PrivilegedRiskLevel;
  durationMinutes?: number;
  correlationId?: string;
}

export class PrivilegedActionService {
  /**
   * Submit a new privileged action request requiring administrator approval.
   */
  public static async requestAction(params: RequestPrivilegedActionParams) {
    const duration = params.durationMinutes || 15;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);
    const correlationId = params.correlationId || `PRIV-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const record = await prisma.privilegedActionRequest.create({
      data: {
        actionType: params.actionType,
        requestedBy: params.requestedBy,
        requesterEmail: params.requesterEmail,
        requesterRole: params.requesterRole,
        targetResource: params.targetResource,
        targetResourceId: params.targetResourceId,
        reason: params.reason,
        riskLevel: params.riskLevel || PrivilegedRiskLevel.HIGH,
        approvalStatus: PrivilegedActionStatus.PENDING_APPROVAL,
        expiresAt,
        correlationId,
      },
    });

    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.PRIVILEGED_ACTION_REQUESTED,
      severity: SecuritySeverity.MEDIUM,
      actorId: params.requestedBy,
      actorEmail: params.requesterEmail,
      actorRole: params.requesterRole,
      targetType: "PRIVILEGED_ACTION",
      targetId: record.id,
      actionSummary: `Privileged action requested: ${params.actionType} on ${params.targetResource} (${params.reason})`,
      correlationId,
    });

    return record;
  }

  /**
   * Approve a privileged action request and generate a short-lived cryptographic execution token.
   */
  public static async approveAction(params: {
    requestId: string;
    approverId: string;
    approverEmail?: string;
    approverRole?: string;
    notes?: string;
  }) {
    const existing = await prisma.privilegedActionRequest.findUnique({
      where: { id: params.requestId },
    });

    if (!existing) {
      throw new Error("Privileged action request not found");
    }

    if (existing.approvalStatus !== PrivilegedActionStatus.PENDING_APPROVAL) {
      throw new Error(`Cannot approve request in ${existing.approvalStatus} status`);
    }

    if (existing.expiresAt < new Date()) {
      await prisma.privilegedActionRequest.update({
        where: { id: existing.id },
        data: { approvalStatus: PrivilegedActionStatus.EXPIRED },
      });
      throw new Error("Privileged action request has expired");
    }

    // Cryptographically random 64-character one-time execution token
    const executionToken = crypto.randomBytes(32).toString("hex");

    const updated = await prisma.privilegedActionRequest.update({
      where: { id: existing.id },
      data: {
        approvalStatus: PrivilegedActionStatus.APPROVED,
        approverId: params.approverId,
        approverEmail: params.approverEmail,
        approvalNotes: params.notes,
        approvedAt: new Date(),
        executionToken,
      },
    });

    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.PRIVILEGED_ACTION_APPROVED,
      severity: SecuritySeverity.HIGH,
      actorId: params.approverId,
      actorEmail: params.approverEmail,
      actorRole: params.approverRole,
      targetType: "PRIVILEGED_ACTION",
      targetId: existing.id,
      actionSummary: `Privileged action ${existing.actionType} APPROVED by ${params.approverEmail || params.approverId}`,
      correlationId: existing.correlationId,
    });

    return updated;
  }

  /**
   * Reject a privileged action request.
   */
  public static async rejectAction(params: {
    requestId: string;
    rejectorId: string;
    rejectorEmail?: string;
    rejectorRole?: string;
    reason: string;
  }) {
    const existing = await prisma.privilegedActionRequest.findUnique({
      where: { id: params.requestId },
    });

    if (!existing) {
      throw new Error("Privileged action request not found");
    }

    const updated = await prisma.privilegedActionRequest.update({
      where: { id: existing.id },
      data: {
        approvalStatus: PrivilegedActionStatus.REJECTED,
        approverId: params.rejectorId,
        approverEmail: params.rejectorEmail,
        approvalNotes: params.reason,
        approvedAt: new Date(),
      },
    });

    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.PRIVILEGED_ACTION_REJECTED,
      severity: SecuritySeverity.MEDIUM,
      actorId: params.rejectorId,
      actorEmail: params.rejectorEmail,
      actorRole: params.rejectorRole,
      targetType: "PRIVILEGED_ACTION",
      targetId: existing.id,
      actionSummary: `Privileged action ${existing.actionType} REJECTED: ${params.reason}`,
      correlationId: existing.correlationId,
    });

    return updated;
  }

  /**
   * Validate one-time execution token and mark action as EXECUTED.
   */
  public static async executeAction(params: {
    requestId: string;
    executionToken: string;
    executorId: string;
    executorEmail?: string;
    executionResult?: string;
  }) {
    const existing = await prisma.privilegedActionRequest.findUnique({
      where: { id: params.requestId },
    });

    if (!existing) {
      throw new Error("Privileged action request not found");
    }

    if (existing.approvalStatus !== PrivilegedActionStatus.APPROVED) {
      throw new Error(`Action is not approved (status: ${existing.approvalStatus})`);
    }

    if (existing.expiresAt < new Date()) {
      await prisma.privilegedActionRequest.update({
        where: { id: existing.id },
        data: { approvalStatus: PrivilegedActionStatus.EXPIRED },
      });
      throw new Error("Privileged execution window expired");
    }

    // Timing-safe cryptographic comparison
    const tokenBuffer = Buffer.from(params.executionToken.trim());
    const expectedBuffer = Buffer.from((existing.executionToken || "").trim());

    if (
      tokenBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
    ) {
      throw new Error("Invalid execution authorization token");
    }

    const updated = await prisma.privilegedActionRequest.update({
      where: { id: existing.id },
      data: {
        approvalStatus: PrivilegedActionStatus.EXECUTED,
        executedAt: new Date(),
        executionResult: params.executionResult || "SUCCESS",
        executionToken: null, // Zero-token: burn token immediately upon execution
      },
    });

    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.PRIVILEGED_ACTION_EXECUTED,
      severity: SecuritySeverity.CRITICAL,
      actorId: params.executorId,
      actorEmail: params.executorEmail,
      targetType: "PRIVILEGED_ACTION",
      targetId: existing.id,
      actionSummary: `Privileged action ${existing.actionType} EXECUTED with valid token`,
      correlationId: existing.correlationId,
    });

    return updated;
  }

  /**
   * List privileged action requests.
   */
  public static async listRequests(params?: {
    status?: PrivilegedActionStatus;
    actionType?: string;
  }) {
    const where: any = {};
    if (params?.status) where.approvalStatus = params.status;
    if (params?.actionType) where.actionType = params.actionType;

    return prisma.privilegedActionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
