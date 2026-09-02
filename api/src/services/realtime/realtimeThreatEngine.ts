import { prisma } from "@antipiracy/database";
import { realtimeEventBus, SanitizedRealtimeEvent } from "./realtimeEventBus";
import { eventCorrelationEngine } from "./eventCorrelationEngine";
import { riskEscalationEngine } from "./riskEscalationEngine";
import { logger } from "../logging/logger";

export class RealtimeThreatEngine {
  private lastNotificationMap: Map<string, number> = new Map();
  private readonly NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown per entity cluster

  constructor() {
    this.init();
  }

  private init() {
    realtimeEventBus.on("security_event", async (event: SanitizedRealtimeEvent) => {
      try {
        await this.processEvent(event);
      } catch (err: any) {
        logger.error(`[RealtimeThreatEngine] Error processing event ${event.eventId}: ${err.message}`);
      }
    });
  }

  /**
   * Processes a single realtime event through correlation and risk escalation
   */
  public async processEvent(event: SanitizedRealtimeEvent) {
    // 1. Add to correlation window
    eventCorrelationEngine.addEvent(event);

    // 2. Escalate risk
    const escalatedStates = await riskEscalationEngine.escalateRisk(event);

    // 3. Evaluate correlated clusters
    const clusters = eventCorrelationEngine.correlateThreats();

    for (const cluster of clusters) {
      if (cluster.severity === "CRITICAL" || cluster.severity === "HIGH") {
        await this.handleHighSeverityThreat(cluster);
      }
    }
  }

  /**
   * Creates automated response recommendations and notifications with deduplication cooldown
   */
  private async handleHighSeverityThreat(cluster: any) {
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
    } else if (cluster.clusterType === "CREDENTIAL_TOKEN_ATTACK") {
      recommendedAction = "BLACKLIST_TOKEN";
    }

    await prisma.automatedResponse.create({
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
    await prisma.realtimeIncidentNotification.create({
      data: {
        notificationType: cluster.clusterType,
        severity: cluster.severity,
        message: `${cluster.title}: ${cluster.description}`,
        theatreId: cluster.theatreId,
        showId: cluster.showId,
        movieId: cluster.movieId,
      },
    });

    logger.info(`[RealtimeThreatEngine] Dispatched high-severity response recommendation for ${cluster.clusterType}`);
  }

  public clearCooldowns() {
    this.lastNotificationMap.clear();
  }
}

export const realtimeThreatEngine = new RealtimeThreatEngine();
