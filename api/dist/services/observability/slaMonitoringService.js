"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slaMonitoringService = exports.SlaMonitoringService = void 0;
const metricsService_1 = require("./metricsService");
const alertingService_1 = require("./alertingService");
const logger_1 = require("../logging/logger");
class SlaMonitoringService {
    static instance;
    thresholds = {
        minAvailabilityPercent: 99.5,
        maxP95LatencyMs: 500,
        maxP99LatencyMs: 1500,
        maxRpoMinutes: 15,
        maxRtoMinutes: 60,
        maxAuthFailureRatePercent: 10,
    };
    tenantIsolationViolations = 0;
    evidenceMismatches = 0;
    lastEvaluation;
    constructor() { }
    static getInstance() {
        if (!SlaMonitoringService.instance) {
            SlaMonitoringService.instance = new SlaMonitoringService();
        }
        return SlaMonitoringService.instance;
    }
    recordTenantViolation() {
        this.tenantIsolationViolations++;
        alertingService_1.alertingService.triggerAlert("Tenant Isolation Boundary Violation Attempted", "CRITICAL", { violationCount: this.tenantIsolationViolations });
    }
    recordEvidenceMismatch() {
        this.evidenceMismatches++;
        alertingService_1.alertingService.triggerAlert("Forensic Evidence Vault Hash Mismatch Detected", "CRITICAL", { mismatchCount: this.evidenceMismatches });
    }
    evaluateSla(overrides) {
        const summary = metricsService_1.metricsService.getMetricsSummary();
        const percentiles = metricsService_1.metricsService.getLatencyPercentiles();
        const violations = [];
        // 1. Availability Evaluation
        const totalReqs = summary.totalRequests;
        const errors = summary.status5xx;
        const apiUptimePercent = totalReqs > 0 ? ((totalReqs - errors) / totalReqs) * 100 : 100;
        const dbAvailable = overrides?.dbAvailable ?? true;
        const webAvailable = overrides?.webAvailable ?? true;
        let availStatus = "MEETING_SLA";
        if (!dbAvailable || !webAvailable || apiUptimePercent < 95.0) {
            availStatus = "BREACHED";
            violations.push(`Availability Breached: DB=${dbAvailable}, Web=${webAvailable}, API Uptime=${apiUptimePercent.toFixed(2)}%`);
        }
        else if (apiUptimePercent < this.thresholds.minAvailabilityPercent) {
            availStatus = "AT_RISK";
            violations.push(`Availability At Risk: API Uptime ${apiUptimePercent.toFixed(2)}% < ${this.thresholds.minAvailabilityPercent}%`);
        }
        // 2. Performance Evaluation
        let perfStatus = "MEETING_SLA";
        if (percentiles.p99 > this.thresholds.maxP99LatencyMs * 2) {
            perfStatus = "BREACHED";
            violations.push(`Performance Breached: p99 ${percentiles.p99}ms exceeds limit (${this.thresholds.maxP99LatencyMs * 2}ms)`);
        }
        else if (percentiles.p95 > this.thresholds.maxP95LatencyMs) {
            perfStatus = "AT_RISK";
            violations.push(`Performance At Risk: p95 ${percentiles.p95}ms exceeds target (${this.thresholds.maxP95LatencyMs}ms)`);
        }
        // 3. Recovery Evaluation
        const rpo = overrides?.currentRpoMinutes ?? 5; // default 5m freshness
        let recoveryStatus = "MEETING_SLA";
        if (rpo > this.thresholds.maxRpoMinutes) {
            recoveryStatus = "BREACHED";
            violations.push(`RPO Breached: Current RPO ${rpo}m exceeds ${this.thresholds.maxRpoMinutes}m limit`);
        }
        else if (rpo > this.thresholds.maxRpoMinutes * 0.8) {
            recoveryStatus = "AT_RISK";
            violations.push(`RPO At Risk: Current RPO ${rpo}m approaching limit`);
        }
        // 4. Security Evaluation
        const totalAuth = summary.authSuccesses + summary.authFailures;
        const authFailureRate = totalAuth > 0 ? (summary.authFailures / totalAuth) * 100 : 0;
        let secStatus = "MEETING_SLA";
        if (this.tenantIsolationViolations > 0 || this.evidenceMismatches > 0) {
            secStatus = "BREACHED";
            violations.push(`Security Breached: Isolation Violations=${this.tenantIsolationViolations}, Evidence Mismatches=${this.evidenceMismatches}`);
        }
        else if (authFailureRate > this.thresholds.maxAuthFailureRatePercent) {
            secStatus = "AT_RISK";
            violations.push(`Security At Risk: Auth failure rate is ${authFailureRate.toFixed(1)}%`);
        }
        // Overall Status
        let overallStatus = "MEETING_SLA";
        if (availStatus === "BREACHED" || perfStatus === "BREACHED" || recoveryStatus === "BREACHED" || secStatus === "BREACHED") {
            overallStatus = "BREACHED";
        }
        else if (availStatus === "AT_RISK" || perfStatus === "AT_RISK" || recoveryStatus === "AT_RISK" || secStatus === "AT_RISK") {
            overallStatus = "AT_RISK";
        }
        const result = {
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
            logger_1.logger.error(`[SLA] SLA Status Breached: ${violations.join(" | ")}`);
        }
        return result;
    }
    getLastEvaluation() {
        return this.lastEvaluation || this.evaluateSla();
    }
}
exports.SlaMonitoringService = SlaMonitoringService;
exports.slaMonitoringService = SlaMonitoringService.getInstance();
