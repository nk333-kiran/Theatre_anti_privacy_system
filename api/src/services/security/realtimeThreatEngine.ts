import { Response } from "express";
import crypto from "crypto";
import {
  prisma,
  IncidentSeverity,
  SecurityIncidentStatus,
  IncidentSource,
  ThreatAlertStatus,
} from "@antipiracy/database";
import { logger } from "../logging/logger";

export interface LiveStreamClient {
  id: string;
  res: Response;
  userId?: string;
  role?: string;
  connectedAt: Date;
}

export interface NormalizedThreatAlert {
  id: string;
  alertType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  confidence: number;
  theatreId?: string | null;
  showId?: string | null;
  activationId?: string | null;
  playbackSessionId?: string | null;
  description: string;
  detectionReason: string;
  recommendedResponse: string;
  timestamp: string;
}

export interface SecurityScorecard {
  posture: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL";
  activeIncidentsCount: number;
  criticalThreatsCount: number;
  activePlaybacksCount: number;
  drmDenialsCount: number;
  verificationDenialsCount: number;
  suspiciousSessionsCount: number;
  automatedActionsCount: number;
  openInvestigationsCount: number;
  timestamp: string;
}

class RealtimeThreatEngine {
  private sseClients: Map<string, LiveStreamClient> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Register a connected SSE client stream
   */
  public registerClient(client: LiveStreamClient): void {
    this.sseClients.set(client.id, client);
    logger.info(`[SSE] Connected live security stream client: ${client.id} (Total: ${this.sseClients.size})`);

    // Send initial connection handshake and posture snapshot
    this.sendEventToClient(client, "connected", {
      clientId: client.id,
      connectedAt: client.connectedAt.toISOString(),
      message: "Connected to Real-Time Anti-Piracy Live Stream",
    });
  }

  /**
   * Remove a disconnected SSE client
   */
  public removeClient(clientId: string): void {
    if (this.sseClients.has(clientId)) {
      this.sseClients.delete(clientId);
      logger.info(`[SSE] Disconnected live security stream client: ${clientId} (Remaining: ${this.sseClients.size})`);
    }
  }

