import { prisma } from "@antipiracy/database";
import { AccessDecisionType, PolicyType, DeviceTrustStatus } from "@prisma/client";
import { TrustScoringEngine } from "./trustScoringEngine";
import { DeviceTrustService } from "./deviceTrustService";
import { BreakGlassService } from "./breakGlassService";
import { PolicyOrchestrator, PolicyRule } from "./policyOrchestrator";

export interface ZeroTrustEvaluationRequest {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  actorTenantType?: "THEATRE" | "PRODUCTION_COMPANY" | "ADMIN";
  actorTenantId?: string;
  sessionAgeMinutes?: number;
  rawDeviceFingerprint?: string;
  ipAddress?: string;
  resourceType: "PLAYBACK" | "DRM" | "EVIDENCE" | "CASE" | "INTEL" | "POLICY" | "SYSTEM";
  resourceId?: string;
  action: "READ" | "WRITE" | "EXECUTE" | "TERMINATE" | "EXPORT" | "DELETE";
  targetTenantType?: string;
  targetTenantId?: string;
  recentThreatsCount?: number;
  threatIntelMatchesCount?: number;
  threatPosture?: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  isPrivilegedAction?: boolean;
  correlationId?: string;
}

export interface ZeroTrustEvaluationResult {
  decision: AccessDecisionType;
  trustScore: number;
  riskScore: number;
  isAllowed: boolean;
  requiresApproval: boolean;
  requiresStepUp: boolean;
  evaluatedPolicies: Array<{ id: string; name: string; version: number }>;
  matchedRules: string[];
  reasonCodes: string[];
  correlationId: string;
  accessDecisionId: string;
}

