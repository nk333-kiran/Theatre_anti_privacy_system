"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatIntelligenceEngine = exports.ThreatIntelligenceEngine = void 0;
const database_1 = require("@antipiracy/database");
class ThreatIntelligenceEngine {
    /**
     * Evaluates security indicators and produces explainable risk and confidence scores (0-100)
     */
    evaluateRisk(signals) {
        if (!signals || signals.length === 0) {
            return {
                riskScore: 0,
                confidenceScore: 0,
                severity: "INFO",
                signals: [],
                explanations: ["No threat indicators or anomalous telemetry detected."],
                recommendedAction: "FLAG_SESSION",
                requiresApproval: false,
            };
        }
        // 1. Calculate weighted risk score
        let totalWeightedRisk = 0;
        let totalConfidence = 0;
        const explanations = [];
        for (const signal of signals) {
            totalWeightedRisk += signal.riskWeight;
            totalConfidence += signal.confidence;
            explanations.push(`Signal [${signal.signalType}]: ${signal.signalValue} (Risk Impact: +${signal.riskWeight}, Confidence: ${signal.confidence}%)`);
        }
        // Compound multiplier for multiple correlated signals
        const correlationMultiplier = signals.length > 1 ? 1 + (signals.length - 1) * 0.15 : 1.0;
        const rawRisk = Math.min(100, Math.round(totalWeightedRisk * correlationMultiplier));
        const avgConfidence = Math.min(100, Math.round(totalConfidence / signals.length));
        // Determine Severity
        let severity = "INFO";
        if (rawRisk >= 80)
            severity = "CRITICAL";
        else if (rawRisk >= 60)
            severity = "HIGH";
        else if (rawRisk >= 35)
            severity = "MEDIUM";
        else if (rawRisk >= 15)
            severity = "LOW";
        // Determine Action & Approval requirements
        let recommendedAction = "FLAG_SESSION";
        let requiresApproval = false;
        if (severity === "CRITICAL") {
            recommendedAction = "REVOKE_PLAYBACK_SESSION";
            requiresApproval = false; // Emergency containment allowed
        }
        else if (severity === "HIGH") {
            recommendedAction = "REVOKE_ACTIVATION";
            requiresApproval = true; // SOC approval required for high impact
        }
        else if (severity === "MEDIUM") {
            recommendedAction = "RATE_LIMIT_SOURCE";
            requiresApproval = false;
        }
        else {
            recommendedAction = "REQUIRE_MANUAL_REVIEW";
            requiresApproval = false;
        }
        return {
            riskScore: rawRisk,
            confidenceScore: avgConfidence,
            severity,
            signals,
            explanations,
            recommendedAction,
            requiresApproval,
        };
    }
    /**
     * Scans platform logs and sessions to identify threat patterns
     */
    async analyzeSessionOrContext(params) {
        const signals = [];
        // Pattern A: Repeated Failed Access
        if (params.theatreId || params.ipAddress) {
            const recentFailedAudits = await database_1.prisma.securityAuditLog.count({
                where: {
                    isThreat: true,
                    theatreId: params.theatreId || undefined,
                    ipAddress: params.ipAddress || undefined,
                    createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // 15 mins
                },
            });
            if (recentFailedAudits >= 5) {
                signals.push({
                    signalType: "REPEATED_FAILED_ACCESS",
                    signalValue: `${recentFailedAudits} security threat violations detected in past 15m`,
                    riskWeight: Math.min(45, recentFailedAudits * 7),
                    confidence: 90,
                });
            }
        }
        // Pattern B & C: Session Replay / Token Abuse
        if (params.activationId) {
            const sessionCount = await database_1.prisma.playbackSession.count({
                where: { activationId: params.activationId },
            });
            if (sessionCount > 1) {
                signals.push({
                    signalType: "SESSION_REPLAY",
                    signalValue: `Multiple concurrent playback sessions (${sessionCount}) bound to same activation ticket`,
                    riskWeight: 50,
                    confidence: 95,
                });
            }
        }
        // Pattern E: Watermark / Forensic Correlation
        if (params.playbackSessionId) {
            const forensicEvidence = await database_1.prisma.forensicEvidence.findFirst({
                where: { playbackSessionId: params.playbackSessionId },
            });
            if (forensicEvidence) {
                signals.push({
                    signalType: "WATERMARK_CORRELATION",
                    signalValue: `Forensic watermark correlation confirmed on seat ${forensicEvidence.seatNumber || "UNKNOWN"}`,
                    riskWeight: 65,
                    confidence: forensicEvidence.confidenceScore || 95,
                });
            }
        }
        // Pattern F: DRM Abuse
        if (params.playbackSessionId || params.showId) {
            const revokedDrmCount = await database_1.prisma.drmLicense.count({
                where: {
                    playbackSessionId: params.playbackSessionId || undefined,
                    showId: params.showId || undefined,
                    status: "REVOKED",
                },
            });
            if (revokedDrmCount > 0) {
                signals.push({
                    signalType: "DRM_ABUSE",
                    signalValue: `${revokedDrmCount} revoked DRM licenses associated with session context`,
                    riskWeight: 40,
                    confidence: 85,
                });
            }
        }
        return this.evaluateRisk(signals);
    }
}
exports.ThreatIntelligenceEngine = ThreatIntelligenceEngine;
exports.threatIntelligenceEngine = new ThreatIntelligenceEngine();
