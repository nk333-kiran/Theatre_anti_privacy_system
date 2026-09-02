"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowExecutionService = exports.WorkflowApprovalService = void 0;
const database_1 = require("@antipiracy/database");
const privilegedActionService_1 = require("../governance/privilegedActionService");
const client_1 = require("@prisma/client");
class WorkflowApprovalService {
    /**
     * Routes sensitive workflow actions to the Privileged Action two-person approval queue.
     */
    static async queueForApproval(params) {
        return privilegedActionService_1.PrivilegedActionService.requestAction({
            actionType: params.actionType,
            targetResource: params.targetResource,
            targetResourceId: params.targetResourceId,
            reason: `Automated Workflow Security Action: ${params.reason}`,
            riskLevel: params.riskLevel || client_1.PrivilegedRiskLevel.HIGH,
            requestedBy: params.systemActor || "SECURITY_WORKFLOW_ENGINE",
            requesterEmail: "system-automation@theatre-antipiracy.internal",
            requesterRole: "ADMIN",
        });
    }
}
exports.WorkflowApprovalService = WorkflowApprovalService;
class WorkflowExecutionService {
    /**
     * Log an immutable workflow execution record.
     */
    static async recordExecution(params) {
        return database_1.prisma.securityWorkflowExecution.create({
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
    static async listExecutions(params) {
        const where = {};
        if (params?.workflowId)
            where.workflowId = params.workflowId;
        if (params?.status)
            where.status = params.status;
        return database_1.prisma.securityWorkflowExecution.findMany({
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
exports.WorkflowExecutionService = WorkflowExecutionService;
