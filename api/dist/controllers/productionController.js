"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionController = void 0;
const productionReadinessService_1 = require("../services/production/productionReadinessService");
const migrationSafetyService_1 = require("../services/production/migrationSafetyService");
const alertingService_1 = require("../services/observability/alertingService");
const metricsService_1 = require("../services/observability/metricsService");
const disasterRecoveryService_1 = require("../services/recovery/disasterRecoveryService");
const releaseManagementService_1 = require("../services/production/releaseManagementService");
const lifecycleService_1 = require("../services/production/lifecycleService");
const slaMonitoringService_1 = require("../services/observability/slaMonitoringService");
const prometheusExporter_1 = require("../services/observability/prometheusExporter");
class ProductionController {
    /**
     * GET /api/production/version
     * Returns safe production release metadata without exposing secrets
     */
    static async getVersion(_req, res) {
        try {
            const versionMeta = releaseManagementService_1.releaseManagementService.getVersionMetadata();
            res.json({
                success: true,
                data: versionMeta,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to fetch version metadata",
                errorCode: "VERSION_FETCH_ERROR",
            });
        }
    }
    /**
     * GET /api/production/lifecycle
     * Returns current application lifecycle state and in-flight traffic count
     */
    static async getLifecycle(_req, res) {
        res.json({
            success: true,
            data: {
                state: lifecycleService_1.lifecycleManager.getState(),
                isReady: lifecycleService_1.lifecycleManager.isReady(),
                isAcceptingTraffic: lifecycleService_1.lifecycleManager.isAcceptingTraffic(),
                inFlightRequests: lifecycleService_1.lifecycleManager.getInFlightCount(),
            },
        });
    }
    /**
     * GET /api/production/sla
     * Evaluates and returns comprehensive SLA status across Availability, Performance, Recovery, and Security
     */
    static async getSlaStatus(_req, res) {
        try {
            const sla = slaMonitoringService_1.slaMonitoringService.evaluateSla();
            res.json({
                success: true,
                data: sla,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to evaluate SLA",
                errorCode: "SLA_EVALUATION_ERROR",
            });
        }
    }
    /**
     * GET /api/production/metrics/prometheus
     * Standard Prometheus text exposition endpoint
     */
    static async getPrometheusMetrics(_req, res) {
        const text = prometheusExporter_1.prometheusExporter.exportMetricsText();
        res.setHeader("Content-Type", "text/plain; version=0.0.4");
        res.send(text);
    }
    /**
     * GET /api/production/release/history
     */
    static async getReleaseHistory(_req, res) {
        res.json({
            success: true,
            data: {
                currentStage: releaseManagementService_1.releaseManagementService.getStage(),
                history: releaseManagementService_1.releaseManagementService.getDeploymentHistory(),
            },
        });
    }
    /**
     * POST /api/production/release/evaluate-promotion
     */
    static async evaluatePromotion(req, res) {
        try {
            const evaluation = releaseManagementService_1.releaseManagementService.evaluatePromotionGates(req.body);
            res.json({
                success: true,
                data: evaluation,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to evaluate promotion gates",
                errorCode: "PROMOTION_EVALUATION_ERROR",
            });
        }
    }
    /**
     * GET /api/production/readiness
     * Returns current production deployment readiness posture
     */
    static async getReadiness(req, res) {
        try {
            const correlationId = req.headers["x-correlation-id"] || `CORR-PROD-READ-${Date.now()}`;
            const report = await productionReadinessService_1.productionReadinessService.evaluateReadiness(req.user, correlationId);
            res.json({
                success: true,
                data: report,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to evaluate production readiness",
                errorCode: "READINESS_EVALUATION_ERROR",
            });
        }
    }
    /**
     * POST /api/production/readiness/validate
     * Explicitly triggers deep deployment gate re-validation
     */
    static async validateReadiness(req, res) {
        try {
            const correlationId = req.headers["x-correlation-id"] || `CORR-PROD-VAL-${Date.now()}`;
            const report = await productionReadinessService_1.productionReadinessService.evaluateReadiness(req.user, correlationId);
            res.status(200).json({
                success: true,
                data: report,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to execute readiness validation",
                errorCode: "READINESS_VALIDATION_ERROR",
            });
        }
    }
    /**
     * GET /api/production/metrics
     * Returns complete production performance, latency percentiles & domain metrics
     */
    static async getMetrics(_req, res) {
        try {
            const metrics = metricsService_1.metricsService.getMetrics();
            res.json({
                success: true,
                data: metrics,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to fetch metrics",
                errorCode: "METRICS_FETCH_ERROR",
            });
        }
    }
    /**
     * GET /api/production/alerts
     * Evaluates and returns active alerts and historical logs
     */
    static async getAlerts(req, res) {
        try {
            const correlationId = req.headers["x-correlation-id"] || `CORR-ALERTS-${Date.now()}`;
            const evaluated = await alertingService_1.productionAlertingService.evaluateAlertRules(correlationId);
            const active = alertingService_1.productionAlertingService.getActiveAlerts();
            const history = alertingService_1.productionAlertingService.getAlertHistory(20);
            res.json({
                success: true,
                data: {
                    activeAlerts: active,
                    recentlyEvaluated: evaluated,
                    alertHistory: history,
                },
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to fetch production alerts",
                errorCode: "ALERTS_FETCH_ERROR",
            });
        }
    }
    /**
     * POST /api/production/migration/safety-check
     * Validates pre-migration prerequisites
     */
    static async checkMigrationSafety(req, res) {
        try {
            const correlationId = req.headers["x-correlation-id"] || `CORR-MIG-SAFE-${Date.now()}`;
            const result = await migrationSafetyService_1.migrationSafetyService.validatePreMigrationSafety(req.user, correlationId);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to check migration safety",
                errorCode: "MIGRATION_SAFETY_ERROR",
            });
        }
    }
    /**
     * GET /api/production/posture
     * Aggregates posture across all 6 core pillars (API, Database, Evidence, SOC, Backup, Recovery)
     */
    static async getProductionPosture(_req, res) {
        try {
            const drStatus = await disasterRecoveryService_1.disasterRecoveryService.getRecoveryStatus();
            const metrics = metricsService_1.metricsService.getMetrics();
            const activeAlerts = alertingService_1.productionAlertingService.getActiveAlerts();
            res.json({
                success: true,
                data: {
                    overallStatus: drStatus.overallReadiness,
                    database: drStatus.database,
                    evidenceVault: drStatus.evidenceVault,
                    backup: drStatus.backup,
                    telemetry: drStatus.telemetryQueue,
                    rollback: drStatus.rollback,
                    performance: {
                        p50Ms: metrics.p50LatencyMs,
                        p95Ms: metrics.p95LatencyMs,
                        p99Ms: metrics.p99LatencyMs,
                        errorRatePercent: metrics.errorRatePercent,
                        requestsPerMinute: metrics.requestsPerMinute,
                    },
                    alertsCount: activeAlerts.length,
                },
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to fetch production posture",
                errorCode: "POSTURE_FETCH_ERROR",
            });
        }
    }
}
exports.ProductionController = ProductionController;
