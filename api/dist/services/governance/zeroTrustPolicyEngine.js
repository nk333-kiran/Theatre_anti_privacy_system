"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroTrustPolicyEngine = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const trustScoringEngine_1 = require("./trustScoringEngine");
const deviceTrustService_1 = require("./deviceTrustService");
const breakGlassService_1 = require("./breakGlassService");
const policyOrchestrator_1 = require("./policyOrchestrator");
class ZeroTrustPolicyEngine {
    /**
     * Evaluate a full Zero-Trust access request deterministically.
     */
    static async evaluateAccess(req) {
        const correlationId = req.correlationId || `DEC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const reasonCodes = [];
        // 1. Identity & Role Verification
        const isAuthenticated = !!req.actorId && !!req.actorRole;
        if (!isAuthenticated) {
            reasonCodes.push("ANONYMOUS_ACCESS_BLOCKED");
        }
        // 2. Tenant Isolation & Scope Verification
        let hasValidTenantScope = true;
        if (req.actorRole !== "ADMIN") {
            if (req.targetTenantId && req.actorTenantId && req.targetTenantId !== req.actorTenantId) {
                hasValidTenantScope = false;
                reasonCodes.push("CROSS_TENANT_ACCESS_DENIED");
            }
        }
        // 3. Device Trust Evaluation
        let deviceStatus = client_1.DeviceTrustStatus.UNKNOWN;
        let deviceHash = undefined;
        if (req.rawDeviceFingerprint) {
            const deviceAssessed = await deviceTrustService_1.DeviceTrustService.getOrCreateDevice(req.rawDeviceFingerprint, req.ipAddress);
            deviceStatus = deviceAssessed.trustStatus;
            deviceHash = deviceAssessed.fingerprintHash;
        }
        // 4. Break-Glass Emergency Access Check
        const isBreakGlassActive = req.actorId ? await breakGlassService_1.BreakGlassService.hasActiveSession(req.actorId) : false;
        if (isBreakGlassActive) {
            reasonCodes.push("BREAK_GLASS_SESSION_ACTIVE");
        }
        // 5. Calculate Deterministic Trust Score
        const trustResult = trustScoringEngine_1.TrustScoringEngine.calculateTrustScore({
            isAuthenticated,
            actorRole: req.actorRole,
            hasValidTenantScope,
            sessionAgeMinutes: req.sessionAgeMinutes,
            deviceTrustStatus: deviceStatus,
            recentSecurityThreatCount: req.recentThreatsCount,
            threatIntelMatchCount: req.threatIntelMatchesCount,
            threatPosture: req.threatPosture,
            isPrivilegedResource: req.isPrivilegedAction,
            isBreakGlassActive,
        });
        reasonCodes.push(...trustResult.reasonCodes);
        const trustScore = trustResult.score;
        const riskScore = 100 - trustScore;
        // 6. Map Resource to Policy Type
        let policyType = client_1.PolicyType.ACCESS_CONTROL;
        if (req.resourceType === "PLAYBACK")
            policyType = client_1.PolicyType.PLAYBACK_AUTHORIZATION;
        else if (req.resourceType === "DRM")
            policyType = client_1.PolicyType.DRM_LICENSE;
        else if (req.resourceType === "EVIDENCE")
            policyType = client_1.PolicyType.EVIDENCE_ACCESS;
        else if (req.resourceType === "CASE")
            policyType = client_1.PolicyType.INVESTIGATION_CASE;
        else if (req.resourceType === "INTEL")
            policyType = client_1.PolicyType.THREAT_INTEL;
        else if (req.resourceType === "POLICY" || req.resourceType === "SYSTEM")
            policyType = client_1.PolicyType.ADMIN_OPERATIONS;
        // 7. Load Applicable Security Policies in Priority Order
        const applicablePolicies = await policyOrchestrator_1.PolicyOrchestrator.getApplicablePolicies({
            policyType,
            tenantType: req.actorTenantType,
            tenantId: req.actorTenantId,
        });
        const evaluatedPolicies = [];
        const matchedRules = [];
        let explicitDecision = null;
        for (const pol of applicablePolicies) {
            evaluatedPolicies.push({ id: pol.id, name: pol.name, version: pol.version });
            let parsedRules = [];
            try {
                parsedRules = JSON.parse(pol.rules);
            }
            catch {
                parsedRules = [];
            }
            for (const rule of parsedRules) {
                let conditionMet = true;
                // Check min trust score
                if (rule.condition.minTrustScore !== undefined && trustScore < rule.condition.minTrustScore) {
                    conditionMet = false;
                }
                // Check required roles
                if (rule.condition.requiredRoles && req.actorRole && !rule.condition.requiredRoles.includes(req.actorRole)) {
                    conditionMet = false;
                }
                // Check require trusted device
                if (rule.condition.requireTrustedDevice && deviceStatus !== client_1.DeviceTrustStatus.TRUSTED) {
                    conditionMet = false;
                }
                // Check break glass requirement
                if (rule.condition.requireBreakGlass && !isBreakGlassActive) {
                    conditionMet = false;
                }
                if (conditionMet) {
                    matchedRules.push(`${pol.name}:${rule.name}`);
                    if (rule.effect === "ALLOW")
                        explicitDecision = client_1.AccessDecisionType.ALLOW;
                    else if (rule.effect === "DENY")
                        explicitDecision = client_1.AccessDecisionType.DENY;
                    else if (rule.effect === "REQUIRE_APPROVAL")
                        explicitDecision = client_1.AccessDecisionType.APPROVAL_REQUIRED;
                    else if (rule.effect === "STEP_UP")
                        explicitDecision = client_1.AccessDecisionType.STEP_UP;
                    // Deny and Approval Required take precedence
                    if (explicitDecision === client_1.AccessDecisionType.DENY || explicitDecision === client_1.AccessDecisionType.APPROVAL_REQUIRED) {
                        break;
                    }
                }
            }
            if (explicitDecision === client_1.AccessDecisionType.DENY || explicitDecision === client_1.AccessDecisionType.APPROVAL_REQUIRED) {
                break;
            }
        }
        // 8. Default Zero-Trust Fallback
        let finalDecision = explicitDecision || client_1.AccessDecisionType.ALLOW;
        // Hard baseline security checks
        if (!isAuthenticated) {
            finalDecision = client_1.AccessDecisionType.DENY;
        }
        else if (!hasValidTenantScope) {
            finalDecision = client_1.AccessDecisionType.DENY;
        }
        else if ((req.resourceType === "POLICY" || req.resourceType === "SYSTEM") &&
            (req.action === "WRITE" || req.action === "DELETE" || req.action === "EXECUTE") &&
            req.actorRole !== "ADMIN") {
            finalDecision = client_1.AccessDecisionType.DENY;
            reasonCodes.push("UNAUTHORIZED_POLICY_MODIFICATION");
        }
        else if (req.resourceType === "EVIDENCE" &&
            req.action === "DELETE" &&
            req.actorRole !== "ADMIN") {
            finalDecision = client_1.AccessDecisionType.DENY;
            reasonCodes.push("UNAUTHORIZED_EVIDENCE_DELETION");
        }
        else if (deviceStatus === client_1.DeviceTrustStatus.BLOCKED) {
            finalDecision = client_1.AccessDecisionType.DENY;
            reasonCodes.push("BLOCKED_DEVICE_RESTRICTION");
        }
        else if (req.isPrivilegedAction && !isBreakGlassActive && req.actorRole !== "ADMIN") {
            finalDecision = client_1.AccessDecisionType.APPROVAL_REQUIRED;
            reasonCodes.push("PRIVILEGED_OPERATION_GATED");
        }
        else if (trustScore < 20) {
            finalDecision = client_1.AccessDecisionType.DENY;
            reasonCodes.push("CRITICAL_TRUST_DEFICIT");
        }
        // 9. Persist Access Decision Audit Record
        const record = await database_1.prisma.accessDecision.create({
            data: {
                actorId: req.actorId,
                actorEmail: req.actorEmail,
                actorRole: req.actorRole,
                resourceType: req.resourceType,
                resourceId: req.resourceId,
                action: req.action,
                decision: finalDecision,
                riskScore,
                trustScore,
                evaluatedPolicyIds: JSON.stringify(evaluatedPolicies.map((p) => p.id)),
                reasonCodes: reasonCodes.join(", "),
                correlationId,
                ipAddress: req.ipAddress,
                deviceFingerprint: deviceHash,
                theatreId: req.actorTenantType === "THEATRE" ? req.actorTenantId : undefined,
                productionCompanyId: req.actorTenantType === "PRODUCTION_COMPANY" ? req.actorTenantId : undefined,
            },
        });
        return {
            decision: finalDecision,
            trustScore,
            riskScore,
            isAllowed: finalDecision === client_1.AccessDecisionType.ALLOW,
            requiresApproval: finalDecision === client_1.AccessDecisionType.APPROVAL_REQUIRED,
            requiresStepUp: finalDecision === client_1.AccessDecisionType.STEP_UP,
            evaluatedPolicies,
            matchedRules,
            reasonCodes,
            correlationId,
            accessDecisionId: record.id,
        };
    }
    /**
     * List access decisions with filters.
     */
    static async listDecisions(params) {
        const where = {};
        if (params?.decision)
            where.decision = params.decision;
        if (params?.actorRole)
            where.actorRole = params.actorRole;
        if (params?.resourceType)
            where.resourceType = params.resourceType;
        if (params?.correlationId)
            where.correlationId = params.correlationId;
        return database_1.prisma.accessDecision.findMany({
            where,
            orderBy: { timestamp: "desc" },
            take: 100,
        });
    }
}
exports.ZeroTrustPolicyEngine = ZeroTrustPolicyEngine;
