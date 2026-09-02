import { prisma, SecurityEventType, SecuritySeverity } from "@antipiracy/database";
import { ThreatIntelIndicatorType } from "@prisma/client";
import { realtimeEventBus } from "../realtime/realtimeEventBus";
import { SecurityAuditService } from "../security/securityAuditService";

export interface CorrelationMatchResult {
  matchCount: number;
  matches: Array<{
    matchId: string;
    indicatorValue: string;
    correlationType: string;
    theatreId?: string | null;
    movieId?: string | null;
    playbackSessionId?: string | null;
    confidence: number;
  }>;
}

export class ThreatIntelCorrelationEngine {
  /**
   * Scans active external indicators against internal system telemetry.
   * Advisory-first: Generates ThreatIntelMatch records and security audit logs without destructive actions.
   */
  public static async runCorrelationScan(targetIndicatorId?: string): Promise<CorrelationMatchResult> {
    const indicators = targetIndicatorId
      ? await prisma.threatIntelIndicator.findMany({
          where: { id: targetIndicatorId, status: "ACTIVE" },
        })
      : await prisma.threatIntelIndicator.findMany({
          where: { status: "ACTIVE" },
          take: 500,
        });

    const recordedMatches: Array<{
      matchId: string;
      indicatorValue: string;
      correlationType: string;
      theatreId?: string | null;
      movieId?: string | null;
      playbackSessionId?: string | null;
      confidence: number;
    }> = [];

    for (const ind of indicators) {
      if (ind.indicatorType === ThreatIntelIndicatorType.IP_ADDRESS) {
        // 1. Correlate IP against SecurityAuditLog
        const matchingAuditLogs = await prisma.securityAuditLog.findMany({
          where: { ipAddress: ind.value },
          take: 5,
          orderBy: { createdAt: "desc" },
        });

        for (const log of matchingAuditLogs) {
          const match = await this.recordMatch({
            indicatorId: ind.id,
            correlationType: "IP_AUDIT_MATCH",
            correlationDetails: `Internal security audit log event '${log.eventType}' matched external threat IP`,
            theatreId: log.theatreId,
            securityAuditLogId: log.id,
            confidence: Math.min(95, ind.confidenceScore + 10),
          });
          if (match) {
            recordedMatches.push({
              matchId: match.id,
              indicatorValue: ind.value,
              correlationType: "IP_AUDIT_MATCH",
              theatreId: log.theatreId,
              confidence: match.confidence,
            });
          }
        }

        // 2. Correlate IP against active/recent PlaybackSession
        const matchingSessions = await prisma.playbackSession.findMany({
          where: { ipAddress: ind.value },
          take: 5,
          orderBy: { createdAt: "desc" },
        });

        for (const sess of matchingSessions) {
          const match = await this.recordMatch({
            indicatorId: ind.id,
            correlationType: "PLAYBACK_SESSION_IP",
            correlationDetails: `Playback session '${sess.id}' streaming from external flagged IP`,
            theatreId: sess.theatreId,
            playbackSessionId: sess.id,
            confidence: Math.min(95, ind.confidenceScore + 15),
          });
          if (match) {
            recordedMatches.push({
              matchId: match.id,
              indicatorValue: ind.value,
              correlationType: "PLAYBACK_SESSION_IP",
              theatreId: sess.theatreId,
              playbackSessionId: sess.id,
              confidence: match.confidence,
            });
          }
        }
      } else if (ind.indicatorType === ThreatIntelIndicatorType.FILE_HASH) {
        // 3. Correlate File Hash against EvidenceArtifact
        const matchingArtifacts = await prisma.evidenceArtifact.findMany({
          where: { sha256Hash: ind.value },
          include: { evidenceRecord: true },
          take: 5,
        });

        for (const art of matchingArtifacts) {
          const match = await this.recordMatch({
            indicatorId: ind.id,
            correlationType: "WATERMARK_HASH_CORRELATION",
            correlationDetails: `Vaulted evidence artifact '${art.artifactName}' matches external file hash`,
            evidenceRecordId: art.evidenceRecordId,
            theatreId: art.evidenceRecord.theatreId,
            movieId: art.evidenceRecord.movieId,
            confidence: 90,
          });
          if (match) {
            recordedMatches.push({
              matchId: match.id,
              indicatorValue: ind.value,
              correlationType: "WATERMARK_HASH_CORRELATION",
              theatreId: art.evidenceRecord.theatreId,
              movieId: art.evidenceRecord.movieId,
              confidence: match.confidence,
            });
          }
        }
      }
    }

    return {
      matchCount: recordedMatches.length,
      matches: recordedMatches,
    };
  }

  /**
   * Records a correlation match idempotently and triggers advisory notifications.
   */
  private static async recordMatch(params: {
    indicatorId: string;
    correlationType: string;
    correlationDetails: string;
    theatreId?: string | null;
    movieId?: string | null;
    playbackSessionId?: string | null;
    evidenceRecordId?: string | null;
    securityAuditLogId?: string | null;
    confidence: number;
  }) {
    // Check if match already recorded recently
    const existing = await prisma.threatIntelMatch.findFirst({
      where: {
        indicatorId: params.indicatorId,
        correlationType: params.correlationType,
        playbackSessionId: params.playbackSessionId ?? undefined,
        theatreId: params.theatreId ?? undefined,
      },
    });

    if (existing) return existing;

    const match = await prisma.threatIntelMatch.create({
      data: {
        indicatorId: params.indicatorId,
        correlationType: params.correlationType,
        correlationDetails: params.correlationDetails,
        theatreId: params.theatreId,
        movieId: params.movieId,
        playbackSessionId: params.playbackSessionId,
        evidenceRecordId: params.evidenceRecordId,
        securityAuditLogId: params.securityAuditLogId,
        confidence: params.confidence,
      },
    });

    // Advisory Real-Time Notification
    realtimeEventBus.publish({
      eventType: "THREAT_CORRELATION_ALERT",
      source: "THREAT_INTEL_CORRELATION",
      severity: "HIGH",
      theatreId: params.theatreId ?? undefined,
      movieId: params.movieId ?? undefined,
      playbackSessionId: params.playbackSessionId ?? undefined,
      metadata: {
        matchId: match.id,
        correlationType: params.correlationType,
        confidence: params.confidence,
        details: params.correlationDetails,
      },
    });

    // Security Audit Log
    await SecurityAuditService.logEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: params.confidence >= 80 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
      theatreId: params.theatreId ?? undefined,
      actionSummary: `External Threat Intelligence Match: ${params.correlationType}`,
      metadata: {
        matchId: match.id,
        indicatorId: params.indicatorId,
        confidence: params.confidence,
      },
    });

    return match;
  }

  /**
   * Retrieves list of matches with tenant-scoping.
   */
  public static async listMatches(options?: {
    theatreId?: string;
    movieId?: string;
    take?: number;
  }) {
    const where: any = {};
    if (options?.theatreId) where.theatreId = options.theatreId;
    if (options?.movieId) where.movieId = options.movieId;

    return await prisma.threatIntelMatch.findMany({
      where,
      orderBy: { matchedAt: "desc" },
      take: options?.take || 100,
      include: {
        indicator: {
          include: { source: true },
        },
        theatre: true,
        movie: true,
        playbackSession: true,
        campaign: true,
        investigationCase: true,
        evidenceRecord: true,
      },
    });
  }
}
