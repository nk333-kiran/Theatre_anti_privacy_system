"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prometheusExporter = exports.PrometheusExporter = void 0;
const metricsService_1 = require("./metricsService");
const envValidator_1 = require("../../config/envValidator");
class PrometheusExporter {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PrometheusExporter.instance) {
            PrometheusExporter.instance = new PrometheusExporter();
        }
        return PrometheusExporter.instance;
    }
    /**
     * Generates Prometheus exposition format (text/plain; version=0.0.4)
     */
    exportMetricsText() {
        const summary = metricsService_1.metricsService.getMetricsSummary();
        const percentiles = metricsService_1.metricsService.getLatencyPercentiles();
        const lines = [];
        lines.push("# HELP http_requests_total Total number of HTTP requests processed");
        lines.push("# TYPE http_requests_total counter");
        lines.push(`http_requests_total{app="theatre_antipiracy",env="${envValidator_1.env.NODE_ENV}"} ${summary.totalRequests}`);
        lines.push("# HELP http_requests_by_status Total HTTP requests partitioned by status code class");
        lines.push("# TYPE http_requests_by_status counter");
        lines.push(`http_requests_by_status{status="2xx"} ${summary.status2xx}`);
        lines.push(`http_requests_by_status{status="4xx"} ${summary.status4xx}`);
        lines.push(`http_requests_by_status{status="5xx"} ${summary.status5xx}`);
        lines.push("# HELP http_active_requests Current in-flight HTTP requests");
        lines.push("# TYPE http_active_requests gauge");
        lines.push(`http_active_requests{app="theatre_antipiracy"} ${summary.activeRequests}`);
        lines.push("# HELP http_request_duration_ms HTTP request latency percentiles in milliseconds");
        lines.push("# TYPE http_request_duration_ms gauge");
        lines.push(`http_request_duration_ms{quantile="0.50"} ${percentiles.p50}`);
        lines.push(`http_request_duration_ms{quantile="0.95"} ${percentiles.p95}`);
        lines.push(`http_request_duration_ms{quantile="0.99"} ${percentiles.p99}`);
        lines.push("# HELP auth_attempts_total Total authentication attempts partitioned by result");
        lines.push("# TYPE auth_attempts_total counter");
        lines.push(`auth_attempts_total{result="success"} ${summary.authSuccesses}`);
        lines.push(`auth_attempts_total{result="failure"} ${summary.authFailures}`);
        lines.push("# HELP qr_admissions_total Total QR ticket admissions partitioned by result");
        lines.push("# TYPE qr_admissions_total counter");
        lines.push(`qr_admissions_total{result="success"} ${summary.qrValidations}`);
        lines.push(`qr_admissions_total{result="failure"} ${summary.qrRejections}`);
        lines.push("# HELP watermarking_sessions_active Active forensic watermarking sessions");
        lines.push("# TYPE watermarking_sessions_active gauge");
        lines.push(`watermarking_sessions_active ${summary.watermarksEmbedded}`);
        lines.push("# HELP soc_threat_events_total Security operations center threat events ingested");
        lines.push("# TYPE soc_threat_events_total counter");
        lines.push(`soc_threat_events_total ${summary.socEventsProcessed}`);
        return lines.join("\n") + "\n";
    }
}
exports.PrometheusExporter = PrometheusExporter;
exports.prometheusExporter = PrometheusExporter.getInstance();
