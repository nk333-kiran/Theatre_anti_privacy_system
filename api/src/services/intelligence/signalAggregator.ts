import { prisma } from "@antipiracy/database";
import { EvaluatedSignal } from "./threatScoringEngine";

export interface SignalQueryContext {
  theatreId?: string;
  showId?: string;
  movieId?: string;
  playbackSessionId?: string;
  windowMinutes?: number;
}

export class SignalAggregator {
  /**
   * Aggregates threat indicators across platform telemetry for a given scope
   */
  public async collectSignals(context: SignalQueryContext): Promise<EvaluatedSignal[]> {
    const windowMs = (context.windowMinutes || 60) * 60 * 1000;
    const since = new Date(Date.now() - windowMs);
    const signals: EvaluatedSignal[] = [];

    // 1. Audit Logs (Failed logins, suspicious activity, rate limits)
    const threatLogs = await prisma.securityAuditLog.findMany({
      where: {
        isThreat: true,
        theatreId: context.theatreId || undefined,
        showId: context.showId || undefined,
        createdAt: { gte: since },
      },
      take: 50,
    });

    const failedLogins = threatLogs.filter((l) => l.eventType === "LOGIN_FAILED").length;
    if (failedLogins >= 3) {
      signals.push({
        source: "AUTH_AUDIT",
        eventType: "CREDENTIAL_SPIKE",
        weight: Math.min(35, failedLogins * 6),
        confidence: 90,
        description: `${failedLogins} repeated authentication failures detected in window`,
      });
    }

    const rateLimits = threatLogs.filter((l) => l.eventType === "RATE_LIMIT_EXCEEDED").length;
    if (rateLimits >= 2) {
      signals.push({
        source: "RATE_LIMITER",
        eventType: "BURST_EXCEEDED",
        weight: Math.min(30, rateLimits * 8),
        confidence: 85,
        description: `${rateLimits} rate limit breaches triggered by client/origin`,
      });
    }

    // 2. Playback Session Heartbeats & Terminations
    const terminatedSessions = await prisma.playbackSession.count({
      where: {
        theatreId: context.theatreId || undefined,
        showId: context.showId || undefined,
        status: "TERMINATED",
        updatedAt: { gte: since },
      },
    });

    if (terminatedSessions > 0) {
      signals.push({
        source: "PLAYBACK_ENGINE",
        eventType: "SESSION_REVOKED",
        weight: Math.min(45, terminatedSessions * 15),
        confidence: 95,
        description: `${terminatedSessions} playback sessions forcibly terminated due to security hold`,
      });
    }

    // 3. DRM Licensing Denials & Revocations
    const revokedLicenses = await prisma.drmLicense.count({
      where: {
        theatreId: context.theatreId || undefined,
        showId: context.showId || undefined,
        status: { in: ["REVOKED", "DENIED"] },
        updatedAt: { gte: since },
      },
    });

    if (revokedLicenses > 0) {
      signals.push({
        source: "DRM_LICENSE_SERVER",
        eventType: "DRM_KEY_DENIED",
        weight: Math.min(50, revokedLicenses * 20),
        confidence: 95,
        description: `${revokedLicenses} DRM license requests denied or revoked`,
      });
    }

    // 4. Staff Security Checkpoint Denials
    const deniedVerifications = await prisma.verification.count({
      where: {
        theatreId: context.theatreId || undefined,
        showId: context.showId || undefined,
        result: "DENIED",
        createdAt: { gte: since },
      },
    });

    if (deniedVerifications >= 2) {
      signals.push({
        source: "CHECKPOINT_SCANNER",
        eventType: "ADMISSION_DENIED",
        weight: Math.min(30, deniedVerifications * 10),
        confidence: 90,
        description: `${deniedVerifications} ticket admission attempts denied at auditorium checkpoint`,
      });
    }

    // 5. Forensic Watermark Leaks
    if (context.showId || context.playbackSessionId) {
      const forensicMatches = await prisma.forensicEvidence.findMany({
        where: {
          showId: context.showId || undefined,
          playbackSessionId: context.playbackSessionId || undefined,
        },
        take: 5,
      });

      if (forensicMatches.length > 0) {
        signals.push({
          source: "WATERMARK_FORENSICS",
          eventType: "WATERMARK_IDENTIFIED",
          weight: 65,
          confidence: forensicMatches[0].confidenceScore || 95,
          description: `Forensic watermark matched to seat ${forensicMatches[0].seatNumber || "UNKNOWN"}`,
        });
      }
    }

    return signals;
  }
}

export const signalAggregator = new SignalAggregator();
