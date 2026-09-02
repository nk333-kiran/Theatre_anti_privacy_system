import { DeviceTrustStatus } from "@prisma/client";

export type TrustClassification = "TRUSTED" | "STANDARD" | "GUARDED" | "HIGH_RISK" | "UNTRUSTED";

export interface TrustScoreFactors {
  isAuthenticated: boolean;
  actorRole?: string;
  hasValidTenantScope: boolean;
  sessionAgeMinutes?: number;
  deviceTrustStatus?: DeviceTrustStatus;
  recentSecurityThreatCount?: number;
  threatIntelMatchCount?: number;
  threatPosture?: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  isPrivilegedResource?: boolean;
  isBreakGlassActive?: boolean;
}

export interface TrustScoreResult {
  score: number; // 0 - 100
  classification: TrustClassification;
  breakdown: {
    baseIdentityScore: number;
    tenantScopeAdjustment: number;
    sessionAgeAdjustment: number;
    deviceTrustAdjustment: number;
    securityThreatPenalty: number;
    threatIntelPenalty: number;
    threatPostureAdjustment: number;
    privilegedDeduction: number;
    breakGlassBonus: number;
  };
  reasonCodes: string[];
}

export class TrustScoringEngine {
  /**
   * Calculate a deterministic 0-100 zero-trust score.
   */
  public static calculateTrustScore(factors: TrustScoreFactors): TrustScoreResult {
    const reasonCodes: string[] = [];

    // 1. Base Identity Score (0 - 50)
    let baseIdentityScore = 0;
    if (factors.isAuthenticated) {
      baseIdentityScore = 40;
      reasonCodes.push("AUTHENTICATED_IDENTITY");

      if (factors.actorRole === "ADMIN" || factors.actorRole === "THEATRE_ADMIN") {
        baseIdentityScore += 10;
        reasonCodes.push("ADMINISTRATOR_ROLE");
      } else if (factors.actorRole === "PRODUCTION_COMPANY" || factors.actorRole === "THEATRE_STAFF") {
        baseIdentityScore += 5;
        reasonCodes.push("VERIFIED_STAFF_ROLE");
      }
    } else {
      reasonCodes.push("UNAUTHENTICATED");
    }

    // 2. Tenant Scope Verification (+10 / -30)
    let tenantScopeAdjustment = 0;
    if (factors.hasValidTenantScope) {
      tenantScopeAdjustment = 10;
      reasonCodes.push("VALID_TENANT_SCOPE");
    } else if (factors.isAuthenticated && factors.actorRole !== "ADMIN") {
      tenantScopeAdjustment = -30;
      reasonCodes.push("TENANT_SCOPE_MISMATCH");
    }

    // 3. Session Age Adjustment (-0.2 per hour after 8h)
    let sessionAgeAdjustment = 0;
    if (factors.sessionAgeMinutes !== undefined) {
      if (factors.sessionAgeMinutes <= 60) {
        sessionAgeAdjustment = 5;
        reasonCodes.push("FRESH_SESSION");
      } else if (factors.sessionAgeMinutes > 480) {
        // Older than 8 hours
        const extraHours = (factors.sessionAgeMinutes - 480) / 60;
        sessionAgeAdjustment = -Math.min(20, Math.floor(extraHours * 2));
        reasonCodes.push("STALE_SESSION");
      }
    }

    // 4. Device Trust Adjustment (+15 / 0 / -25 / -50)
    let deviceTrustAdjustment = 0;
    switch (factors.deviceTrustStatus) {
      case DeviceTrustStatus.TRUSTED:
        deviceTrustAdjustment = 15;
        reasonCodes.push("TRUSTED_DEVICE");
        break;
      case DeviceTrustStatus.SUSPICIOUS:
        deviceTrustAdjustment = -25;
        reasonCodes.push("SUSPICIOUS_DEVICE");
        break;
      case DeviceTrustStatus.BLOCKED:
        deviceTrustAdjustment = -50;
        reasonCodes.push("BLOCKED_DEVICE");
        break;
      case DeviceTrustStatus.UNKNOWN:
      default:
        deviceTrustAdjustment = 0;
        reasonCodes.push("UNKNOWN_DEVICE");
        break;
    }

    // 5. Recent Security Threats Penalty (-10 per incident, max -30)
    const threats = factors.recentSecurityThreatCount || 0;
    const securityThreatPenalty = -Math.min(30, threats * 10);
    if (threats > 0) {
      reasonCodes.push(`RECENT_SECURITY_THREATS_${threats}`);
    }

    // 6. Threat Intel Correlation Matches Penalty (-15 per match, max -30)
    const matches = factors.threatIntelMatchCount || 0;
    const threatIntelPenalty = -Math.min(30, matches * 15);
    if (matches > 0) {
      reasonCodes.push(`THREAT_INTEL_MATCH_${matches}`);
    }

    // 7. Threat Posture Environment Adjustment
    let threatPostureAdjustment = 0;
    switch (factors.threatPosture) {
      case "CRITICAL":
        threatPostureAdjustment = -20;
        reasonCodes.push("POSTURE_CRITICAL");
        break;
      case "HIGH":
        threatPostureAdjustment = -10;
        reasonCodes.push("POSTURE_HIGH");
        break;
      case "ELEVATED":
        threatPostureAdjustment = -5;
        reasonCodes.push("POSTURE_ELEVATED");
        break;
      case "LOW":
      default:
        threatPostureAdjustment = 5;
        reasonCodes.push("POSTURE_NORMAL");
        break;
    }

    // 8. Privileged Resource Sensitivity Deduction (-10)
    let privilegedDeduction = 0;
    if (factors.isPrivilegedResource) {
      privilegedDeduction = -10;
      reasonCodes.push("PRIVILEGED_RESOURCE_EVALUATION");
    }

    // 9. Break-Glass Emergency Session Bonus (+15 for authorized bypass session)
    let breakGlassBonus = 0;
    if (factors.isBreakGlassActive) {
      breakGlassBonus = 15;
      reasonCodes.push("ACTIVE_BREAK_GLASS_AUTHORIZATION");
    }

    // Deterministic sum clamped to [0, 100]
    const rawScore =
      baseIdentityScore +
      tenantScopeAdjustment +
      sessionAgeAdjustment +
      deviceTrustAdjustment +
      securityThreatPenalty +
      threatIntelPenalty +
      threatPostureAdjustment +
      privilegedDeduction +
      breakGlassBonus;

    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Classification mapping
    let classification: TrustClassification = "UNTRUSTED";
    if (score >= 80) {
      classification = "TRUSTED";
    } else if (score >= 60) {
      classification = "STANDARD";
    } else if (score >= 40) {
      classification = "GUARDED";
    } else if (score >= 20) {
      classification = "HIGH_RISK";
    } else {
      classification = "UNTRUSTED";
    }

    return {
      score,
      classification,
      breakdown: {
        baseIdentityScore,
        tenantScopeAdjustment,
        sessionAgeAdjustment,
        deviceTrustAdjustment,
        securityThreatPenalty,
        threatIntelPenalty,
        threatPostureAdjustment,
        privilegedDeduction,
        breakGlassBonus,
      },
      reasonCodes,
    };
  }
}
