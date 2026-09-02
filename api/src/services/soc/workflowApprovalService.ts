import { prisma } from "@antipiracy/database";
import { PrivilegedActionService } from "../governance/privilegedActionService";
import { PrivilegedRiskLevel } from "@prisma/client";

export class WorkflowApprovalService {
  /**
   * Routes sensitive workflow actions to the Privileged Action two-person approval queue.
   */
  public static async queueForApproval(params: {
    actionType: string;
    targetResource: string;
    targetResourceId?: string;
    reason: string;
    riskLevel?: PrivilegedRiskLevel;
    systemActor?: string;
  }) {
    return PrivilegedActionService.requestAction({
      actionType: params.actionType,
      targetResource: params.targetResource,
      targetResourceId: params.targetResourceId,
      reason: `Automated Workflow Security Action: ${params.reason}`,
      riskLevel: params.riskLevel || PrivilegedRiskLevel.HIGH,
      requestedBy: params.systemActor || "SECURITY_WORKFLOW_ENGINE",
      requesterEmail: "system-automation@theatre-antipiracy.internal",
      requesterRole: "ADMIN",
    });
  }
}

export class WorkflowExecutionService {
  /**
   * Log an immutable workflow execution record.
   */
  public static async recordExecution(params: {
    workflowId: string;
    triggerEvent: string;
    decision: "EXECUTED" | "SKIPPED" | "REQUIRES_APPROVAL" | "FAILED";
    actionTaken: string;
    status?: "SUCCESS" | "FAILED" | "PENDING_APPROVAL";
    result?: Record<string, any>;
    actorId?: string;
    actorEmail?: string;
    correlationId: string;
  }) {
    return prisma.securityWorkflowExecution.create({
      data: {
        workflowId: params.workflowId,
        triggerEvent: params.triggerEvent,
        decision: params.decision,
        actionTaken: params.actionTaken,
        status: params.status || "SUCCESS",
        result: params.result ? JSON.stringify(params.result) : null,
        actorId: params.actorId || "SYSTEM",
        actorEmail: params.actorEmail,
        correlationId: params.correlationId,
      },
    });
  }

  /**
   * Query execution history.
   */
  public static async listExecutions(params?: { workflowId?: string; status?: string; take?: number }) {
    const where: any = {};
    if (params?.workflowId) where.workflowId = params.workflowId;
    if (params?.status) where.status = params.status;

    return prisma.securityWorkflowExecution.findMany({
      where,
      orderBy: { executedAt: "desc" },
      take: params?.take || 50,
      include: {
        workflow: {
          select: { name: true, triggerType: true, actionType: true },
        },
      },
    });
  }
}
