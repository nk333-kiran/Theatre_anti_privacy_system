"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelCorrelationEngine = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const realtimeEventBus_1 = require("../realtime/realtimeEventBus");
const securityAuditService_1 = require("../security/securityAuditService");
class ThreatIntelCorrelationEngine {
    /**
     * Scans active external indicators against internal system telemetry.
     * Advisory-first: Generates ThreatIntelMatch records and security audit logs without destructive actions.
     */
    static async runCorrelationScan(targetIndicatorId) {
        const indicators = targetIndicatorId
            ? await database_1.prisma.threatIntelIndicator.findMany({
                where: { id: targetIndicatorId, status: "ACTIVE" },
            })
            : await database_1.prisma.threatIntelIndicator.findMany({
                where: { status: "ACTIVE" },
                take: 500,
            });
        const recordedMatches = [];
        for (const ind of indicators) {
            if (ind.indicatorType === client_1.ThreatIntelIndicatorType.IP_ADDRESS) {
                // 1. Correlate IP against SecurityAuditLog
                const matchingAuditLogs = await database_1.prisma.securityAuditLog.findMany({
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
                const matchingSessions = await database_1.prisma.playbackSession.findMany({
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
            }
            else if (ind.indicatorType === client_1.ThreatIntelIndicatorType.FILE_HASH) {
                // 3. Correlate File Hash against EvidenceArtifact
                const matchingArtifacts = await database_1.prisma.evidenceArtifact.findMany({
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
    static async recordMatch(params) {
        // Check if match already recorded recently
        const existing = await database_1.prisma.threatIntelMatch.findFirst({
            where: {
                indicatorId: params.indicatorId,
                correlationType: params.correlationType,
                playbackSessionId: params.playbackSessionId ?? undefined,
                theatreId: params.theatreId ?? undefined,
            },
        });
        if (existing)
            return existing;
        const match = await database_1.prisma.threatIntelMatch.create({
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
        realtimeEventBus_1.realtimeEventBus.publish({
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
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity: params.confidence >= 80 ? database_1.SecuritySeverity.CRITICAL : database_1.SecuritySeverity.HIGH,
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
    static async listMatches(options) {
        const where = {};
        if (options?.theatreId)
            where.theatreId = options.theatreId;
        if (options?.movieId)
            where.movieId = options.movieId;
        return await database_1.prisma.threatIntelMatch.findMany({
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
exports.ThreatIntelCorrelationEngine = ThreatIntelCorrelationEngine;
