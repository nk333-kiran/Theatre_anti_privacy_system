import { prisma, SecurityEventType } from "@antipiracy/database";
import { logger } from "../logging/logger";

export interface ThreatRuleResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  scoreContribution: number;
  description: string;
}

export interface ThreatAssessment {
  targetId: string; // Activation ID, Theatre ID, or PlaybackSession ID
  targetType: "ACTIVATION" | "THEATRE" | "SESSION" | "IP";
  riskScore: number; // 0 to 100
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  triggeredRules: ThreatRuleResult[];
  recommendedResponse: "NONE" | "OBSERVE" | "FLAG_AUDITORIUM" | "REVOKE_DRM" | "TERMINATE_SESSION" | "BLACKLIST_IP";
  evidenceCount: number;
  evaluatedAt: string;
}

export interface ThreatIntelligenceSummary {
  overallThreatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  averageRiskScore: number;
  activeHighRiskEntitiesCount: number;
  threatDistribution: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  topTriggeredRules: { ruleId: string; name: string; count: number }[];
  recentAnomalies: {
    id: string;
    eventType: string;
    severity: string;
    actionSummary: string;
    theatreName?: string;
    ipAddress?: string;
    createdAt: string;
  }[];
  timestamp: string;
}

class ThreatIntelligenceEngine {
  /**
   * Evaluate multi-signal risk score for a specific screening session or activation
   */
  public async assessSessionThreat(sessionId: string): Promise<ThreatAssessment> {
    const session = await prisma.playbackSession.findUnique({
      where: { id: sessionId },
      include: {
        theatre: true,
        activation: true,
      },
    });

    if (!session) {
      return {
        targetId: sessionId,
        targetType: "SESSION",
        riskScore: 0,
        severity: "LOW",
        triggeredRules: [],
        recommendedResponse: "NONE",
        evidenceCount: 0,
        evaluatedAt: new Date().toISOString(),
      };
    }

    const [threatLogs, protectionEvents, drmLicensesCount] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where: {
          OR: [{ activationId: session.activationId }, { theatreId: session.theatreId }],
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      prisma.protectionEvent.findMany({
        where: { activationId: session.activationId },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      prisma.drmLicense.count({
        where: { activationId: session.activationId },
      }),
    ]);

    const rules: ThreatRuleResult[] = [];
    let totalScore = 0;

    // RULE 1: Screenshot / Screen Capture Attempt Detected
    const screenshotEvents = protectionEvents.filter(
      (e) => e.eventType === "SCREENSHOT_ATTEMPT_DETECTED"
    );
    const screenshotTriggered = screenshotEvents.length > 0;
    const screenshotScore = Math.min(screenshotEvents.length * 30, 60);
    totalScore += screenshotScore;
    rules.push({
      ruleId: "TR-001",
      ruleName: "Screen Capture / Capture Tool Detected",
      triggered: screenshotTriggered,
      scoreContribution: screenshotScore,
      description: `${screenshotEvents.length} screen capture or inspection attempts detected in player sandbox.`,
    });

    // RULE 2: Repeated Rate Limit Violations
    const rateLimitLogs = threatLogs.filter((l) => l.eventType === "RATE_LIMIT_EXCEEDED");
    const rateLimitTriggered = rateLimitLogs.length > 0;
    const rateLimitScore = Math.min(rateLimitLogs.length * 15, 40);
    totalScore += rateLimitScore;
    rules.push({
      ruleId: "TR-002",
      ruleName: "High Velocity Rate Limit Breaches",
      triggered: rateLimitTriggered,
      scoreContribution: rateLimitScore,
      description: `${rateLimitLogs.length} rate limit spikes observed on playback/licensing endpoints.`,
    });

    // RULE 3: Multiple DRM License Requests (Token Replay / Multi-device attempt)
    const excessDrmTriggered = drmLicensesCount > 2;
    const excessDrmScore = excessDrmTriggered ? 25 : 0;
    totalScore += excessDrmScore;
    rules.push({
      ruleId: "TR-003",
      ruleName: "Excessive Concurrent DRM License Requests",
      triggered: excessDrmTriggered,
      scoreContribution: excessDrmScore,
      description: `${drmLicensesCount} licenses requested for a single seat admission.`,
    });

    // RULE 4: Multiple Failed / Denied Playback Authorizations
    const deniedLogs = threatLogs.filter((l) => l.eventType === "PLAYBACK_DENIED" || l.eventType === "DRM_LICENSE_DENIED");
    const deniedTriggered = deniedLogs.length > 0;
    const deniedScore = Math.min(deniedLogs.length * 20, 40);
    totalScore += deniedScore;
    rules.push({
      ruleId: "TR-004",
      ruleName: "Authorization / License Denials",
      triggered: deniedTriggered,
      scoreContribution: deniedScore,
      description: `${deniedLogs.length} authorization rejections recorded on security ledger.`,
    });

    const finalScore = Math.min(Math.max(totalScore, 5), 100);

    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    let recommendedResponse: "NONE" | "OBSERVE" | "FLAG_AUDITORIUM" | "REVOKE_DRM" | "TERMINATE_SESSION" | "BLACKLIST_IP" = "NONE";

    if (finalScore >= 75) {
      severity = "CRITICAL";
      recommendedResponse = "TERMINATE_SESSION";
    } else if (finalScore >= 50) {
      severity = "HIGH";
      recommendedResponse = "REVOKE_DRM";
    } else if (finalScore >= 25) {
      severity = "MEDIUM";
      recommendedResponse = "FLAG_AUDITORIUM";
    } else {
      severity = "LOW";
      recommendedResponse = "OBSERVE";
    }

    return {
      targetId: sessionId,
      targetType: "SESSION",
      riskScore: finalScore,
      severity,
      triggeredRules: rules,
      recommendedResponse,
      evidenceCount: screenshotEvents.length + rateLimitLogs.length + deniedLogs.length,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Aggregate platform-wide threat intelligence summary for the Security Operations Dashboard
   */
  public async getThreatIntelligenceSummary(): Promise<ThreatIntelligenceSummary> {
    const [threatAudits, activeIncidents] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where: { isThreat: true },
        take: 200,
        orderBy: { createdAt: "desc" },
      }),
      prisma.piracyIncident.findMany({
        where: { status: { in: ["DETECTED", "TRIAGED", "INVESTIGATING", "CONFIRMED"] } },
      }),
    ]);

