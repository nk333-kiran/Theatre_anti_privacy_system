import { SanitizedRealtimeEvent } from "./realtimeEventBus";
import { logger } from "../logging/logger";

export interface CorrelatedThreatCluster {
  clusterId: string;
  correlationId: string;
  clusterType: "CREDENTIAL_TOKEN_ATTACK" | "QR_ABUSE_CLUSTER" | "PLAYBACK_PIRACY_ACTIVITY" | "FORENSIC_WATERMARK_LEAK" | "COORDINATED_ATTACK";
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // 0 - 100
  theatreId?: string;
  showId?: string;
  movieId?: string;
  activationId?: string;
  playbackSessionId?: string;
  events: SanitizedRealtimeEvent[];
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export class EventCorrelationEngine {
  private activeEventsWindow: SanitizedRealtimeEvent[] = [];
  private readonly WINDOW_TTL_MS = 15 * 60 * 1000; // 15-minute sliding window

  /**
   * Ingests an event into the correlation window and prunes expired events
   */
  public addEvent(event: SanitizedRealtimeEvent) {
    const now = Date.now();
    this.activeEventsWindow.push(event);

    // Prune events older than sliding window
    this.activeEventsWindow = this.activeEventsWindow.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime();
      return now - eventTime <= this.WINDOW_TTL_MS;
    });
  }

  /**
   * Correlates multi-vector threat patterns from the sliding event window
   */
  public correlateThreats(): CorrelatedThreatCluster[] {
    const clusters: CorrelatedThreatCluster[] = [];
    const groupedByVenue: Record<string, SanitizedRealtimeEvent[]> = {};

    for (const evt of this.activeEventsWindow) {
      const venueKey = evt.showId || evt.theatreId || "GLOBAL";
      if (!groupedByVenue[venueKey]) groupedByVenue[venueKey] = [];
      groupedByVenue[venueKey].push(evt);
    }

    for (const [venueKey, events] of Object.entries(groupedByVenue)) {
      // 1. Check for Playback Piracy Pattern: DRM Denials + Session Revocation + Screenshot
      const drmDenials = events.filter((e) => e.eventType === "DRM_LICENSE_DENIED" || e.eventType === "DRM_LICENSE_REVOKED");
      const streamRevocations = events.filter((e) => e.eventType === "PLAYBACK_TERMINATED" || e.eventType === "PLAYBACK_DENIED");
      const screenshotAttempts = events.filter((e) => e.eventType === "SCREENSHOT_ATTEMPT_DETECTED");

      if (drmDenials.length >= 1 && (streamRevocations.length >= 1 || screenshotAttempts.length >= 1)) {
        const relatedEvents = [...drmDenials, ...streamRevocations, ...screenshotAttempts];
        clusters.push({
          clusterId: `cluster_piracy_${venueKey}_${Date.now()}`,
          correlationId: relatedEvents[0].correlationId,
          clusterType: "PLAYBACK_PIRACY_ACTIVITY",
          title: "Correlated Playback Piracy Activity",
          description: `Detected ${drmDenials.length} DRM denials, ${streamRevocations.length} playback terminations, and ${screenshotAttempts.length} capture attempts.`,
          severity: "CRITICAL",
          confidence: 95,
          theatreId: relatedEvents[0].theatreId,
          showId: relatedEvents[0].showId,
          movieId: relatedEvents[0].movieId,
          playbackSessionId: relatedEvents[0].playbackSessionId,
          events: relatedEvents,
          firstDetectedAt: relatedEvents[0].timestamp,
          lastDetectedAt: relatedEvents[relatedEvents.length - 1].timestamp,
        });
      }

      // 2. Check for Credential & Token Attack: Multiple Failed Logins + Token Replay
      const loginFailures = events.filter((e) => e.eventType === "LOGIN_FAILED");
      const tokenReplays = events.filter((e) => e.eventType === "TOKEN_REPLAY");

      if (loginFailures.length >= 3 || (loginFailures.length >= 1 && tokenReplays.length >= 1)) {
        const relatedEvents = [...loginFailures, ...tokenReplays];
        clusters.push({
          clusterId: `cluster_cred_${venueKey}_${Date.now()}`,
          correlationId: relatedEvents[0].correlationId,
          clusterType: "CREDENTIAL_TOKEN_ATTACK",
          title: "Credential & Token Abuse Pattern",
          description: `Detected ${loginFailures.length} login failures and ${tokenReplays.length} token replay attempts across clients.`,
          severity: "HIGH",
          confidence: 90,
          theatreId: relatedEvents[0].theatreId,
          showId: relatedEvents[0].showId,
          events: relatedEvents,
          firstDetectedAt: relatedEvents[0].timestamp,
          lastDetectedAt: relatedEvents[relatedEvents.length - 1].timestamp,
        });
      }

      // 3. Check for QR / Ticket Checkpoint Abuse
      const qrFailures = events.filter((e) => e.eventType === "QR_ACTIVATION_DENIED");
      const checkpointDenials = events.filter((e) => e.eventType === "STAFF_VERIFICATION" && e.severity === "HIGH");

      if (qrFailures.length >= 2 || (qrFailures.length >= 1 && checkpointDenials.length >= 1)) {
        const relatedEvents = [...qrFailures, ...checkpointDenials];
        clusters.push({
          clusterId: `cluster_qr_${venueKey}_${Date.now()}`,
          correlationId: relatedEvents[0].correlationId,
          clusterType: "QR_ABUSE_CLUSTER",
          title: "Auditorium Checkpoint & QR Abuse",
          description: `Detected ${qrFailures.length} QR activation denials and ${checkpointDenials.length} checkpoint admission rejections.`,
          severity: "MEDIUM",
          confidence: 85,
          theatreId: relatedEvents[0].theatreId,
          showId: relatedEvents[0].showId,
          events: relatedEvents,
          firstDetectedAt: relatedEvents[0].timestamp,
          lastDetectedAt: relatedEvents[relatedEvents.length - 1].timestamp,
        });
      }

      // 4. Forensic Watermark Leak
      const watermarkMatches = events.filter((e) => e.eventType === "FORENSIC_WATERMARK_MATCH");
      if (watermarkMatches.length >= 1) {
        clusters.push({
          clusterId: `cluster_wm_${venueKey}_${Date.now()}`,
          correlationId: watermarkMatches[0].correlationId,
          clusterType: "FORENSIC_WATERMARK_LEAK",
          title: "Attributed Forensic Watermark Leak Match",
          description: `Watermark decoder identified physical auditorium seat allocation from leaked video segment.`,
          severity: "CRITICAL",
          confidence: 98,
          theatreId: watermarkMatches[0].theatreId,
          showId: watermarkMatches[0].showId,
          movieId: watermarkMatches[0].movieId,
          playbackSessionId: watermarkMatches[0].playbackSessionId,
          events: watermarkMatches,
          firstDetectedAt: watermarkMatches[0].timestamp,
          lastDetectedAt: watermarkMatches[watermarkMatches.length - 1].timestamp,
        });
      }
    }

    return clusters;
  }

  /**
   * Clears the event window (for testing or reset)
   */
  public clearWindow() {
    this.activeEventsWindow = [];
  }
}

export const eventCorrelationEngine = new EventCorrelationEngine();
