"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRuleService = void 0;
const database_1 = require("@antipiracy/database");
class WorkflowRuleService {
    /**
     * Register a new automated security workflow rule.
     */
    static async createWorkflow(params) {
        return database_1.prisma.securityWorkflow.create({
            data: {
                name: params.name,
                description: params.description,
                triggerType: params.triggerType,
                triggerCondition: JSON.stringify(params.triggerCondition),
                actionType: params.actionType,
                actionPayload: params.actionPayload ? JSON.stringify(params.actionPayload) : null,
                isEnabled: params.isEnabled !== undefined ? params.isEnabled : true,
                priority: params.priority !== undefined ? params.priority : 100,
                tenantType: params.tenantType || "GLOBAL",
                tenantId: params.tenantId,
                createdBy: params.createdBy,
            },
        });
    }
    /**
     * Load active workflow rules for a given trigger type.
     */
    static async getActiveRules(triggerType) {
        return database_1.prisma.securityWorkflow.findMany({
            where: {
                triggerType,
                isEnabled: true,
            },
            orderBy: { priority: "asc" },
        });
    }
    /**
     * List all workflows.
     */
    static async listWorkflows() {
        return database_1.prisma.securityWorkflow.findMany({
            orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
            include: {
                executions: {
                    orderBy: { executedAt: "desc" },
                    take: 5,
                },
            },
        });
    }
}
exports.WorkflowRuleService = WorkflowRuleService;
