"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatDetector = exports.ThreatDetector = void 0;
const database_1 = require("@antipiracy/database");
class ThreatDetector {
    /**
     * Evaluates an incoming security event for threat heuristics in a sliding 5-minute window.
     */
    async analyzeEvent(params) {
        const windowMs = 5 * 60 * 1000;
        const windowStart = new Date(Date.now() - windowMs);
        const ip = params.ipAddress;
        // Rule 1: Excessive Failed Logins from same IP or Email
        if (params.eventType === "LOGIN_FAILED") {
            const recentFailures = await database_1.prisma.securityAuditLog.count({
                where: {
                    eventType: "LOGIN_FAILED",
                    createdAt: { gte: windowStart },
                    OR: [
                        ip ? { ipAddress: ip } : {},
                        params.actorEmail ? { actorEmail: params.actorEmail } : {},
                    ],
                },
            });
            if (recentFailures >= 4) {
                return {
                    isThreat: true,
                    threatDetails: `Brute force login threshold exceeded (${recentFailures + 1} failed attempts within 5 minutes)`,
                    threatScore: 85,
                };
            }
        }
        // Rule 2: Excessive Invalid Activation Attempts
        if (params.eventType === "QR_ACTIVATION_DENIED") {
            if (ip) {
                const recentDenied = await database_1.prisma.securityAuditLog.count({
                    where: {
                        eventType: "QR_ACTIVATION_DENIED",
                        ipAddress: ip,
                        createdAt: { gte: windowStart },
                    },
                });
                if (recentDenied >= 8) {
                    return {
                        isThreat: true,
                        threatDetails: `Automated token scanning suspected (${recentDenied + 1} denied activations within 5 minutes from ${ip})`,
                        threatScore: 90,
                    };
                }
            }
        }
        // Rule 3: Excessive Playback or DRM Denials
        if (params.eventType === "DRM_LICENSE_DENIED" || params.eventType === "PLAYBACK_DENIED") {
            if (params.activationId) {
                const recentAuthDenials = await database_1.prisma.securityAuditLog.count({
                    where: {
                        eventType: { in: ["DRM_LICENSE_DENIED", "PLAYBACK_DENIED"] },
                        activationId: params.activationId,
                        createdAt: { gte: windowStart },
                    },
                });
                if (recentAuthDenials >= 4) {
                    return {
                        isThreat: true,
                        threatDetails: `Session hijacking / expired token replay attack detected on activation ${params.activationId}`,
                        threatScore: 80,
                    };
                }
            }
        }
        // Rule 4: Rate Limit Exceeded
        if (params.eventType === "RATE_LIMIT_EXCEEDED") {
            return {
                isThreat: true,
                threatDetails: `API rate limit threshold breached on endpoint ${params.endpoint || "general"}`,
                threatScore: 70,
            };
        }
        return { isThreat: false };
    }
    /**
     * Aggregates threat intelligence metrics for the Security Operations Dashboard (SOC).
     */
    async getThreatMetrics() {
        const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalThreats, failedLogins, deniedActivations, deniedCheckpoints, deniedDrm, rateLimitEvents,] = await Promise.all([
            database_1.prisma.securityAuditLog.count({ where: { isThreat: true, createdAt: { gte: past24h } } }),
            database_1.prisma.securityAuditLog.count({ where: { eventType: "LOGIN_FAILED", createdAt: { gte: past24h } } }),
            database_1.prisma.securityAuditLog.count({ where: { eventType: "QR_ACTIVATION_DENIED", createdAt: { gte: past24h } } }),
            database_1.prisma.verification.count({ where: { result: "DENIED", createdAt: { gte: past24h } } }),
            database_1.prisma.securityAuditLog.count({ where: { eventType: "DRM_LICENSE_DENIED", createdAt: { gte: past24h } } }),
            database_1.prisma.securityAuditLog.count({ where: { eventType: "RATE_LIMIT_EXCEEDED", createdAt: { gte: past24h } } }),
        ]);
        let threatLevel = "LOW";
        if (totalThreats > 25 || failedLogins > 50) {
            threatLevel = "CRITICAL";
        }
        else if (totalThreats > 10 || failedLogins > 20) {
            threatLevel = "HIGH";
        }
        else if (totalThreats > 0 || failedLogins > 5) {
            threatLevel = "ELEVATED";
        }
        return {
            threatLevel,
            totalThreats24h: totalThreats,
            failedLogins24h: failedLogins,
            deniedActivations24h: deniedActivations,
            deniedCheckpoints24h: deniedCheckpoints,
            deniedDrm24h: deniedDrm,
            rateLimitEvents24h: rateLimitEvents,
        };
    }
}
exports.ThreatDetector = ThreatDetector;
exports.threatDetector = new ThreatDetector();
