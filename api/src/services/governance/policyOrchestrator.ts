import { prisma } from "@antipiracy/database";
import { PolicyType, GovernanceEventType, SecuritySeverity } from "@prisma/client";
import { GovernanceAuditService } from "./governanceAuditService";

export interface PolicyRule {
  id: string;
  name: string;
  effect: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | "STEP_UP";
  condition: {
    minTrustScore?: number;
    requiredRoles?: string[];
    allowedTenants?: string[];
    maxThreatRiskScore?: number;
    requireTrustedDevice?: boolean;
    requireBreakGlass?: boolean;
    ipAllowlist?: string[];
  };
}

export interface CreatePolicyParams {
  name: string;
  description?: string;
  policyType: PolicyType;
  priority?: number;
  rules: PolicyRule[];
  tenantType?: string;
  tenantId?: string;
  effectiveAt?: Date;
  expiresAt?: Date;
  createdBy?: string;
}

export class PolicyOrchestrator {
  /**
   * Create a new security policy with version 1 snapshot.
   */
  public static async createPolicy(params: CreatePolicyParams) {
    const rulesJson = JSON.stringify(params.rules);

    const policy = await prisma.securityPolicy.create({
      data: {
        name: params.name,
        description: params.description,
        policyType: params.policyType,
        priority: params.priority !== undefined ? params.priority : 100,
        rules: rulesJson,
        tenantType: params.tenantType || "GLOBAL",
        tenantId: params.tenantId,
        effectiveAt: params.effectiveAt || new Date(),
        expiresAt: params.expiresAt,
        createdBy: params.createdBy,
        version: 1,
      },
    });

    // Create initial PolicyVersion snapshot
    await prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        version: 1,
        ruleSnapshot: rulesJson,
        changeReason: "Initial policy creation",
        createdBy: params.createdBy,
      },
    });

    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.POLICY_CREATED,
      severity: SecuritySeverity.LOW,
      actorId: params.createdBy,
      targetType: "POLICY",
      targetId: policy.id,
      actionSummary: `Created Security Policy '${policy.name}' (v1)`,
    });

    return policy;
  }

  /**
   * Update policy rules, incrementing version and archiving previous snapshot.
   */
  public static async updatePolicy(params: {
    policyId: string;
    name?: string;
    description?: string;
    priority?: number;
    rules?: PolicyRule[];
    isEnabled?: boolean;
    changeReason: string;
    updatedBy?: string;
  }) {
    const existing = await prisma.securityPolicy.findUnique({
      where: { id: params.policyId },
    });

    if (!existing) {
      throw new Error("Security policy not found");
    }

    const nextVersion = existing.version + 1;
    const rulesJson = params.rules ? JSON.stringify(params.rules) : existing.rules;

    const updated = await prisma.securityPolicy.update({
      where: { id: params.policyId },
      data: {
        name: params.name || existing.name,
        description: params.description !== undefined ? params.description : existing.description,
        priority: params.priority !== undefined ? params.priority : existing.priority,
        rules: rulesJson,
        isEnabled: params.isEnabled !== undefined ? params.isEnabled : existing.isEnabled,
        version: nextVersion,
        updatedBy: params.updatedBy,
      },
    });

    // Create new PolicyVersion snapshot
    await prisma.policyVersion.create({
      data: {
        policyId: existing.id,
        version: nextVersion,
        ruleSnapshot: rulesJson,
        changeReason: params.changeReason,
        createdBy: params.updatedBy,
      },
    });

    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.POLICY_MODIFIED,
      severity: SecuritySeverity.MEDIUM,
      actorId: params.updatedBy,
      targetType: "POLICY",
      targetId: existing.id,
      actionSummary: `Updated Security Policy '${updated.name}' to v${nextVersion}: ${params.changeReason}`,
      changes: { previousVersion: existing.version, newVersion: nextVersion },
    });

    return updated;
  }

  /**
   * Rollback a policy to a previous historical version snapshot.
   */
  public static async rollbackPolicy(params: {
    policyId: string;
    targetVersion: number;
    reason: string;
    actorId?: string;
  }) {
    const snapshot = await prisma.policyVersion.findFirst({
      where: {
        policyId: params.policyId,
        version: params.targetVersion,
      },
    });

    if (!snapshot) {
      throw new Error(`Policy version v${params.targetVersion} not found for rollback`);
    }

    const existing = await prisma.securityPolicy.findUnique({
      where: { id: params.policyId },
    });

    if (!existing) {
      throw new Error("Security policy not found");
    }

    const nextVersion = existing.version + 1;

    const rolledBack = await prisma.securityPolicy.update({
      where: { id: params.policyId },
      data: {
        rules: snapshot.ruleSnapshot,
        version: nextVersion,
        updatedBy: params.actorId,
      },
    });

    // Create a new version representing the rollback
    await prisma.policyVersion.create({
      data: {
        policyId: existing.id,
        version: nextVersion,
        ruleSnapshot: snapshot.ruleSnapshot,
        changeReason: `Rolled back to v${params.targetVersion}: ${params.reason}`,
        createdBy: params.actorId,
      },
    });

    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.POLICY_ROLLBACK,
      severity: SecuritySeverity.HIGH,
      actorId: params.actorId,
      targetType: "POLICY",
      targetId: existing.id,
      actionSummary: `Rolled back policy '${rolledBack.name}' to state of v${params.targetVersion} (now v${nextVersion})`,
    });

    return rolledBack;
  }

  /**
   * Load active policies applicable for a given policy type and tenant scope, ordered by priority.
   */
  public static async getApplicablePolicies(params: {
    policyType: PolicyType;
    tenantType?: string;
    tenantId?: string;
  }) {
    const now = new Date();

    return prisma.securityPolicy.findMany({
      where: {
        policyType: params.policyType,
        isEnabled: true,
        effectiveAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [
          {
            OR: [
              { tenantType: "GLOBAL" },
              { tenantType: null },
              {
                tenantType: params.tenantType,
                tenantId: params.tenantId || undefined,
              },
            ],
          },
        ],
      },
      orderBy: { priority: "asc" }, // Priority ordering: 1 precedes 100
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 5,
        },
      },
    });
  }

  /**
   * List all policies.
   */
  public static async listPolicies(params?: {
    policyType?: PolicyType;
    isEnabled?: boolean;
  }) {
    const where: any = {};
    if (params?.policyType) where.policyType = params.policyType;
    if (params?.isEnabled !== undefined) where.isEnabled = params.isEnabled;

    return prisma.securityPolicy.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 5,
        },
      },
    });
  }
}
