export interface PerformanceMetrics {
  uptimeSeconds: number;
  totalRequests: number;
  totalErrors: number;
  errorRatePercent: number;
  error4xxRatePercent: number;
  error5xxRatePercent: number;
  activeRequests: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerMinute: number;
  rateLimitViolations: number;
  authFailures: number;
  playbackAuthFailures: number;
  drmAuthFailures: number;
  statusCodeCounts: Record<string, number>;
  topEndpoints: { endpoint: string; count: number }[];
  
  // Phase 36 Enterprise Observability Metrics
  api: {
    requestCount: number;
    errorCount: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  auth: {
    loginSuccess: number;
    loginFailure: number;
    expiredSessions: number;
    invalidTokens: number;
    unauthorizedRequests: number;
  };
  qrAdmission: {
    verificationAttempts: number;
    successfulVerifications: number;
    invalidQrCount: number;
    expiredQrCount: number;
    duplicateQrCount: number;
    crossTheatreAttempts: number;
  };
  watermarking: {
    rotationsTotal: number;
    rotationFailures: number;
    attributionAttempts: number;
    attributionSuccess: number;
    attributionFailure: number;
  };
  evidenceVault: {
    recordsCreated: number;
    verificationCount: number;
    hashMismatches: number;
    vaultStatus: "HEALTHY" | "DEGRADED" | "TAMPERED";
  };
  soc: {
    eventsReceived: number;
    eventsRejected: number;
    highSeverityEvents: number;
    incidentCreationRate: number;
    telemetryRetryQueueDepth: number;
  };
  recovery: {
    backupAgeMinutes: number;
    backupVerificationStatus: "VERIFIED" | "PENDING" | "CORRUPTED" | "MISSING";
    rpoStatus: "COMPLIANT" | "NON_COMPLIANT";
    rtoStatus: "READY" | "DEGRADED";
    recoveryAttempts: number;
    recoveryFailures: number;
    rollbackEvents: number;
  };
}

class MetricsService {
  private startTime: number = Date.now();
  private totalRequests: number = 0;
  private totalErrors: number = 0;
  private total4xx: number = 0;
  private total5xx: number = 0;
  private total2xx: number = 0;
  private activeRequests: number = 0;
  private latencies: number[] = []; // Rolling buffer of last 1000 requests
  private maxLatencyBufferSize: number = 1000;
  private rateLimitViolations: number = 0;
  private authFailures: number = 0;
  private playbackAuthFailures: number = 0;
  private drmAuthFailures: number = 0;
  private statusCodeCounts: Record<string, number> = {};
  private endpointCounts: Record<string, number> = {};
  private minuteRequestCounter: number = 0;
  private requestsPerMinute: number = 0;

  // Domain Subsystem Counters
  private authMetrics = {
    loginSuccess: 0,
    loginFailure: 0,
    expiredSessions: 0,
    invalidTokens: 0,
    unauthorizedRequests: 0,
  };

  private qrMetrics = {
    verificationAttempts: 0,
    successfulVerifications: 0,
    invalidQrCount: 0,
    expiredQrCount: 0,
    duplicateQrCount: 0,
    crossTheatreAttempts: 0,
  };

  private watermarkMetrics = {
    rotationsTotal: 0,
    rotationFailures: 0,
    attributionAttempts: 0,
    attributionSuccess: 0,
    attributionFailure: 0,
  };

  private evidenceMetrics = {
    recordsCreated: 0,
    verificationCount: 0,
    hashMismatches: 0,
    vaultStatus: "HEALTHY" as "HEALTHY" | "DEGRADED" | "TAMPERED",
  };

  private socMetrics = {
    eventsReceived: 0,
    eventsRejected: 0,
    highSeverityEvents: 0,
    incidentCreationRate: 0,
    telemetryRetryQueueDepth: 0,
  };