  /**
   * Broadcast an event to all authenticated SSE clients
   */
  public broadcast(eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.sseClients.entries()) {
      try {
        client.res.write(payload);
      } catch (err) {
        logger.warn(`[SSE] Failed writing to client ${id}. Removing client.`);
        this.removeClient(id);
      }
    }
  }

  /**
   * Send an event to a single client
   */
  private sendEventToClient(client: LiveStreamClient, eventType: string, data: any): void {
    try {
      client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      this.removeClient(client.id);
    }
  }

  /**
   * Keep connections alive with standard SSE comments
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [id, client] of this.sseClients.entries()) {
        try {
          client.res.write(`: heartbeat ${Date.now()}\n\n`);
        } catch (err) {
          this.removeClient(id);
        }
      }
    }, 15000);
  }

  /**
   * Deterministic multi-signal risk calculation (0 to 100)
   */
  public calculateRiskScore(factors: {
    failedVerifications?: number;
    failedActivations?: number;
    tokenReplays?: number;
    drmDenials?: number;
    screenshotAttempts?: number;
    revokedTokenReuses?: number;
    concurrentAbnormalSessions?: number;
  }): { score: number; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (factors.failedVerifications && factors.failedVerifications > 0) {
      const pts = Math.min(factors.failedVerifications * 10, 30);
      score += pts;
      reasons.push(`${factors.failedVerifications} checkpoint verification denials (+${pts})`);
    }

    if (factors.failedActivations && factors.failedActivations > 0) {
      const pts = Math.min(factors.failedActivations * 10, 30);
      score += pts;
      reasons.push(`${factors.failedActivations} QR activation denials (+${pts})`);
    }

    if (factors.tokenReplays && factors.tokenReplays > 0) {
      const pts = Math.min(factors.tokenReplays * 30, 60);
      score += pts;
      reasons.push(`${factors.tokenReplays} token replay attempts (+${pts})`);
    }

    if (factors.drmDenials && factors.drmDenials > 0) {
      const pts = Math.min(factors.drmDenials * 20, 40);
      score += pts;
      reasons.push(`${factors.drmDenials} DRM license authorization denials (+${pts})`);
    }

    if (factors.screenshotAttempts && factors.screenshotAttempts > 0) {
      const pts = Math.min(factors.screenshotAttempts * 15, 45);
      score += pts;
      reasons.push(`${factors.screenshotAttempts} screen capture/inspection events (+${pts})`);
    }

    if (factors.revokedTokenReuses && factors.revokedTokenReuses > 0) {
      const pts = Math.min(factors.revokedTokenReuses * 30, 60);
      score += pts;
      reasons.push(`${factors.revokedTokenReuses} revoked token re-use attempts (+${pts})`);
    }

    if (factors.concurrentAbnormalSessions && factors.concurrentAbnormalSessions > 0) {
      const pts = Math.min(factors.concurrentAbnormalSessions * 25, 50);
      score += pts;
      reasons.push(`Abnormal concurrent playback sessions (+${pts})`);
    }

    // Clamp score to 0 - 100
    const finalScore = Math.min(Math.max(score, 5), 100);

    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (finalScore >= 75) severity = "CRITICAL";
    else if (finalScore >= 50) severity = "HIGH";
    else if (finalScore >= 25) severity = "MEDIUM";

    return { score: finalScore, severity, reasons };
  }

  /**
   * Process a live telemetry signal and trigger automated alert/incident creation if thresholds are breached
   */
  public async ingestThreatSignal(params: {
    alertType: string;
    description: string;
    theatreId?: string;
    showId?: string;
    activationId?: string;
    playbackSessionId?: string;
    factors: {
      failedVerifications?: number;
      failedActivations?: number;
      tokenReplays?: number;
      drmDenials?: number;
      screenshotAttempts?: number;
      revokedTokenReuses?: number;
      concurrentAbnormalSessions?: number;
    };
  }): Promise<NormalizedThreatAlert> {
    const { score, severity, reasons } = this.calculateRiskScore(params.factors);

    let recommendedResponse = "OBSERVE";
    if (severity === "CRITICAL") recommendedResponse = "TERMINATE_SESSION_AND_REVOKE_DRM";
    else if (severity === "HIGH") recommendedResponse = "REVOKE_DRM_LICENSE";
    else if (severity === "MEDIUM") recommendedResponse = "FLAG_AUDITORIUM_FOR_INSPECTION";

    // Persist ThreatAlert record
    const alert = await prisma.threatAlert.create({
      data: {
        alertType: params.alertType,
        severity: severity as IncidentSeverity,
        riskScore: score,
        theatreId: params.theatreId,
        showId: params.showId,
        activationId: params.activationId,
        playbackSessionId: params.playbackSessionId,
        description: params.description,
        status: "ACTIVE",
      },
    });

    const normalizedAlert: NormalizedThreatAlert = {
      id: alert.id,
      alertType: alert.alertType,
      severity,
      riskScore: score,
      confidence: Math.min(score + 10, 98),
      theatreId: alert.theatreId,
      showId: alert.showId,
      activationId: alert.activationId,
      playbackSessionId: alert.playbackSessionId,
      description: alert.description,
      detectionReason: reasons.join("; ") || "Multi-signal threshold evaluation",
      recommendedResponse,
      timestamp: alert.detectedAt.toISOString(),
    };

    // Broadcast threat alert to all live SSE dashboards
    this.broadcast("threat_alert", normalizedAlert);

    return normalizedAlert;
  }

  /**
   * Compile high-level real-time security posture scorecard for executive SOC view
   */
  public async getScorecard(): Promise<SecurityScorecard> {
    const [
      activeIncidentsCount,
      criticalThreatsCount,
      activePlaybacksCount,
      drmDenialsCount,
      verificationDenialsCount,
      suspiciousSessionsCount,
      automatedActionsCount,
      openInvestigationsCount,
    ] = await Promise.all([
      prisma.securityIncident.count({
        where: { status: { in: ["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED"] } },
      }),
      prisma.threatAlert.count({
        where: { severity: "CRITICAL", status: "ACTIVE" },
      }),
      prisma.playbackSession.count({
        where: { status: "ACTIVE" },
      }),
      prisma.drmLicense.count({
        where: { status: "DENIED" },
      }),
      prisma.verification.count({
        where: { result: "DENIED" },
      }),
      prisma.playbackSession.count({
        where: { status: "TERMINATED" },
      }),
      prisma.incidentAction.count(),
      prisma.piracyIncident.count({
        where: { status: { in: ["DETECTED", "TRIAGED", "INVESTIGATING", "CONFIRMED"] } },
      }),
    ]);

    let posture: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL" = "NORMAL";
    if (criticalThreatsCount > 0 || activeIncidentsCount >= 5) {
      posture = "CRITICAL";
    } else if (activeIncidentsCount >= 2 || drmDenialsCount > 5) {
      posture = "HIGH";
    } else if (verificationDenialsCount > 5 || suspiciousSessionsCount > 0) {
      posture = "ELEVATED";
    }

    return {
      posture,
      activeIncidentsCount,
      criticalThreatsCount,
      activePlaybacksCount,
      drmDenialsCount,
      verificationDenialsCount,
      suspiciousSessionsCount,
      automatedActionsCount,
      openInvestigationsCount,
      timestamp: new Date().toISOString(),
    };
  }
}

export const realtimeThreatEngine = new RealtimeThreatEngine();
