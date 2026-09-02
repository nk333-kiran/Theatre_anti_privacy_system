import { Request, Response, NextFunction } from "express";
import { prisma } from "@antipiracy/database";
import { metricsService } from "../services/observability/metricsService";
import { threatDetector } from "../services/security/threatDetector";
import { drmServiceManager } from "../services/drm/drmManager";
import { activeStorageProvider } from "../services/storage/storageFactory";
import { ffmpegService } from "../services/videoProcessing/ffmpegService";
import { maintenanceState } from "../middleware/maintenanceMode";
import { backupService } from "../services/backup/backupService";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { env } from "../config/envValidator";
import { ApiResponse } from "../types";

/**
 * GET /api/operations/health
 * Comprehensive operational health view for Admin SOC / DevOps
 */
export const getOperationsHealth = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    let dbStatus = "HEALTHY";
    let dbPingMs = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbPingMs = Date.now() - dbStart;
    } catch {
      dbStatus = "DOWN";
    }

    const [drmDiag, storageDiag, ffmpegDiag, threatMetrics] = await Promise.all([
      drmServiceManager.getSafeStatus().catch(() => ({
        configured: false,
        provider: "mock",
        status: "NOT_CONFIGURED" as const,
        isDevelopmentOnly: true,
        supportedSchemes: [],
        capabilities: { widevine: false, playready: false, fairplay: false, hardwareDrmReady: false },
        serverTimestamp: new Date().toISOString(),
      })),
      activeStorageProvider.getDiagnostics().catch(() => ({
        driver: "local" as const,
        configured: false,
        status: "ERROR" as const,
        basePathOrBucket: "Error",
        isCloudStorage: false,
        details: {},
      })),
      ffmpegService.getDiagnostics().catch(() => ({
        available: false,
        error: "FFmpeg probe failed",
      })),
      threatDetector.getThreatMetrics().catch(() => ({
        threatLevel: "LOW" as const,
        totalThreats24h: 0,
        failedLogins24h: 0,
        deniedActivations24h: 0,
        deniedCheckpoints24h: 0,
        deniedDrm24h: 0,
        rateLimitEvents24h: 0,
      })),
    ]);

    const maintenance = maintenanceState.getStatus();

    res.status(200).json({
      success: true,
      data: {
        systemHealth: {
          api: "HEALTHY",
          database: dbStatus,
          drm: drmDiag.status === "READY" ? "HEALTHY" : drmDiag.status === "NOT_CONFIGURED" ? "DEGRADED" : "DOWN",
          videoDelivery: ffmpegDiag.available ? "HEALTHY" : "DEGRADED",
          storage: storageDiag.status === "READY" ? "HEALTHY" : "DOWN",
        },
        infrastructure: {
          environment: env.NODE_ENV,
          version: env.APP_VERSION,
          databasePingMs: dbPingMs,
          drmProvider: drmDiag.provider,
          storageDriver: storageDiag.driver,
          maintenanceMode: maintenance.enabled,
        },
        threatMetrics,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/operations/metrics
 * Performance and platform telemetry metrics
 */
export const getOperationsMetrics = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const metrics = metricsService.getMetrics();

    const [activePlaybackSessions, activeActivations, totalIssuedLicenses, totalSecurityEvents] =
      await Promise.all([
        prisma.playbackSession.count({ where: { status: "ACTIVE" } }).catch(() => 0),
        prisma.activation.count({ where: { status: "ACTIVE" } }).catch(() => 0),
        prisma.drmLicense.count({ where: { status: "ACTIVE" } }).catch(() => 0),
        prisma.securityAuditLog.count().catch(() => 0),
      ]);

    res.status(200).json({
      success: true,
      data: {
        performance: metrics,
        platform: {
          activePlaybackSessions,
          activeActivations,
          activeDrmLicenses: totalIssuedLicenses,
          totalSecurityEvents,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/operations/dependencies
 * Deep dependency status
 */
export const getOperationsDependencies = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    let dbStatus = "HEALTHY";
    let dbPingMs = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbPingMs = Date.now() - dbStart;
    } catch {
      dbStatus = "UNHEALTHY";
    }

    const [storageDiag, drmDiag, ffmpegDiag] = await Promise.all([
      activeStorageProvider.getDiagnostics(),
      drmServiceManager.getSafeStatus(),
      ffmpegService.getDiagnostics(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        database: {
          status: dbStatus,
          provider: "PostgreSQL",
          pingMs: dbPingMs,
        },
        drm: {
          status: drmDiag.status,
          provider: drmDiag.provider,
          capabilities: drmDiag.capabilities,
          isDevelopmentOnly: drmDiag.isDevelopmentOnly,
        },
        videoProcessing: ffmpegDiag,
        storage: storageDiag,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/operations/maintenance
 * Admin toggle for Maintenance Mode
 */
export const toggleMaintenanceMode = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { enabled, message } = req.body;
    const actorUser = (req as any).user;

    maintenanceState.setStatus(!!enabled, message);

    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: enabled ? "HIGH" : "INFO",
      userId: actorUser?.id,
      actorEmail: actorUser?.email,
      actorRole: actorUser?.role,
      actionSummary: `Admin ${actorUser?.email || "SYSTEM"} ${enabled ? "ENABLED" : "DISABLED"} Maintenance Mode${
        message ? `: ${message}` : ""
      }`,
    });

    res.status(200).json({
      success: true,
      message: `Maintenance Mode is now ${enabled ? "ACTIVE" : "INACTIVE"}`,
      data: maintenanceState.getStatus(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/operations/backups
 * List all recorded database backups
 */
export const listBackups = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const backups = backupService.listBackups();
    res.status(200).json({
      success: true,
      data: backups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/operations/backups/create
 * Trigger a new manual database backup
 */
export const triggerBackup = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const actorUser = (req as any).user;
    const backup = await backupService.createBackup("MANUAL", actorUser);
    res.status(201).json({
      success: true,
      message: `Database backup ${backup.id} created successfully.`,
      data: backup,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/operations/backups/:backupId/verify
 * Verify SHA-256 integrity of an existing backup
 */
export const verifyBackup = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { backupId } = req.params;
    const result = backupService.verifyBackupIntegrity(backupId);
    res.status(200).json({
      success: true,
      message: result.verified
        ? `Backup ${backupId} integrity verified successfully.`
        : `Backup ${backupId} failed integrity check!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/operations/backups/prune
 * Prune backups older than retention policy
 */
export const pruneBackups = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { retentionDays } = req.body;
    const result = backupService.pruneExpiredBackups(retentionDays ? Number(retentionDays) : undefined);
    res.status(200).json({
      success: true,
      message: `Pruned ${result.prunedCount} expired backups (${(result.freedBytes / 1024).toFixed(1)} KB freed).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/operations/disaster-recovery
 * Disaster Recovery and RPO/RTO metrics
 */
export const getDisasterRecoveryStatus = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const drStatus = backupService.getDisasterRecoveryStatus();
    res.status(200).json({
      success: true,
      data: drStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/operations/scaling
 * Real-time auto-scaling, queue depth, and traffic pressure telemetry
 */
export const getScalingTelemetry = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const mem = process.memoryUsage();
    const [activePlaybacks, activeSessionsCount, drmLicensesCount] = await Promise.all([
      prisma.playbackSession.count({ where: { status: "ACTIVE" } }),
      prisma.playbackSession.count(),
      prisma.drmLicense.count({ where: { status: "ISSUED" } }),
    ]);

    const metrics = metricsService.getMetrics();

    // Determine Traffic Posture: NORMAL | ELEVATED | HIGH | CRITICAL
    let trafficPosture: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL" = "NORMAL";
    if (metrics.errorRatePercent > 10 || metrics.averageLatencyMs > 500) {
      trafficPosture = "CRITICAL";
    } else if (metrics.errorRatePercent > 5 || metrics.averageLatencyMs > 250) {
      trafficPosture = "HIGH";
    } else if (activePlaybacks > 20 || metrics.requestsPerMinute > 100) {
      trafficPosture = "ELEVATED";
    }

    res.status(200).json({
      success: true,
      data: {
        trafficPosture,
        activeInstances: 2,
        requestsPerSecond: parseFloat((metrics.requestsPerMinute / 60).toFixed(2)),
        activePlaybacks,
        activeSessionsCount,
        drmLicensesCount,
        errorRatePercent: metrics.errorRatePercent,
        averageLatencyMs: metrics.averageLatencyMs,
        p95LatencyMs: metrics.p95LatencyMs,
        memoryUsageMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/idempotency/check
 * Dedicated endpoint to check idempotency key status
 */
export const checkIdempotencyEndpoint = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.body;
    if (!key) {
      res.status(400).json({ success: false, message: "Idempotency key required" });
      return;
    }

    const record = await prisma.idempotencyRecord.findUnique({ where: { key } });
    res.status(200).json({
      success: true,
      data: {
        exists: !!record,
        status: record?.status,
        statusCode: record?.statusCode,
        createdAt: record?.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

