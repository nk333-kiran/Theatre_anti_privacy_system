import { metricsService } from "./metricsService";
import { alertingService } from "./alertingService";
import { logger } from "../logging/logger";

export type SlaStatus = "MEETING_SLA" | "AT_RISK" | "BREACHED";

export interface SlaThresholds {
  minAvailabilityPercent: number; // e.g. 99.9%
  maxP95LatencyMs: number;       // e.g. 500ms
  maxP99LatencyMs: number;       // e.g. 1500ms
  maxRpoMinutes: number;         // e.g. 15 minutes
  maxRtoMinutes: number;         // e.g. 60 minutes
  maxAuthFailureRatePercent: number; // e.g. 10%
}

export interface SlaEvaluationResult {
  status: SlaStatus;
  timestamp: string;
  availability: {
    apiUptimePercent: number;
    dbAvailable: boolean;
    webAvailable: boolean;
    status: SlaStatus;
  };
  performance: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    status: SlaStatus;
  };
  recovery: {
    currentRpoMinutes: number;
    targetRpoMinutes: number;
    recoveryReadiness: boolean;
    status: SlaStatus;
  };
  security: {
    authFailureRatePercent: number;
    tenantIsolationViolations: number;
    evidenceMismatches: number;
    status: SlaStatus;
  };
  violations: string[];
}

export class SlaMonitoringService {
  private static instance: SlaMonitoringService;
  private thresholds: SlaThresholds = {
    minAvailabilityPercent: 99.5,
    maxP95LatencyMs: 500,
    maxP99LatencyMs: 1500,
    maxRpoMinutes: 15,
    maxRtoMinutes: 60,
    maxAuthFailureRatePercent: 10,
  };

  private tenantIsolationViolations = 0;
  private evidenceMismatches = 0;
  private lastEvaluation?: SlaEvaluationResult;

  private constructor() {}

  public static getInstance(): SlaMonitoringService {
    if (!SlaMonitoringService.instance) {
      SlaMonitoringService.instance = new SlaMonitoringService();
    }
    return SlaMonitoringService.instance;
  }

  public recordTenantViolation(): void {
    this.tenantIsolationViolations++;
    alertingService.triggerAlert(
      "Tenant Isolation Boundary Violation Attempted",
      "CRITICAL",
      { violationCount: this.tenantIsolationViolations }
    );
  }

  public recordEvidenceMismatch(): void {
    this.evidenceMismatches++;
    alertingService.triggerAlert(
      "Forensic Evidence Vault Hash Mismatch Detected",
      "CRITICAL",
      { mismatchCount: this.evidenceMismatches }
    );
  }

  public evaluateSla(overrides?: {
    dbAvailable?: boolean;
    webAvailable?: boolean;
    currentRpoMinutes?: number;
  }): SlaEvaluationResult {
    const summary = metricsService.getMetricsSummary();
    const percentiles = metricsService.getLatencyPercentiles();
    const violations: string[] = [];

    // 1. Availability Evaluation
    const totalReqs = summary.totalRequests;
    const errors = summary.status5xx;
    const apiUptimePercent = totalReqs > 0 ? ((totalReqs - errors) / totalReqs) * 100 : 100;
    const dbAvailable = overrides?.dbAvailable ?? true;
    const webAvailable = overrides?.webAvailable ?? true;

    let availStatus: SlaStatus = "MEETING_SLA";
    if (!dbAvailable || !webAvailable || apiUptimePercent < 95.0) {
      availStatus = "BREACHED";
      violations.push(`Availability Breached: DB=${dbAvailable}, Web=${webAvailable}, API Uptime=${apiUptimePercent.toFixed(2)}%`);
    } else if (apiUptimePercent < this.thresholds.minAvailabilityPercent) {
      availStatus = "AT_RISK";
      violations.push(`Availability At Risk: API Uptime ${apiUptimePercent.toFixed(2)}% < ${this.thresholds.minAvailabilityPercent}%`);
    }

    // 2. Performance Evaluation
    let perfStatus: SlaStatus = "MEETING_SLA";
    if (percentiles.p99 > this.thresholds.maxP99LatencyMs * 2) {
      perfStatus = "BREACHED";
      violations.push(`Performance Breached: p99 ${percentiles.p99}ms exceeds limit (${this.thresholds.maxP99LatencyMs * 2}ms)`);
    } else if (percentiles.p95 > this.thresholds.maxP95LatencyMs) {
      perfStatus = "AT_RISK";
      violations.push(`Performance At Risk: p95 ${percentiles.p95}ms exceeds target (${this.thresholds.maxP95LatencyMs}ms)`);
    }

    // 3. Recovery Evaluation
    const rpo = overrides?.currentRpoMinutes ?? 5; // default 5m freshness
    let recoveryStatus: SlaStatus = "MEETING_SLA";
    if (rpo > this.thresholds.maxRpoMinutes) {
      recoveryStatus = "BREACHED";
      violations.push(`RPO Breached: Current RPO ${rpo}m exceeds ${this.thresholds.maxRpoMinutes}m limit`);
    } else if (rpo > this.thresholds.maxRpoMinutes * 0.8) {
      recoveryStatus = "AT_RISK";
      violations.push(`RPO At Risk: Current RPO ${rpo}m approaching limit`);
    }

    // 4. Security Evaluation
    const totalAuth = summary.authSuccesses + summary.authFailures;
    const authFailureRate = totalAuth > 0 ? (summary.authFailures / totalAuth) * 100 : 0;
    let secStatus: SlaStatus = "MEETING_SLA";

    if (this.tenantIsolationViolations > 0 || this.evidenceMismatches > 0) {
      secStatus = "BREACHED";
      violations.push(`Security Breached: Isolation Violations=${this.tenantIsolationViolations}, Evidence Mismatches=${this.evidenceMismatches}`);
    } else if (authFailureRate > this.thresholds.maxAuthFailureRatePercent) {
      secStatus = "AT_RISK";
      violations.push(`Security At Risk: Auth failure rate is ${authFailureRate.toFixed(1)}%`);
    }

    // Overall Status
    let overallStatus: SlaStatus = "MEETING_SLA";
    if (availStatus === "BREACHED" || perfStatus === "BREACHED" || recoveryStatus === "BREACHED" || secStatus === "BREACHED") {
      overallStatus = "BREACHED";
    } else if (availStatus === "AT_RISK" || perfStatus === "AT_RISK" || recoveryStatus === "AT_RISK" || secStatus === "AT_RISK") {
      overallStatus = "AT_RISK";
    }

    const result: SlaEvaluationResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      availability: {
        apiUptimePercent,
        dbAvailable,
        webAvailable,
        status: availStatus,
      },
      performance: {
        p50Ms: percentiles.p50,
        p95Ms: percentiles.p95,
        p99Ms: percentiles.p99,
        status: perfStatus,
      },
      recovery: {
        currentRpoMinutes: rpo,
        targetRpoMinutes: this.thresholds.maxRpoMinutes,
        recoveryReadiness: true,
        status: recoveryStatus,
      },
      security: {
        authFailureRatePercent: authFailureRate,
        tenantIsolationViolations: this.tenantIsolationViolations,
        evidenceMismatches: this.evidenceMismatches,
        status: secStatus,
      },
      violations,
    };

    this.lastEvaluation = result;

    if (overallStatus === "BREACHED") {
      logger.error(`[SLA] SLA Status Breached: ${violations.join(" | ")}`);
    }

    return result;
  }

  public getLastEvaluation(): SlaEvaluationResult {
    return this.lastEvaluation || this.evaluateSla();
  }
}

export const slaMonitoringService = SlaMonitoringService.getInstance();
