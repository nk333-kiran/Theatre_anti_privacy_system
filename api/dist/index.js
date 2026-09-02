"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = gracefulShutdown;
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const theatreRoutes_1 = __importDefault(require("./routes/theatreRoutes"));
const movieRoutes_1 = __importDefault(require("./routes/movieRoutes"));
const showRoutes_1 = __importDefault(require("./routes/showRoutes"));
const ticketRoutes_1 = __importDefault(require("./routes/ticketRoutes"));
const activationRoutes_1 = __importDefault(require("./routes/activationRoutes"));
const verificationRoutes_1 = __importDefault(require("./routes/verificationRoutes"));
const protectionRoutes_1 = __importDefault(require("./routes/protectionRoutes"));
const productionCompanyRoutes_1 = __importDefault(require("./routes/productionCompanyRoutes"));
const playbackRoutes_1 = __importDefault(require("./routes/playbackRoutes"));
const videoAssetRoutes_1 = __importDefault(require("./routes/videoAssetRoutes"));
const drmRoutes_1 = __importDefault(require("./routes/drmRoutes"));
const securityRoutes_1 = __importDefault(require("./routes/securityRoutes"));
const operationsRoutes_1 = __importDefault(require("./routes/operationsRoutes"));
const investigationRoutes_1 = __importDefault(require("./routes/investigationRoutes"));
const incidentRoutes_1 = __importDefault(require("./routes/incidentRoutes"));
const deviceRoutes_1 = __importDefault(require("./routes/deviceRoutes"));
const intelligenceRoutes_1 = __importDefault(require("./routes/intelligenceRoutes"));
const realtimeRoutes_1 = __importDefault(require("./routes/realtimeRoutes"));
const evidenceRoutes_1 = __importDefault(require("./routes/evidenceRoutes"));
const threatIntelRoutes_1 = __importDefault(require("./routes/threatIntelRoutes"));
const governanceRoutes_1 = require("./routes/governanceRoutes");
const socRoutes_1 = require("./routes/socRoutes");
const mobileRoutes_1 = __importDefault(require("./routes/mobileRoutes"));
const enforcementRoutes_1 = __importDefault(require("./routes/enforcementRoutes"));
const orchestrationRoutes_1 = __importDefault(require("./routes/orchestrationRoutes"));
const recoveryRoutes_1 = __importDefault(require("./routes/recoveryRoutes"));
const productionRoutes_1 = __importDefault(require("./routes/productionRoutes"));
const dataImportRoutes_1 = __importDefault(require("./routes/dataImportRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const envValidator_1 = require("./config/envValidator");
const security_1 = require("./middleware/security");
const correlationId_1 = require("./middleware/correlationId");
const logger_1 = require("./services/logging/logger");
const requestHardening_1 = require("./middleware/requestHardening");
const maintenanceMode_1 = require("./middleware/maintenanceMode");
const metricsService_1 = require("./services/observability/metricsService");
const lifecycleService_1 = require("./services/production/lifecycleService");
const app = (0, express_1.default)();
const PORT = envValidator_1.env.PORT || 4000;
// Configure Reverse Proxy Trust
if (envValidator_1.env.TRUST_PROXY) {
    app.set("trust proxy", envValidator_1.env.TRUST_PROXY);
}
// 1. Request Correlation ID & Performance Metrics Tracker
app.use(correlationId_1.correlationIdMiddleware);
// Track active in-flight requests and response metrics
app.use((req, res, next) => {
    metricsService_1.metricsService.incrementActive();
    lifecycleService_1.lifecycleManager.incrementInFlight();
    const start = Date.now();
    res.on("finish", () => {
        metricsService_1.metricsService.decrementActive();
        lifecycleService_1.lifecycleManager.decrementInFlight();
        metricsService_1.metricsService.recordRequest(req.originalUrl || req.path, res.statusCode, Date.now() - start);
    });
    res.on("close", () => {
        metricsService_1.metricsService.decrementActive();
        lifecycleService_1.lifecycleManager.decrementInFlight();
    });
    next();
});
// 2. Structured Request Logging
app.use(logger_1.requestLoggerMiddleware);
// 3. Security Headers (Helmet) & Strict Production CORS
app.use((0, security_1.configureSecurityHeaders)());
app.use((0, security_1.configureCors)());
// 4. Request Hardening & Size Limits
app.use((0, requestHardening_1.requestTimeoutMiddleware)(envValidator_1.env.REQUEST_TIMEOUT_MS));
app.use(requestHardening_1.validateRequestHeaders);
app.use(requestHardening_1.preventParameterPollution);
// Safe body parsers with size limit
app.use(express_1.default.json({ limit: "2mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "2mb" }));
app.use(security_1.sanitizeInputs);
// 5. Root Health & Probe Endpoints (Accessible to load balancers, orchestrators, and container probes)
app.use(healthRoutes_1.default);
// 6. Maintenance Mode Filter
app.use(maintenanceMode_1.maintenanceModeMiddleware);
// 7. Global API Rate Limiter
app.use("/api", security_1.generalApiLimiter);
// 8. Main API Feature Routes
app.use("/api", healthRoutes_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/theatres", theatreRoutes_1.default);
app.use("/api/movies", movieRoutes_1.default);
app.use("/api/shows", showRoutes_1.default);
app.use("/api/tickets", ticketRoutes_1.default);
app.use("/api/activations", activationRoutes_1.default);
app.use("/api/verifications", verificationRoutes_1.default);
app.use("/api/protection", protectionRoutes_1.default);
app.use("/api/production-company", productionCompanyRoutes_1.default);
app.use("/api/playback", playbackRoutes_1.default);
app.use("/api/video-assets", videoAssetRoutes_1.default);
app.use("/api/drm", drmRoutes_1.default);
app.use("/api/security", securityRoutes_1.default);
app.use("/api/operations", operationsRoutes_1.default);
app.use("/api/investigations", investigationRoutes_1.default);
app.use("/api/incidents", incidentRoutes_1.default);
app.use("/api/devices", deviceRoutes_1.default);
app.use("/api/intelligence", intelligenceRoutes_1.default);
app.use("/api/realtime", realtimeRoutes_1.default);
app.use("/api/evidence", evidenceRoutes_1.default);
app.use("/api/threat-intelligence", threatIntelRoutes_1.default);
app.use("/api/governance", governanceRoutes_1.governanceRouter);
app.use("/api/soc", socRoutes_1.socRouter);
app.use("/api/mobile", mobileRoutes_1.default);
app.use("/api/enforcement", enforcementRoutes_1.default);
app.use("/api/orchestration", orchestrationRoutes_1.default);
app.use("/api/recovery", recoveryRoutes_1.default);
app.use("/api/production", productionRoutes_1.default);
app.use("/api/production-ops", productionRoutes_1.default);
app.use("/api/production-readiness", productionRoutes_1.default);
app.use("/api/data-import", dataImportRoutes_1.default);
// 9. Catch 404
app.use((req, _res, next) => {
    next(new errorHandler_1.AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
});
// 10. Centralized Error Handling
app.use(errorHandler_1.errorHandler);
let server = null;
if (process.env.NODE_ENV !== "test") {
    server = app.listen(PORT, () => {
        lifecycleService_1.lifecycleManager.setReady();
        logger_1.logger.info(`🚀 Theatre Anti-Piracy Platform API running on port ${PORT}`, {
            port: PORT,
            environment: envValidator_1.env.NODE_ENV,
            version: envValidator_1.env.APP_VERSION,
            maintenanceMode: envValidator_1.env.MAINTENANCE_MODE,
            lifecycle: lifecycleService_1.lifecycleManager.getState(),
        });
        logger_1.logger.info(`📡 Health Check URL: http://localhost:${PORT}/health`);
        logger_1.logger.info(`🛡️ SOC Operations URL: http://localhost:${PORT}/api/operations/health`);
        logger_1.logger.info(`🏷️ Release Version URL: http://localhost:${PORT}/api/production/version`);
    });
}
/**
 * Graceful Shutdown Handler
 * Sequences: Stop accepting requests → Drain in-flight connections → Execute lifecycle hooks → Terminate cleanly
 */
let isShuttingDown = false;
async function gracefulShutdown(signal) {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    logger_1.logger.warn(`Received ${signal}. Initiating graceful shutdown sequence...`);
    const forceExitTimeout = setTimeout(() => {
        logger_1.logger.error(`Graceful shutdown timed out (${envValidator_1.env.DRAIN_TIMEOUT_MS}ms). Forcing exit.`);
        process.exit(1);
    }, envValidator_1.env.DRAIN_TIMEOUT_MS);
    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err)
                        return reject(err);
                    logger_1.logger.info("HTTP Server closed. No longer accepting new requests.");
                    resolve();
                });
            });
        }
        await lifecycleService_1.lifecycleManager.executeGracefulShutdown(envValidator_1.env.DRAIN_TIMEOUT_MS);
        clearTimeout(forceExitTimeout);
        logger_1.logger.info("✅ Graceful shutdown completed successfully. Exiting.");
        if (process.env.NODE_ENV !== "test") {
            process.exit(0);
        }
    }
    catch (err) {
        logger_1.logger.error("Error during graceful shutdown execution:", err);
        clearTimeout(forceExitTimeout);
        if (process.env.NODE_ENV !== "test") {
            process.exit(1);
        }
    }
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
exports.default = app;
