"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsService = void 0;
class MetricsService {
    startTime = Date.now();
    totalRequests = 0;
    totalErrors = 0;
    total4xx = 0;
    total5xx = 0;
    total2xx = 0;
    activeRequests = 0;
    latencies = []; // Rolling buffer of last 1000 requests
    maxLatencyBufferSize = 1000;
    rateLimitViolations = 0;
    authFailures = 0;
    playbackAuthFailures = 0;
    drmAuthFailures = 0;
    statusCodeCounts = {};
    endpointCounts = {};
    minuteRequestCounter = 0;
    requestsPerMinute = 0;
    // Domain Subsystem Counters
    authMetrics = {
        loginSuccess: 0,
        loginFailure: 0,
        expiredSessions: 0,
        invalidTokens: 0,
        unauthorizedRequests: 0,
    };
    qrMetrics = {
        verificationAttempts: 0,
        successfulVerifications: 0,
        invalidQrCount: 0,
        expiredQrCount: 0,
        duplicateQrCount: 0,
        crossTheatreAttempts: 0,
    };
    watermarkMetrics = {
        rotationsTotal: 0,
        rotationFailures: 0,
        attributionAttempts: 0,
        attributionSuccess: 0,
        attributionFailure: 0,
    };
    evidenceMetrics = {
        recordsCreated: 0,
        verificationCount: 0,
        hashMismatches: 0,
        vaultStatus: "HEALTHY",
    };
    socMetrics = {
        eventsReceived: 0,
        eventsRejected: 0,
        highSeverityEvents: 0,
        incidentCreationRate: 0,
        telemetryRetryQueueDepth: 0,
    };
    recoveryMetrics = {
        backupAgeMinutes: 5,
        backupVerificationStatus: "VERIFIED",
        rpoStatus: "COMPLIANT",
        rtoStatus: "READY",
        recoveryAttempts: 0,
        recoveryFailures: 0,
        rollbackEvents: 0,
    };
    constructor() {
        // Reset minute request rate every 60 seconds
        setInterval(() => {
            this.requestsPerMinute = this.minuteRequestCounter;
            this.minuteRequestCounter = 0;
        }, 60000);
    }
    incrementActive() {
        this.activeRequests++;
    }
    decrementActive() {
        if (this.activeRequests > 0) {
            this.activeRequests--;
        }
    }
    recordRequest(endpoint, statusCode, durationMs) {
        this.totalRequests++;
        this.minuteRequestCounter++;
        // Track status codes
        const statusKey = `${Math.floor(statusCode / 100)}xx`;
        this.statusCodeCounts[statusKey] = (this.statusCodeCounts[statusKey] || 0) + 1;
        if (statusCode >= 200 && statusCode < 300) {
            this.total2xx++;
        }
        else if (statusCode >= 400 && statusCode < 500) {
            this.total4xx++;
            this.totalErrors++;
            if (statusCode === 401 || statusCode === 403) {
                this.authMetrics.unauthorizedRequests++;
            }
        }
        else if (statusCode >= 500) {
            this.total5xx++;
            this.totalErrors++;
        }
        // Record latency in rolling buffer
        this.latencies.push(durationMs);
        if (this.latencies.length > this.maxLatencyBufferSize) {
            this.latencies.shift();
        }
        // Endpoint frequency
        const sanitizedEndpoint = endpoint.split("?")[0];
        this.endpointCounts[sanitizedEndpoint] = (this.endpointCounts[sanitizedEndpoint] || 0) + 1;
    }
    // Authentication Instrumentation
    recordLoginSuccess() {
        this.authMetrics.loginSuccess++;
    }
    recordLoginFailure() {
        this.authMetrics.loginFailure++;
        this.authFailures++;
    }
    recordExpiredSession() {
        this.authMetrics.expiredSessions++;
    }
    recordInvalidToken() {
        this.authMetrics.invalidTokens++;
    }
    // QR Verification Instrumentation
    recordQrVerificationAttempt() {
        this.qrMetrics.verificationAttempts++;
    }
    recordQrVerificationSuccess() {
        this.qrMetrics.successfulVerifications++;
    }
    recordInvalidQr() {
        this.qrMetrics.invalidQrCount++;
    }
    recordExpiredQr() {
        this.qrMetrics.expiredQrCount++;
    }
    recordDuplicateQr() {
        this.qrMetrics.duplicateQrCount++;
    }
    recordCrossTheatreAttempt() {
        this.qrMetrics.crossTheatreAttempts++;
    }
    // Watermark Instrumentation
    recordWatermarkRotation(success = true) {
        this.watermarkMetrics.rotationsTotal++;
        if (!success)
            this.watermarkMetrics.rotationFailures++;
    }
    recordWatermarkAttribution(success = true) {
        this.watermarkMetrics.attributionAttempts++;
        if (success) {
            this.watermarkMetrics.attributionSuccess++;
        }
        else {
            this.watermarkMetrics.attributionFailure++;
        }
    }
    // Evidence Instrumentation
    recordEvidenceCreated() {
        this.evidenceMetrics.recordsCreated++;
    }
    recordEvidenceVerification(mismatches = 0) {
        this.evidenceMetrics.verificationCount++;
        if (mismatches > 0) {
            this.evidenceMetrics.hashMismatches += mismatches;
            this.evidenceMetrics.vaultStatus = "TAMPERED";
        }
    }
    // SOC Instrumentation
    recordSocEvent(severity, rejected = false) {
        this.socMetrics.eventsReceived++;
        if (rejected)
            this.socMetrics.eventsRejected++;
        if (["HIGH", "CRITICAL"].includes(severity.toUpperCase())) {
            this.socMetrics.highSeverityEvents++;
        }
    }
    setTelemetryQueueDepth(depth) {
        this.socMetrics.telemetryRetryQueueDepth = Math.max(0, depth);
    }
    // Recovery & DR Instrumentation
    updateRecoveryMetrics(params) {
        if (params.backupAgeMinutes !== undefined)
            this.recoveryMetrics.backupAgeMinutes = params.backupAgeMinutes;
        if (params.backupStatus)
            this.recoveryMetrics.backupVerificationStatus = params.backupStatus;
        if (params.rpoCompliant !== undefined)
            this.recoveryMetrics.rpoStatus = params.rpoCompliant ? "COMPLIANT" : "NON_COMPLIANT";
        if (params.rtoReady !== undefined)
            this.recoveryMetrics.rtoStatus = params.rtoReady ? "READY" : "DEGRADED";
    }
    recordRecoveryAttempt(success = true) {
        this.recoveryMetrics.recoveryAttempts++;
        if (!success)
            this.recoveryMetrics.recoveryFailures++;
    }
    recordRollbackEvent() {
        this.recoveryMetrics.rollbackEvents++;
    }
    recordRateLimitViolation() {
        this.rateLimitViolations++;
    }
    recordAuthFailure() {
        this.recordLoginFailure();
    }
    recordPlaybackAuthFailure() {
        this.playbackAuthFailures++;
    }
    recordDrmAuthFailure() {
        this.drmAuthFailures++;
    }
    getMetrics() {
        const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        const errorRatePercent = this.totalRequests > 0
            ? parseFloat(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
            : 0;
        const error4xxRatePercent = this.totalRequests > 0
            ? parseFloat(((this.total4xx / this.totalRequests) * 100).toFixed(2))
            : 0;
        const error5xxRatePercent = this.totalRequests > 0
            ? parseFloat(((this.total5xx / this.totalRequests) * 100).toFixed(2))
            : 0;
        let averageLatencyMs = 0;
        let p50LatencyMs = 0;
        let p95LatencyMs = 0;
        let p99LatencyMs = 0;
        if (this.latencies.length > 0) {
            const sum = this.latencies.reduce((a, b) => a + b, 0);
            averageLatencyMs = Math.round(sum / this.latencies.length);
            const sorted = [...this.latencies].sort((a, b) => a - b);
            const p50Index = Math.floor(sorted.length * 0.5);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p99Index = Math.floor(sorted.length * 0.99);
            p50LatencyMs = sorted[Math.min(p50Index, sorted.length - 1)];
            p95LatencyMs = sorted[Math.min(p95Index, sorted.length - 1)];
            p99LatencyMs = sorted[Math.min(p99Index, sorted.length - 1)];
        }
        const topEndpoints = Object.entries(this.endpointCounts)
            .map(([endpoint, count]) => ({ endpoint, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            uptimeSeconds,
            totalRequests: this.totalRequests,
            totalErrors: this.totalErrors,
            errorRatePercent,
            error4xxRatePercent,
            error5xxRatePercent,
            activeRequests: this.activeRequests,
            averageLatencyMs,
            p50LatencyMs,
            p95LatencyMs,
            p99LatencyMs,
            requestsPerMinute: this.requestsPerMinute,
            rateLimitViolations: this.rateLimitViolations,
            authFailures: this.authFailures,
            playbackAuthFailures: this.playbackAuthFailures,
            drmAuthFailures: this.drmAuthFailures,
            statusCodeCounts: { ...this.statusCodeCounts },
            topEndpoints,
            api: {
                requestCount: this.totalRequests,
                errorCount: this.totalErrors,
                status2xx: this.total2xx,
                status4xx: this.total4xx,
                status5xx: this.total5xx,
                p50Ms: p50LatencyMs,
                p95Ms: p95LatencyMs,
                p99Ms: p99LatencyMs,
            },
            auth: { ...this.authMetrics },
            qrAdmission: { ...this.qrMetrics },
            watermarking: { ...this.watermarkMetrics },
            evidenceVault: { ...this.evidenceMetrics },
            soc: { ...this.socMetrics },
            recovery: { ...this.recoveryMetrics },
        };
    }
    getLatencyPercentiles() {
        const m = this.getMetrics();
        return {
            p50: m.p50LatencyMs,
            p95: m.p95LatencyMs,
            p99: m.p99LatencyMs,
        };
    }
    getMetricsSummary() {
        const m = this.getMetrics();
        return {
            totalRequests: m.totalRequests,
            status2xx: m.api.status2xx,
            status4xx: m.api.status4xx,
            status5xx: m.api.status5xx,
            activeRequests: m.activeRequests,
            authSuccesses: m.auth.loginSuccess,
            authFailures: m.auth.loginFailure,
            qrValidations: m.qrAdmission.successfulVerifications,
            qrRejections: m.qrAdmission.invalidQrCount + m.qrAdmission.expiredQrCount,
            watermarksEmbedded: m.watermarking.rotationsTotal,
            socEventsProcessed: m.soc.eventsReceived,
        };
    }
}
exports.metricsService = new MetricsService();