export class ZeroTrustPolicyEngine {
  /**
   * Evaluate a full Zero-Trust access request deterministically.
   */
  public static async evaluateAccess(
    req: ZeroTrustEvaluationRequest
  ): Promise<ZeroTrustEvaluationResult> {
    const correlationId = req.correlationId || `DEC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const reasonCodes: string[] = [];

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
    let deviceStatus: DeviceTrustStatus = DeviceTrustStatus.UNKNOWN;
    let deviceHash: string | undefined = undefined;
    if (req.rawDeviceFingerprint) {
      const deviceAssessed = await DeviceTrustService.getOrCreateDevice(
        req.rawDeviceFingerprint,
        req.ipAddress
      );
      deviceStatus = deviceAssessed.trustStatus;
      deviceHash = deviceAssessed.fingerprintHash;
    }

    // 4. Break-Glass Emergency Access Check
    const isBreakGlassActive = req.actorId ? await BreakGlassService.hasActiveSession(req.actorId) : false;
    if (isBreakGlassActive) {
      reasonCodes.push("BREAK_GLASS_SESSION_ACTIVE");
    }

    // 5. Calculate Deterministic Trust Score
    const trustResult = TrustScoringEngine.calculateTrustScore({
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
    let policyType: PolicyType = PolicyType.ACCESS_CONTROL;
    if (req.resourceType === "PLAYBACK") policyType = PolicyType.PLAYBACK_AUTHORIZATION;
    else if (req.resourceType === "DRM") policyType = PolicyType.DRM_LICENSE;
    else if (req.resourceType === "EVIDENCE") policyType = PolicyType.EVIDENCE_ACCESS;
    else if (req.resourceType === "CASE") policyType = PolicyType.INVESTIGATION_CASE;
    else if (req.resourceType === "INTEL") policyType = PolicyType.THREAT_INTEL;
    else if (req.resourceType === "POLICY" || req.resourceType === "SYSTEM") policyType = PolicyType.ADMIN_OPERATIONS;

    // 7. Load Applicable Security Policies in Priority Order
    const applicablePolicies = await PolicyOrchestrator.getApplicablePolicies({
      policyType,
      tenantType: req.actorTenantType,
      tenantId: req.actorTenantId,
    });

    const evaluatedPolicies: Array<{ id: string; name: string; version: number }> = [];
    const matchedRules: string[] = [];
    let explicitDecision: AccessDecisionType | null = null;

    for (const pol of applicablePolicies) {
      evaluatedPolicies.push({ id: pol.id, name: pol.name, version: pol.version });

      let parsedRules: PolicyRule[] = [];
      try {
        parsedRules = JSON.parse(pol.rules);
      } catch {
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
        if (rule.condition.requireTrustedDevice && deviceStatus !== DeviceTrustStatus.TRUSTED) {
          conditionMet = false;
        }

        // Check break glass requirement
        if (rule.condition.requireBreakGlass && !isBreakGlassActive) {
          conditionMet = false;
        }

        if (conditionMet) {
          matchedRules.push(`${pol.name}:${rule.name}`);
          if (rule.effect === "ALLOW") explicitDecision = AccessDecisionType.ALLOW;
          else if (rule.effect === "DENY") explicitDecision = AccessDecisionType.DENY;
          else if (rule.effect === "REQUIRE_APPROVAL") explicitDecision = AccessDecisionType.APPROVAL_REQUIRED;
          else if (rule.effect === "STEP_UP") explicitDecision = AccessDecisionType.STEP_UP;

          // Deny and Approval Required take precedence
          if (explicitDecision === AccessDecisionType.DENY || explicitDecision === AccessDecisionType.APPROVAL_REQUIRED) {
            break;
          }
        }
      }

      if (explicitDecision === AccessDecisionType.DENY || explicitDecision === AccessDecisionType.APPROVAL_REQUIRED) {
        break;
      }
    }

    // 8. Default Zero-Trust Fallback
    let finalDecision: AccessDecisionType = explicitDecision || AccessDecisionType.ALLOW;

    // Hard baseline security checks
    if (!isAuthenticated) {
      finalDecision = AccessDecisionType.DENY;
    } else if (!hasValidTenantScope) {
      finalDecision = AccessDecisionType.DENY;
    } else if (
      (req.resourceType === "POLICY" || req.resourceType === "SYSTEM") &&
      (req.action === "WRITE" || req.action === "DELETE" || req.action === "EXECUTE") &&
      req.actorRole !== "ADMIN"
    ) {
      finalDecision = AccessDecisionType.DENY;
      reasonCodes.push("UNAUTHORIZED_POLICY_MODIFICATION");
    } else if (
      req.resourceType === "EVIDENCE" &&
      req.action === "DELETE" &&
      req.actorRole !== "ADMIN"
    ) {
      finalDecision = AccessDecisionType.DENY;
      reasonCodes.push("UNAUTHORIZED_EVIDENCE_DELETION");
    } else if (deviceStatus === DeviceTrustStatus.BLOCKED) {
      finalDecision = AccessDecisionType.DENY;
      reasonCodes.push("BLOCKED_DEVICE_RESTRICTION");
    } else if (req.isPrivilegedAction && !isBreakGlassActive && req.actorRole !== "ADMIN") {
      finalDecision = AccessDecisionType.APPROVAL_REQUIRED;
      reasonCodes.push("PRIVILEGED_OPERATION_GATED");
    } else if (trustScore < 20) {
      finalDecision = AccessDecisionType.DENY;
      reasonCodes.push("CRITICAL_TRUST_DEFICIT");
    }

    // 9. Persist Access Decision Audit Record
    const record = await prisma.accessDecision.create({
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
      isAllowed: finalDecision === AccessDecisionType.ALLOW,
      requiresApproval: finalDecision === AccessDecisionType.APPROVAL_REQUIRED,
      requiresStepUp: finalDecision === AccessDecisionType.STEP_UP,
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
  public static async listDecisions(params?: {
    decision?: AccessDecisionType;
    actorRole?: string;
    resourceType?: string;
    correlationId?: string;
  }) {
    const where: any = {};
    if (params?.decision) where.decision = params.decision;
    if (params?.actorRole) where.actorRole = params.actorRole;
    if (params?.resourceType) where.resourceType = params.resourceType;
    if (params?.correlationId) where.correlationId = params.correlationId;

    return prisma.accessDecision.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  }
}
