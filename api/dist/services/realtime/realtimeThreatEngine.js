"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeThreatEngine = exports.RealtimeThreatEngine = void 0;
const database_1 = require("@antipiracy/database");
const realtimeEventBus_1 = require("./realtimeEventBus");
const eventCorrelationEngine_1 = require("./eventCorrelationEngine");
const riskEscalationEngine_1 = require("./riskEscalationEngine");
const logger_1 = require("../logging/logger");
class RealtimeThreatEngine {
    lastNotificationMap = new Map();
    NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown per entity cluster
    constructor() {
        this.init();
    }
    init() {
        realtimeEventBus_1.realtimeEventBus.on("security_event", async (event) => {
            try {
                await this.processEvent(event);
            }
            catch (err) {
                logger_1.logger.error(`[RealtimeThreatEngine] Error processing event ${event.eventId}: ${err.message}`);
            }
        });
    }
    /**
     * Processes a single realtime event through correlation and risk escalation
     */
    async processEvent(event) {
        // 1. Add to correlation window
        eventCorrelationEngine_1.eventCorrelationEngine.addEvent(event);
        // 2. Escalate risk
        const escalatedStates = await riskEscalationEngine_1.riskEscalationEngine.escalateRisk(event);
        // 3. Evaluate correlated clusters
        const clusters = eventCorrelationEngine_1.eventCorrelationEngine.correlateThreats();
        for (const cluster of clusters) {
            if (cluster.severity === "CRITICAL" || cluster.severity === "HIGH") {
                await this.handleHighSeverityThreat(cluster);
            }
        }
    }
    /**
     * Creates automated response recommendations and notifications with deduplication cooldown
     */
    async handleHighSeverityThreat(cluster) {
        const dedupeKey = `${cluster.clusterType}:${cluster.showId || cluster.theatreId || "GLOBAL"}`;
        const now = Date.now();
        const lastSent = this.lastNotificationMap.get(dedupeKey);
        if (lastSent && now - lastSent < this.NOTIFICATION_COOLDOWN_MS) {
            return; // Suppress notification storm
        }
        this.lastNotificationMap.set(dedupeKey, now);
        // 1. Create Automated Response Recommendation
        let recommendedAction = "START_INVESTIGATION";
        if (cluster.clusterType === "PLAYBACK_PIRACY_ACTIVITY" || cluster.clusterType === "FORENSIC_WATERMARK_LEAK") {
            recommendedAction = "REVOKE_PLAYBACK_SESSION";
        }
        else if (cluster.clusterType === "CREDENTIAL_TOKEN_ATTACK") {
            recommendedAction = "BLACKLIST_TOKEN";
        }
        await database_1.prisma.automatedResponse.create({
            data: {
                actionType: recommendedAction,
                status: "RECOMMENDED",
                targetId: cluster.playbackSessionId || cluster.showId || cluster.theatreId,
                reason: `Generated from correlated threat: ${cluster.title} (${cluster.description})`,
                correlationId: cluster.correlationId,
                metadata: JSON.stringify({ clusterId: cluster.clusterId, confidence: cluster.confidence }),
            },
        });
        // 2. Create Notification
        await database_1.prisma.realtimeIncidentNotification.create({
            data: {
                notificationType: cluster.clusterType,
                severity: cluster.severity,
                message: `${cluster.title}: ${cluster.description}`,
                theatreId: cluster.theatreId,
                showId: cluster.showId,
                movieId: cluster.movieId,
            },
        });
        logger_1.logger.info(`[RealtimeThreatEngine] Dispatched high-severity response recommendation for ${cluster.clusterType}`);
    }
    clearCooldowns() {
        this.lastNotificationMap.clear();
    }
}
exports.RealtimeThreatEngine = RealtimeThreatEngine;
exports.realtimeThreatEngine = new RealtimeThreatEngine();