    const criticalCount = activeIncidents.filter((i) => i.severity === "CRITICAL").length;
    const highCount = activeIncidents.filter((i) => i.severity === "HIGH").length;
    const mediumCount = activeIncidents.filter((i) => i.severity === "MEDIUM").length;
    const lowCount = activeIncidents.filter((i) => i.severity === "LOW").length;

    let overallThreatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (criticalCount > 0) overallThreatLevel = "CRITICAL";
    else if (highCount > 0) overallThreatLevel = "HIGH";
    else if (mediumCount > 2) overallThreatLevel = "MEDIUM";

    const avgScore =
      activeIncidents.length > 0
        ? Math.round(activeIncidents.reduce((a, b) => a + b.riskScore, 0) / activeIncidents.length)
        : 15;

    const topRules = [
      { ruleId: "TR-001", name: "Screen Capture Attempt", count: threatAudits.filter((a) => a.actionSummary.includes("SCREENSHOT")).length },
      { ruleId: "TR-002", name: "Rate Limit Spike", count: threatAudits.filter((a) => a.eventType === "RATE_LIMIT_EXCEEDED").length },
      { ruleId: "TR-003", name: "DRM License Denial", count: threatAudits.filter((a) => a.eventType === "DRM_LICENSE_DENIED").length },
      { ruleId: "TR-004", name: "Playback Authorization Denial", count: threatAudits.filter((a) => a.eventType === "PLAYBACK_DENIED").length },
    ].sort((a, b) => b.count - a.count);

    const recentAnomalies = threatAudits.slice(0, 10).map((a) => ({
      id: a.id,
      eventType: a.eventType,
      severity: a.severity,
      actionSummary: a.actionSummary,
      ipAddress: a.ipAddress || undefined,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      overallThreatLevel,
      averageRiskScore: avgScore,
      activeHighRiskEntitiesCount: criticalCount + highCount,
      threatDistribution: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      },
      topTriggeredRules: topRules,
      recentAnomalies,
      timestamp: new Date().toISOString(),
    };
  }
}

export const threatIntelligenceEngine = new ThreatIntelligenceEngine();
