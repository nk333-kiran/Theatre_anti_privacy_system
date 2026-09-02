"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelligenceManager = exports.IntelligenceManager = void 0;
const database_1 = require("@antipiracy/database");
const threatScoringEngine_1 = require("./threatScoringEngine");
const signalAggregator_1 = require("./signalAggregator");
const patternDetectionEngine_1 = require("./patternDetectionEngine");
const predictionEngine_1 = require("./predictionEngine");
const securityAuditService_1 = require("../security/securityAuditService");
const logger_1 = require("../logging/logger");
class IntelligenceManager {
    /**
     * Performs a comprehensive recalculation across all signals, patterns, and predictions
     */
    async recalculateAll(actorUser) {
        logger_1.logger.info("[IntelligenceManager] Initiating full threat intelligence recalculation...");
        // 1. Collect global signals
        const globalSignals = await signalAggregator_1.signalAggregator.collectSignals({ windowMinutes: 180 });
        // 2. Score overall system risk
        const overallScore = threatScoringEngine_1.threatScoringEngine.computeScore(globalSignals);
        // Save Overall Risk Score
        await database_1.prisma.threatRiskScore.create({
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
        const detectedPatterns = patternDetectionEngine_1.patternDetectionEngine.detectPatterns(globalSignals);
        const persistedPatterns = await patternDetectionEngine_1.patternDetectionEngine.persistPatterns(detectedPatterns);
        // 4. Generate and persist predictions
        const predictions = await predictionEngine_1.predictionEngine.generatePredictions();
        await predictionEngine_1.predictionEngine.persistPredictions(predictions);
        // 5. Audit log
        await securityAuditService_1.SecurityAuditService.logEvent({
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
    async getStats(user) {
        const isProduction = user?.role === "PRODUCTION_COMPANY";
        const companyId = user?.productionCompanyId;
        const [activePatternsCount, criticalPatternsCount, predictionsCount, recentRiskScore, theatresCount,] = await Promise.all([
            database_1.prisma.threatPattern.count({ where: { status: "DETECTED" } }),
            database_1.prisma.threatPattern.count({ where: { severity: "CRITICAL", status: "DETECTED" } }),
            database_1.prisma.threatPrediction.count(),
            database_1.prisma.threatRiskScore.findFirst({
                where: { entityType: "OVERALL" },
                orderBy: { calculatedAt: "desc" },
            }),
            database_1.prisma.theatre.count(),
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
    async acknowledgePattern(patternId, actorUser) {
        const pattern = await database_1.prisma.threatPattern.update({
            where: { id: patternId },
            data: { status: "ACKNOWLEDGED" },
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
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
    async linkToInvestigation(params) {
        return database_1.prisma.threatInvestigationLink.create({
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
exports.IntelligenceManager = IntelligenceManager;
exports.intelligenceManager = new IntelligenceManager();
