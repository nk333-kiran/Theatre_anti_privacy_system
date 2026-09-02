import { prisma } from "@antipiracy/database";
import { logger } from "../logging/logger";

export type RiskLevel = "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";

export interface RiskThresholds {
  lowMax: number; // 19
  guardedMax: number; // 39
  elevatedMax: number; // 59
  highMax: number; // 79
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  lowMax: 19,
  guardedMax: 39,
  elevatedMax: 59,
  highMax: 79,
};

export interface EvaluatedSignal {
  source: string;
  eventType: string;
  weight: number;
  confidence: number;
  description: string;
}

export interface ScoreResult {
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  confidence: number; // 0 - 100
  contributingSignals: EvaluatedSignal[];
  recommendation: string;
}

export class ThreatScoringEngine {
  private thresholds: RiskThresholds;

  constructor(thresholds: RiskThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  public getRiskLevel(score: number): RiskLevel {
    if (score <= this.thresholds.lowMax) return "LOW";
    if (score <= this.thresholds.guardedMax) return "GUARDED";
    if (score <= this.thresholds.elevatedMax) return "ELEVATED";
    if (score <= this.thresholds.highMax) return "HIGH";
    return "CRITICAL";
  }

  public computeScore(signals: EvaluatedSignal[]): ScoreResult {
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
    } else if (riskLevel === "HIGH") {
      recommendation = "Elevated risk detected. Recommend SOC verification and screening supervisor alert.";
    } else if (riskLevel === "ELEVATED") {
      recommendation = "Moderate anomaly rate. Enforce strict rate-limiting and audit checkpoint entries.";
    } else if (riskLevel === "GUARDED") {
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

export const threatScoringEngine = new ThreatScoringEngine();
