import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { productionReadinessService } from "../services/production/productionReadinessService";
import { migrationSafetyService } from "../services/production/migrationSafetyService";
import { productionAlertingService } from "../services/observability/alertingService";
import { metricsService } from "../services/observability/metricsService";
import { disasterRecoveryService } from "../services/recovery/disasterRecoveryService";
import { releaseManagementService } from "../services/production/releaseManagementService";
import { lifecycleManager } from "../services/production/lifecycleService";
import { slaMonitoringService } from "../services/observability/slaMonitoringService";
import { prometheusExporter } from "../services/observability/prometheusExporter";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
}

export class ProductionController {
  /**
   * GET /api/production/version
   * Returns safe production release metadata without exposing secrets
   */
  public static async getVersion(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const versionMeta = releaseManagementService.getVersionMetadata();
      res.json({
        success: true,
        data: versionMeta,
      });
    } catch (err: any) {
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
  public static async getLifecycle(_req: Request, res: Response<ApiResponse>): Promise<void> {
    res.json({
      success: true,
      data: {
        state: lifecycleManager.getState(),
        isReady: lifecycleManager.isReady(),
        isAcceptingTraffic: lifecycleManager.isAcceptingTraffic(),
        inFlightRequests: lifecycleManager.getInFlightCount(),
      },
    });
  }

  /**
   * GET /api/production/sla
   * Evaluates and returns comprehensive SLA status across Availability, Performance, Recovery, and Security
   */
  public static async getSlaStatus(_req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const sla = slaMonitoringService.evaluateSla();
      res.json({
        success: true,
        data: sla,
      });
    } catch (err: any) {
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
  public static async getPrometheusMetrics(_req: Request, res: Response): Promise<void> {
    const text = prometheusExporter.exportMetricsText();
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(text);
  }

  /**
   * GET /api/production/release/history
   */
  public static async getReleaseHistory(_req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    res.json({
      success: true,
      data: {
        currentStage: releaseManagementService.getStage(),
        history: releaseManagementService.getDeploymentHistory(),
      },
    });
  }

  /**
   * POST /api/production/release/evaluate-promotion
   */
  public static async evaluatePromotion(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const evaluation = releaseManagementService.evaluatePromotionGates(req.body);
      res.json({
        success: true,
        data: evaluation,
      });
    } catch (err: any) {
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
  public static async getReadiness(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-PROD-READ-${Date.now()}`;
      const report = await productionReadinessService.evaluateReadiness(req.user, correlationId);
      res.json({
        success: true,
        data: report,
      });
    } catch (err: any) {
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
  public static async validateReadiness(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-PROD-VAL-${Date.now()}`;
      const report = await productionReadinessService.evaluateReadiness(req.user, correlationId);
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err: any) {
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
  public static async getMetrics(_req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const metrics = metricsService.getMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (err: any) {
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
  public static async getAlerts(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-ALERTS-${Date.now()}`;
      const evaluated = await productionAlertingService.evaluateAlertRules(correlationId);
      const active = productionAlertingService.getActiveAlerts();
      const history = productionAlertingService.getAlertHistory(20);

      res.json({
        success: true,
        data: {
          activeAlerts: active,
          recentlyEvaluated: evaluated,
          alertHistory: history,
        },
      });
    } catch (err: any) {
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
  public static async checkMigrationSafety(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-MIG-SAFE-${Date.now()}`;
      const result = await migrationSafetyService.validatePreMigrationSafety(req.user, correlationId);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
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
  public static async getProductionPosture(_req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const drStatus = await disasterRecoveryService.getRecoveryStatus();
      const metrics = metricsService.getMetrics();
      const activeAlerts = productionAlertingService.getActiveAlerts();

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
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch production posture",
        errorCode: "POSTURE_FETCH_ERROR",
      });
    }
  }
}
