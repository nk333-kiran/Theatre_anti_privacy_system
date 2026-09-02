"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIdempotencyEndpoint = exports.getScalingTelemetry = exports.getDisasterRecoveryStatus = exports.pruneBackups = exports.verifyBackup = exports.triggerBackup = exports.listBackups = exports.toggleMaintenanceMode = exports.getOperationsDependencies = exports.getOperationsMetrics = exports.getOperationsHealth = void 0;
const database_1 = require("@antipiracy/database");
const metricsService_1 = require("../services/observability/metricsService");
const threatDetector_1 = require("../services/security/threatDetector");
const drmManager_1 = require("../services/drm/drmManager");
const storageFactory_1 = require("../services/storage/storageFactory");
const ffmpegService_1 = require("../services/videoProcessing/ffmpegService");
const maintenanceMode_1 = require("../middleware/maintenanceMode");
const backupService_1 = require("../services/backup/backupService");
const securityAuditService_1 = require("../services/security/securityAuditService");
const envValidator_1 = require("../config/envValidator");
/**
 * GET /api/operations/health
 * Comprehensive operational health view for Admin SOC / DevOps
 */
const getOperationsHealth = async (_req, res, next) => {
    try {
        let dbStatus = "HEALTHY";
        let dbPingMs = 0;
        try {
            const dbStart = Date.now();
            await database_1.prisma.$queryRaw `SELECT 1`;
            dbPingMs = Date.now() - dbStart;
        }
        catch {
            dbStatus = "DOWN";
        }
        const [drmDiag, storageDiag, ffmpegDiag, threatMetrics] = await Promise.all([
            drmManager_1.drmServiceManager.getSafeStatus().catch(() => ({
                configured: false,
                provider: "mock",
                status: "NOT_CONFIGURED",
                isDevelopmentOnly: true,
                supportedSchemes: [],
                capabilities: { widevine: false, playready: false, fairplay: false, hardwareDrmReady: false },
                serverTimestamp: new Date().toISOString(),
            })),
            storageFactory_1.activeStorageProvider.getDiagnostics().catch(() => ({
                driver: "local",
                configured: false,
                status: "ERROR",
                basePathOrBucket: "Error",
                isCloudStorage: false,
                details: {},
            })),
            ffmpegService_1.ffmpegService.getDiagnostics().catch(() => ({
                available: false,
                error: "FFmpeg probe failed",
            })),
            threatDetector_1.threatDetector.getThreatMetrics().catch(() => ({
                threatLevel: "LOW",
                totalThreats24h: 0,
                failedLogins24h: 0,
                deniedActivations24h: 0,
                deniedCheckpoints24h: 0,
                deniedDrm24h: 0,
                rateLimitEvents24h: 0,
            })),
        ]);
        const maintenance = maintenanceMode_1.maintenanceState.getStatus();
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
                    environment: envValidator_1.env.NODE_ENV,
                    version: envValidator_1.env.APP_VERSION,
                    databasePingMs: dbPingMs,
                    drmProvider: drmDiag.provider,
                    storageDriver: storageDiag.driver,
                    maintenanceMode: maintenance.enabled,
                },
                threatMetrics,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOperationsHealth = getOperationsHealth;
/**
 * GET /api/operations/metrics
 * Performance and platform telemetry metrics
 */
const getOperationsMetrics = async (_req, res, next) => {
    try {
        const metrics = metricsService_1.metricsService.getMetrics();
        const [activePlaybackSessions, activeActivations, totalIssuedLicenses, totalSecurityEvents] = await Promise.all([
            database_1.prisma.playbackSession.count({ where: { status: "ACTIVE" } }).catch(() => 0),
            database_1.prisma.activation.count({ where: { status: "ACTIVE" } }).catch(() => 0),
            database_1.prisma.drmLicense.count({ where: { status: "ACTIVE" } }).catch(() => 0),
            database_1.prisma.securityAuditLog.count().catch(() => 0),
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
    }
    catch (error) {
        next(error);
    }
};
exports.getOperationsMetrics = getOperationsMetrics;
/**
 * GET /api/operations/dependencies
 * Deep dependency status
 */
const getOperationsDependencies = async (_req, res, next) => {
    try {
        let dbStatus = "HEALTHY";
        let dbPingMs = 0;
        try {
            const dbStart = Date.now();
            await database_1.prisma.$queryRaw `SELECT 1`;
            dbPingMs = Date.now() - dbStart;
        }
        catch {
            dbStatus = "UNHEALTHY";
        }
        const [storageDiag, drmDiag, ffmpegDiag] = await Promise.all([
            storageFactory_1.activeStorageProvider.getDiagnostics(),
            drmManager_1.drmServiceManager.getSafeStatus(),
            ffmpegService_1.ffmpegService.getDiagnostics(),
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
    }
    catch (error) {
        next(error);
    }
};
exports.getOperationsDependencies = getOperationsDependencies;
/**
 * POST /api/operations/maintenance
 * Admin toggle for Maintenance Mode
 */
const toggleMaintenanceMode = async (req, res, next) => {
    try {
        const { enabled, message } = req.body;
        const actorUser = req.user;
        maintenanceMode_1.maintenanceState.setStatus(!!enabled, message);
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: enabled ? "HIGH" : "INFO",
            userId: actorUser?.id,
            actorEmail: actorUser?.email,
            actorRole: actorUser?.role,
            actionSummary: `Admin ${actorUser?.email || "SYSTEM"} ${enabled ? "ENABLED" : "DISABLED"} Maintenance Mode${message ? `: ${message}` : ""}`,
        });
        res.status(200).json({
            success: true,
            message: `Maintenance Mode is now ${enabled ? "ACTIVE" : "INACTIVE"}`,
            data: maintenanceMode_1.maintenanceState.getStatus(),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleMaintenanceMode = toggleMaintenanceMode;
/**
 * GET /api/operations/backups
 * List all recorded database backups
 */
const listBackups = async (_req, res, next) => {
    try {
        const backups = backupService_1.backupService.listBackups();
        res.status(200).json({
            success: true,
            data: backups,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listBackups = listBackups;
/**
 * POST /api/operations/backups/create
 * Trigger a new manual database backup
 */
const triggerBackup = async (req, res, next) => {
    try {
        const actorUser = req.user;
        const backup = await backupService_1.backupService.createBackup("MANUAL", actorUser);
        res.status(201).json({
            success: true,
            message: `Database backup ${backup.id} created successfully.`,
            data: backup,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.triggerBackup = triggerBackup;
/**
 * POST /api/operations/backups/:backupId/verify
 * Verify SHA-256 integrity of an existing backup
 */
const verifyBackup = async (req, res, next) => {
    try {
        const { backupId } = req.params;
        const result = backupService_1.backupService.verifyBackupIntegrity(backupId);
        res.status(200).json({
            success: true,
            message: result.verified
                ? `Backup ${backupId} integrity verified successfully.`
                : `Backup ${backupId} failed integrity check!`,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyBackup = verifyBackup;
/**
 * POST /api/operations/backups/prune
 * Prune backups older than retention policy
 */
const pruneBackups = async (req, res, next) => {
    try {
        const { retentionDays } = req.body;
        const result = backupService_1.backupService.pruneExpiredBackups(retentionDays ? Number(retentionDays) : undefined);
        res.status(200).json({
            success: true,
            message: `Pruned ${result.prunedCount} expired backups (${(result.freedBytes / 1024).toFixed(1)} KB freed).`,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.pruneBackups = pruneBackups;
/**
 * GET /api/operations/disaster-recovery
 * Disaster Recovery and RPO/RTO metrics
 */
const getDisasterRecoveryStatus = async (_req, res, next) => {
    try {
        const drStatus = backupService_1.backupService.getDisasterRecoveryStatus();
        res.status(200).json({
            success: true,
            data: drStatus,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDisasterRecoveryStatus = getDisasterRecoveryStatus;
/**
 * GET /api/operations/scaling
 * Real-time auto-scaling, queue depth, and traffic pressure telemetry
 */
const getScalingTelemetry = async (_req, res, next) => {
    try {
        const mem = process.memoryUsage();
        const [activePlaybacks, activeSessionsCount, drmLicensesCount] = await Promise.all([
            database_1.prisma.playbackSession.count({ where: { status: "ACTIVE" } }),
            database_1.prisma.playbackSession.count(),
            database_1.prisma.drmLicense.count({ where: { status: "ISSUED" } }),
        ]);
        const metrics = metricsService_1.metricsService.getMetrics();
        // Determine Traffic Posture: NORMAL | ELEVATED | HIGH | CRITICAL
        let trafficPosture = "NORMAL";
        if (metrics.errorRatePercent > 10 || metrics.averageLatencyMs > 500) {
            trafficPosture = "CRITICAL";
        }
        else if (metrics.errorRatePercent > 5 || metrics.averageLatencyMs > 250) {
            trafficPosture = "HIGH";
        }
        else if (activePlaybacks > 20 || metrics.requestsPerMinute > 100) {
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
    }
    catch (error) {
        next(error);
    }
};
exports.getScalingTelemetry = getScalingTelemetry;
/**
 * POST /api/idempotency/check
 * Dedicated endpoint to check idempotency key status
 */
const checkIdempotencyEndpoint = async (req, res, next) => {
    try {
        const { key } = req.body;
        if (!key) {
            res.status(400).json({ success: false, message: "Idempotency key required" });
            return;
        }
        const record = await database_1.prisma.idempotencyRecord.findUnique({ where: { key } });
        res.status(200).json({
            success: true,
            data: {
                exists: !!record,
                status: record?.status,
                statusCode: record?.statusCode,
                createdAt: record?.createdAt,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.checkIdempotencyEndpoint = checkIdempotencyEndpoint;
