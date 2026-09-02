import { prisma } from "@antipiracy/database";
import { threatScoringEngine, ScoreResult } from "./threatScoringEngine";
import { signalAggregator } from "./signalAggregator";
import { patternDetectionEngine } from "./patternDetectionEngine";
import { predictionEngine } from "./predictionEngine";
import { SecurityAuditService } from "../security/securityAuditService";
import { logger } from "../logging/logger";

export class IntelligenceManager {
  /**
   * Performs a comprehensive recalculation across all signals, patterns, and predictions
   */
  public async recalculateAll(actorUser?: any) {
    logger.info("[IntelligenceManager] Initiating full threat intelligence recalculation...");

    // 1. Collect global signals
    const globalSignals = await signalAggregator.collectSignals({ windowMinutes: 180 });

    // 2. Score overall system risk
    const overallScore = threatScoringEngine.computeScore(globalSignals);

    // Save Overall Risk Score
    await prisma.threatRiskScore.create({
      data: {
        entityType: "OVERALL",
        entityId: "SYSTEM",
        riskScore: overallScore.riskScore,
        riskLevel: overallScore.riskLevel,
        confidence: overallScore.confidence,
        contributingSignals: JSON.stringify(overallScore.contributingSignals),
        recommendation: overallScore.recommendation,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour TTL
      },
    });

    // 3. Detect and persist patterns
    const detectedPatterns = patternDetectionEngine.detectPatterns(globalSignals);
    const persistedPatterns = await patternDetectionEngine.persistPatterns(detectedPatterns);

    // 4. Generate and persist predictions
    const predictions = await predictionEngine.generatePredictions();
    await predictionEngine.persistPredictions(predictions);

    // 5. Audit log
    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: overallScore.riskScore >= 60 ? "HIGH" : "INFO",
      userId: actorUser?.id,
      actorEmail: actorUser?.email,
      actorRole: actorUser?.role,
      actionSummary: `Recalculated Threat Intelligence (Score: ${overallScore.riskScore}/100, Patterns: ${persistedPatterns.length}, Predictions: ${predictions.length})`,
      isThreat: overallScore.riskScore >= 60,
      threatDetails: overallScore.recommendation,
    });

    return {
      overallScore,
      patternsCount: persistedPatterns.length,
      predictionsCount: predictions.length,
    };
  }

  /**
   * Returns threat stats and overview scoped by role
   */
  public async getStats(user?: any) {
    const isProduction = user?.role === "PRODUCTION_COMPANY";
    const companyId = user?.productionCompanyId;

    const [
      activePatternsCount,
      criticalPatternsCount,
      predictionsCount,
      recentRiskScore,
      theatresCount,
    ] = await Promise.all([
      prisma.threatPattern.count({ where: { status: "DETECTED" } }),
      prisma.threatPattern.count({ where: { severity: "CRITICAL", status: "DETECTED" } }),
      prisma.threatPrediction.count(),
      prisma.threatRiskScore.findFirst({
        where: { entityType: "OVERALL" },
        orderBy: { calculatedAt: "desc" },
      }),
      prisma.theatre.count(),
    ]);

    return {
      overallRiskScore: recentRiskScore?.riskScore || 0,
      overallRiskLevel: recentRiskScore?.riskLevel || "LOW",
      confidence: recentRiskScore?.confidence || 0,
      activePatternsCount,
      criticalPatternsCount,
      predictionsCount,
      monitoredTheatres: theatresCount,
      recommendation: recentRiskScore?.recommendation || "System operational. No critical threats detected.",
    };
  }

  /**
   * Acknowledge a pattern
   */
  public async acknowledgePattern(patternId: string, actorUser?: any) {
    const pattern = await prisma.threatPattern.update({
      where: { id: patternId },
      data: { status: "ACKNOWLEDGED" },
    });

    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: "INFO",
      userId: actorUser?.id,
      actorEmail: actorUser?.email,
      actorRole: actorUser?.role,
      actionSummary: `Acknowledged Threat Pattern ${pattern.name} (${pattern.patternType})`,
    });

    return pattern;
  }

  /**
   * Link a prediction or pattern to an investigation
   */
  public async linkToInvestigation(params: {
    predictionId?: string;
    patternId?: string;
    incidentId?: string;
    investigationId?: string;
    notes?: string;
  }) {
    return prisma.threatInvestigationLink.create({
      data: {
        predictionId: params.predictionId,
        patternId: params.patternId,
        incidentId: params.incidentId,
        investigationId: params.investigationId,
        notes: params.notes,
      },
    });
  }
}

export const intelligenceManager = new IntelligenceManager();
