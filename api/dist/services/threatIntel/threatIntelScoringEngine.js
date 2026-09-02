"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelScoringEngine = void 0;
const client_1 = require("@prisma/client");
class ThreatIntelScoringEngine {
    /**
     * Calculates a deterministic 0-100 intelligence confidence score.
     */
    static calculateConfidence(params) {
        if (params.isReportedFalsePositive) {
            return {
                score: 0,
                level: client_1.ThreatIntelConfidenceLevel.UNTRUSTED,
                breakdown: {
                    sourceBaseWeight: 0,
                    corroborationBonus: 0,
                    ageDecayPenalty: 0,
                    telemetryBoost: 0,
                    analystAdjustment: -100,
                },
            };
        }
        // 1. Source Base Weight (0 - 60 points)
        const normalizedTrust = Math.max(0, Math.min(100, params.sourceTrustLevel || 50));
        const sourceBaseWeight = Math.round(normalizedTrust * 0.6);
        // 2. Corroboration Bonus (up to +20 points for multiple independent sources)
        const sourcesCount = Math.max(1, params.corroboratingSourcesCount || 1);
        let corroborationBonus = 0;
        if (sourcesCount > 1) {
            corroborationBonus = Math.min(20, (sourcesCount - 1) * 7);
        }
        // 3. Age Decay Penalty (up to -25 points for stale indicators > 30 days old)
        let ageDecayPenalty = 0;
        const now = new Date().getTime();
        const lastSeenTime = params.lastSeen ? new Date(params.lastSeen).getTime() : now;
        const daysSinceLastSeen = Math.max(0, (now - lastSeenTime) / (1000 * 60 * 60 * 24));
        if (daysSinceLastSeen > 30) {
            const excessDays = daysSinceLastSeen - 30;
            ageDecayPenalty = Math.min(25, Math.round(excessDays * 0.5));
        }
        // 4. Internal Telemetry Boost (up to +15 points if observed in actual theatre/playback logs)
        const matchCount = Math.max(0, params.internalTelemetryMatchCount || 0);
        const telemetryBoost = Math.min(15, matchCount * 5);
        // 5. Analyst Validation (+15 points bonus)
        let analystAdjustment = 0;
        if (params.isAnalystValidated) {
            analystAdjustment = 15;
        }
        // Aggregate final score bounded in [0, 100]
        let rawScore = sourceBaseWeight + corroborationBonus - ageDecayPenalty + telemetryBoost + analystAdjustment;
        const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
        const level = this.classifyLevel(finalScore);
        return {
            score: finalScore,
            level,
            breakdown: {
                sourceBaseWeight,
                corroborationBonus,
                ageDecayPenalty,
                telemetryBoost,
                analystAdjustment,
            },
        };
    }
    /**
     * Classifies 0-100 score into ThreatIntelConfidenceLevel enum.
     * 0-19: UNTRUSTED
     * 20-39: LOW
     * 40-59: MODERATE
     * 60-79: HIGH
     * 80-100: VERY_HIGH
     */
    static classifyLevel(score) {
        if (score < 20)
            return client_1.ThreatIntelConfidenceLevel.UNTRUSTED;
        if (score < 40)
            return client_1.ThreatIntelConfidenceLevel.LOW;
        if (score < 60)
            return client_1.ThreatIntelConfidenceLevel.MODERATE;
        if (score < 80)
            return client_1.ThreatIntelConfidenceLevel.HIGH;
        return client_1.ThreatIntelConfidenceLevel.VERY_HIGH;
    }
}
exports.ThreatIntelScoringEngine = ThreatIntelScoringEngine;