  private recoveryMetrics = {
    backupAgeMinutes: 5,
    backupVerificationStatus: "VERIFIED" as "VERIFIED" | "PENDING" | "CORRUPTED" | "MISSING",
    rpoStatus: "COMPLIANT" as "COMPLIANT" | "NON_COMPLIANT",
    rtoStatus: "READY" as "READY" | "DEGRADED",
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

  public incrementActive(): void {
    this.activeRequests++;
  }

  public decrementActive(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
  }

  public recordRequest(endpoint: string, statusCode: number, durationMs: number): void {
    this.totalRequests++;
    this.minuteRequestCounter++;

    // Track status codes
    const statusKey = `${Math.floor(statusCode / 100)}xx`;
    this.statusCodeCounts[statusKey] = (this.statusCodeCounts[statusKey] || 0) + 1;

    if (statusCode >= 200 && statusCode < 300) {
      this.total2xx++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.total4xx++;
      this.totalErrors++;
      if (statusCode === 401 || statusCode === 403) {
        this.authMetrics.unauthorizedRequests++;
      }
    } else if (statusCode >= 500) {
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
  public recordLoginSuccess(): void {
    this.authMetrics.loginSuccess++;
  }

  public recordLoginFailure(): void {
    this.authMetrics.loginFailure++;
    this.authFailures++;
  }

  public recordExpiredSession(): void {
    this.authMetrics.expiredSessions++;
  }

  public recordInvalidToken(): void {
    this.authMetrics.invalidTokens++;
  }

  // QR Verification Instrumentation
  public recordQrVerificationAttempt(): void {
    this.qrMetrics.verificationAttempts++;
  }

  public recordQrVerificationSuccess(): void {
    this.qrMetrics.successfulVerifications++;
  }

  public recordInvalidQr(): void {
    this.qrMetrics.invalidQrCount++;
  }

  public recordExpiredQr(): void {
    this.qrMetrics.expiredQrCount++;
  }

  public recordDuplicateQr(): void {
    this.qrMetrics.duplicateQrCount++;
  }

  public recordCrossTheatreAttempt(): void {
    this.qrMetrics.crossTheatreAttempts++;
  }

  // Watermark Instrumentation
  public recordWatermarkRotation(success = true): void {
    this.watermarkMetrics.rotationsTotal++;
    if (!success) this.watermarkMetrics.rotationFailures++;
  }

  public recordWatermarkAttribution(success = true): void {
    this.watermarkMetrics.attributionAttempts++;
    if (success) {
      this.watermarkMetrics.attributionSuccess++;
    } else {
      this.watermarkMetrics.attributionFailure++;
    }
  }

  // Evidence Instrumentation
  public recordEvidenceCreated(): void {
    this.evidenceMetrics.recordsCreated++;
  }

  public recordEvidenceVerification(mismatches = 0): void {
    this.evidenceMetrics.verificationCount++;
    if (mismatches > 0) {
      this.evidenceMetrics.hashMismatches += mismatches;
      this.evidenceMetrics.vaultStatus = "TAMPERED";
    }
  }

  // SOC Instrumentation
  public recordSocEvent(severity: string, rejected = false): void {
    this.socMetrics.eventsReceived++;
    if (rejected) this.socMetrics.eventsRejected++;
    if (["HIGH", "CRITICAL"].includes(severity.toUpperCase())) {
      this.socMetrics.highSeverityEvents++;
    }
  }

  public setTelemetryQueueDepth(depth: number): void {
    this.socMetrics.telemetryRetryQueueDepth = Math.max(0, depth);
  }

  // Recovery & DR Instrumentation
  public updateRecoveryMetrics(params: {
    backupAgeMinutes?: number;
    backupStatus?: "VERIFIED" | "PENDING" | "CORRUPTED" | "MISSING";
    rpoCompliant?: boolean;
    rtoReady?: boolean;
  }): void {
    if (params.backupAgeMinutes !== undefined) this.recoveryMetrics.backupAgeMinutes = params.backupAgeMinutes;
    if (params.backupStatus) this.recoveryMetrics.backupVerificationStatus = params.backupStatus;
    if (params.rpoCompliant !== undefined) this.recoveryMetrics.rpoStatus = params.rpoCompliant ? "COMPLIANT" : "NON_COMPLIANT";
    if (params.rtoReady !== undefined) this.recoveryMetrics.rtoStatus = params.rtoReady ? "READY" : "DEGRADED";
  }

  public recordRecoveryAttempt(success = true): void {
    this.recoveryMetrics.recoveryAttempts++;
    if (!success) this.recoveryMetrics.recoveryFailures++;
  }

  public recordRollbackEvent(): void {
    this.recoveryMetrics.rollbackEvents++;
  }

  public recordRateLimitViolation(): void {
    this.rateLimitViolations++;
  }

  public recordAuthFailure(): void {
    this.recordLoginFailure();
  }

  public recordPlaybackAuthFailure(): void {
    this.playbackAuthFailures++;
  }

  public recordDrmAuthFailure(): void {
    this.drmAuthFailures++;
  }

  public getMetrics(): PerformanceMetrics {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const errorRatePercent =
      this.totalRequests > 0
        ? parseFloat(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
        : 0;
    const error4xxRatePercent =
      this.totalRequests > 0
        ? parseFloat(((this.total4xx / this.totalRequests) * 100).toFixed(2))
        : 0;
    const error5xxRatePercent =
      this.totalRequests > 0
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

  public getLatencyPercentiles(): { p50: number; p95: number; p99: number } {
    const m = this.getMetrics();
    return {
      p50: m.p50LatencyMs,
      p95: m.p95LatencyMs,
      p99: m.p99LatencyMs,
    };
  }

  public getMetricsSummary(): {
    totalRequests: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    activeRequests: number;
    authSuccesses: number;
    authFailures: number;
    qrValidations: number;
    qrRejections: number;
    watermarksEmbedded: number;
    socEventsProcessed: number;
  } {
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

export const metricsService = new MetricsService();

