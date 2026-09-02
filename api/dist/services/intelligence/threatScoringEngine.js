"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatScoringEngine = exports.ThreatScoringEngine = exports.DEFAULT_THRESHOLDS = void 0;
exports.DEFAULT_THRESHOLDS = {
    lowMax: 19,
    guardedMax: 39,
    elevatedMax: 59,
    highMax: 79,
};
class ThreatScoringEngine {
    thresholds;
    constructor(thresholds = exports.DEFAULT_THRESHOLDS) {
        this.thresholds = thresholds;
    }
    getRiskLevel(score) {
        if (score <= this.thresholds.lowMax)
            return "LOW";
        if (score <= this.thresholds.guardedMax)
            return "GUARDED";
        if (score <= this.thresholds.elevatedMax)
            return "ELEVATED";
        if (score <= this.thresholds.highMax)
            return "HIGH";
        return "CRITICAL";
    }
    computeScore(signals) {
        if (!signals || signals.length === 0) {
            return {
                riskScore: 0,
                riskLevel: "LOW",
                confidence: 0,
                contributingSignals: [],
                recommendation: "Baseline security posture normal. No active threat signals detected.",
            };
        }
        // Weighted risk accumulation with compound synergy
        let rawWeight = 0;
        let confidenceSum = 0;
        for (const sig of signals) {
            rawWeight += sig.weight;
            confidenceSum += sig.confidence;
        }
        const compoundMultiplier = signals.length > 1 ? 1 + (signals.length - 1) * 0.12 : 1.0;
        const finalScore = Math.min(100, Math.round(rawWeight * compoundMultiplier));
        const avgConfidence = Math.min(100, Math.round(confidenceSum / signals.length));
        const riskLevel = this.getRiskLevel(finalScore);
        // Contextual recommendation based on level & dominant signal
        let recommendation = "Routine monitoring active.";
        if (riskLevel === "CRITICAL") {
            recommendation = "Immediately review active sessions, audit screening telemetry, and prepare session containment.";
        }
        else if (riskLevel === "HIGH") {
            recommendation = "Elevated risk detected. Recommend SOC verification and screening supervisor alert.";
        }
        else if (riskLevel === "ELEVATED") {
            recommendation = "Moderate anomaly rate. Enforce strict rate-limiting and audit checkpoint entries.";
        }
        else if (riskLevel === "GUARDED") {
            recommendation = "Minor anomalies observed. Continue standard baseline telemetry collection.";
        }
        return {
            riskScore: finalScore,
            riskLevel,
            confidence: avgConfidence,
            contributingSignals: signals,
            recommendation,
        };
    }
}
exports.ThreatScoringEngine = ThreatScoringEngine;
exports.threatScoringEngine = new ThreatScoringEngine();
