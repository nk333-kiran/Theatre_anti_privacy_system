import { prisma } from "@antipiracy/database";

export interface CreateWorkflowParams {
  name: string;
  description?: string;
  triggerType: string;
  triggerCondition: Record<string, any>;
  actionType: string;
  actionPayload?: Record<string, any>;
  isEnabled?: boolean;
  priority?: number;
  tenantType?: string;
  tenantId?: string;
  createdBy?: string;
}

export class WorkflowRuleService {
  /**
   * Register a new automated security workflow rule.
   */
  public static async createWorkflow(params: CreateWorkflowParams) {
    return prisma.securityWorkflow.create({
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
  public static async getActiveRules(triggerType: string) {
    return prisma.securityWorkflow.findMany({
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
  public static async listWorkflows() {
    return prisma.securityWorkflow.findMany({
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
