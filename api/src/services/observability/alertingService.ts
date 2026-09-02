import { metricsService } from "./metricsService";
import { logger } from "../logging/logger";

export type AlertSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ProductionAlert {
  alertId: string;
  ruleName: string;
  category: "API" | "DATABASE" | "SECURITY" | "EVIDENCE" | "BACKUP" | "SOC" | "RECOVERY" | "SYSTEM";
  severity: AlertSeverity;
  title: string;
  description: string;
  metricValue?: number | string;
  threshold?: number | string;
  correlationId?: string;
  triggeredAt: string;
  isResolved: boolean;
  resolvedAt?: string;
  recommendedAction: string;
  details?: any;
}

export class ProductionAlertingService {
  private activeAlerts: Map<string, ProductionAlert> = new Map();
  private alertHistory: ProductionAlert[] = [];

  constructor() {
    this.seedInitialBaselineAlerts();
  }

  private seedInitialBaselineAlerts(): void {
    const baselineAlert: ProductionAlert = {
      alertId: "ALT-INIT-001",
      ruleName: "SYSTEM_INITIALIZATION",
      category: "SYSTEM",
      severity: "INFO",
      title: "Production Observability Engine Active",
      description: "Centralized alerting, metrics, and health monitoring engine successfully booted.",
      triggeredAt: new Date().toISOString(),
      isResolved: true,
      resolvedAt: new Date().toISOString(),
      recommendedAction: "No action required. System is operating normally.",
    };
    this.alertHistory.push(baselineAlert);
  }

  public async evaluateAlertRules(correlationId?: string): Promise<ProductionAlert[]> {
    const metrics = metricsService.getMetrics();
    const evaluatedAlerts: ProductionAlert[] = [];
    const corrId = correlationId || `CORR-ALERT-EVAL-${Date.now()}`;

    if (metrics.error5xxRatePercent > 5.0) {
      evaluatedAlerts.push(
        this.triggerAlert({
          ruleName: "API_5XX_SPIKE",
          category: "API",
          severity: "CRITICAL",
          title: "Elevated API 5xx Error Rate",
          description: `API 5xx error rate (${metrics.error5xxRatePercent}%) exceeds 5% threshold.`,
          metricValue: `${metrics.error5xxRatePercent}%`,
          threshold: "5.0%",
          correlationId: corrId,
          recommendedAction: "Inspect application error logs, container memory, and downstream service connectivity.",
        })
      );
    }

    if (metrics.p95LatencyMs > 2000) {
      evaluatedAlerts.push(
        this.triggerAlert({
          ruleName: "HIGH_API_LATENCY",
          category: "API",
          severity: "HIGH",
          title: "High API Response Latency (p95)",
          description: `p95 response latency (${metrics.p95LatencyMs}ms) exceeds 2000ms threshold.`,
          metricValue: `${metrics.p95LatencyMs}ms`,
          threshold: "2000ms",
          correlationId: corrId,
          recommendedAction: "Review slow query log, database connection pool saturation, and network bottlenecks.",
        })
      );
    }

    if (metrics.evidenceVault.hashMismatches > 0 || metrics.evidenceVault.vaultStatus === "TAMPERED") {
      evaluatedAlerts.push(
        this.triggerAlert({
          ruleName: "EVIDENCE_HASH_MISMATCH",
          category: "EVIDENCE",
          severity: "CRITICAL",
          title: "Critical Evidence Vault Cryptographic Mismatch",
          description: `Detected ${metrics.evidenceVault.hashMismatches} cryptographic hash mismatches in Evidence Vault.`,
          metricValue: metrics.evidenceVault.hashMismatches,
          threshold: 0,
          correlationId: corrId,
          recommendedAction: "Investigate tamper incident. Non-overwrite policy enforced. Verify chain-of-custody logs.",
        })
      );
    }

    if (metrics.recovery.backupAgeMinutes > 15) {
      evaluatedAlerts.push(
        this.triggerAlert({
          ruleName: "BACKUP_STALE_RPO_VIOLATION",
          category: "BACKUP",
          severity: "HIGH",
          title: "Backup Freshness RPO SLA Warning",
          description: `Latest backup age (${metrics.recovery.backupAgeMinutes}m) exceeds RPO target (15m).`,
          metricValue: `${metrics.recovery.backupAgeMinutes}m`,
          threshold: "15m",
          correlationId: corrId,
          recommendedAction: "Trigger automated snapshot or investigate scheduled backup cron worker.",
        })
      );
    }

    return evaluatedAlerts;
  }

  public triggerAlert(
    paramsOrTitle:
      | string
      | {
          ruleName: string;
          category?: ProductionAlert["category"];
          severity?: AlertSeverity;
          title?: string;
          description?: string;
          metricValue?: number | string;
          threshold?: number | string;
          correlationId?: string;
          recommendedAction?: string;
          details?: any;
        },
    severity: AlertSeverity = "HIGH",
    details?: any
  ): ProductionAlert {
    let alertData: ProductionAlert;
    const alertId = `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (typeof paramsOrTitle === "string") {
      alertData = {
        alertId,
        ruleName: paramsOrTitle.toUpperCase().replace(/\s+/g, "_"),
        category: "SECURITY",
        severity,
        title: paramsOrTitle,
        description: paramsOrTitle,
        correlationId: details?.correlationId || `CORR-ALT-${Date.now()}`,
        triggeredAt: new Date().toISOString(),
        isResolved: false,
        recommendedAction: "Review operational incident runbook.",
        details,
      };
    } else {
      alertData = {
        alertId,
        ruleName: paramsOrTitle.ruleName,
        category: paramsOrTitle.category || "SYSTEM",
        severity: paramsOrTitle.severity || severity,
        title: paramsOrTitle.title || paramsOrTitle.ruleName,
        description: paramsOrTitle.description || paramsOrTitle.title || paramsOrTitle.ruleName,
        metricValue: paramsOrTitle.metricValue,
        threshold: paramsOrTitle.threshold,
        correlationId: paramsOrTitle.correlationId || `CORR-ALT-${Date.now()}`,
        triggeredAt: new Date().toISOString(),
        isResolved: false,
        recommendedAction: paramsOrTitle.recommendedAction || "Investigate triggering subsystem.",
        details: paramsOrTitle.details,
      };
    }

    this.activeAlerts.set(alertData.ruleName, alertData);
    this.alertHistory.unshift(alertData);

    if (this.alertHistory.length > 200) {
      this.alertHistory.pop();
    }

    logger.warn(`[AlertingEngine] Triggered Alert [${alertData.severity}] ${alertData.title}`, {
      alertId: alertData.alertId,
      ruleName: alertData.ruleName,
      severity: alertData.severity,
      correlationId: alertData.correlationId,
    });

    return alertData;
  }

  public resolveAlert(ruleNameOrId: string): boolean {
    let targetKey = ruleNameOrId;
    if (!this.activeAlerts.has(targetKey)) {
      for (const [key, alert] of this.activeAlerts.entries()) {
        if (alert.alertId === ruleNameOrId) {
          targetKey = key;
          break;
        }
      }
    }

    const alert = this.activeAlerts.get(targetKey);
    if (alert) {
      alert.isResolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.activeAlerts.delete(targetKey);
      return true;
    }
    return false;
  }

  public getActiveAlerts(): ProductionAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(limit = 50): ProductionAlert[] {
    return this.alertHistory.slice(0, limit);
  }
}

export const productionAlertingService = new ProductionAlertingService();
export const alertingService = productionAlertingService;
