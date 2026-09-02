"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyOrchestrator = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const governanceAuditService_1 = require("./governanceAuditService");
class PolicyOrchestrator {
    /**
     * Create a new security policy with version 1 snapshot.
     */
    static async createPolicy(params) {
        const rulesJson = JSON.stringify(params.rules);
        const policy = await database_1.prisma.securityPolicy.create({
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
        await database_1.prisma.policyVersion.create({
            data: {
                policyId: policy.id,
                version: 1,
                ruleSnapshot: rulesJson,
                changeReason: "Initial policy creation",
                createdBy: params.createdBy,
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.POLICY_CREATED,
            severity: client_1.SecuritySeverity.LOW,
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
    static async updatePolicy(params) {
        const existing = await database_1.prisma.securityPolicy.findUnique({
            where: { id: params.policyId },
        });
        if (!existing) {
            throw new Error("Security policy not found");
        }
        const nextVersion = existing.version + 1;
        const rulesJson = params.rules ? JSON.stringify(params.rules) : existing.rules;
        const updated = await database_1.prisma.securityPolicy.update({
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
        await database_1.prisma.policyVersion.create({
            data: {
                policyId: existing.id,
                version: nextVersion,
                ruleSnapshot: rulesJson,
                changeReason: params.changeReason,
                createdBy: params.updatedBy,
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.POLICY_MODIFIED,
            severity: client_1.SecuritySeverity.MEDIUM,
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
    static async rollbackPolicy(params) {
        const snapshot = await database_1.prisma.policyVersion.findFirst({
            where: {
                policyId: params.policyId,
                version: params.targetVersion,
            },
        });
        if (!snapshot) {
            throw new Error(`Policy version v${params.targetVersion} not found for rollback`);
        }
        const existing = await database_1.prisma.securityPolicy.findUnique({
            where: { id: params.policyId },
        });
        if (!existing) {
            throw new Error("Security policy not found");
        }
        const nextVersion = existing.version + 1;
        const rolledBack = await database_1.prisma.securityPolicy.update({
            where: { id: params.policyId },
            data: {
                rules: snapshot.ruleSnapshot,
                version: nextVersion,
                updatedBy: params.actorId,
            },
        });
        // Create a new version representing the rollback
        await database_1.prisma.policyVersion.create({
            data: {
                policyId: existing.id,
                version: nextVersion,
                ruleSnapshot: snapshot.ruleSnapshot,
                changeReason: `Rolled back to v${params.targetVersion}: ${params.reason}`,
                createdBy: params.actorId,
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.POLICY_ROLLBACK,
            severity: client_1.SecuritySeverity.HIGH,
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
    static async getApplicablePolicies(params) {
        const now = new Date();
        return database_1.prisma.securityPolicy.findMany({
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
    static async listPolicies(params) {
        const where = {};
        if (params?.policyType)
            where.policyType = params.policyType;
        if (params?.isEnabled !== undefined)
            where.isEnabled = params.isEnabled;
        return database_1.prisma.securityPolicy.findMany({
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
exports.PolicyOrchestrator = PolicyOrchestrator;
