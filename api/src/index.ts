import express from "express";
import http from "http";
import path from "path";
import { prisma } from "@antipiracy/database";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import healthRoutes from "./routes/healthRoutes";
import theatreRoutes from "./routes/theatreRoutes";
import movieRoutes from "./routes/movieRoutes";
import showRoutes from "./routes/showRoutes";
import ticketRoutes from "./routes/ticketRoutes";
import activationRoutes from "./routes/activationRoutes";
import verificationRoutes from "./routes/verificationRoutes";
import protectionRoutes from "./routes/protectionRoutes";
import productionCompanyRoutes from "./routes/productionCompanyRoutes";
import playbackRoutes from "./routes/playbackRoutes";
import videoAssetRoutes from "./routes/videoAssetRoutes";
import drmRoutes from "./routes/drmRoutes";
import securityRoutes from "./routes/securityRoutes";
import operationsRoutes from "./routes/operationsRoutes";
import investigationRoutes from "./routes/investigationRoutes";
import incidentRoutes from "./routes/incidentRoutes";
import deviceRoutes from "./routes/deviceRoutes";
import intelligenceRoutes from "./routes/intelligenceRoutes";
import realtimeRoutes from "./routes/realtimeRoutes";
import evidenceRoutes from "./routes/evidenceRoutes";
import threatIntelRoutes from "./routes/threatIntelRoutes";
import { governanceRouter } from "./routes/governanceRoutes";
import { socRouter } from "./routes/socRoutes";
import mobileRoutes from "./routes/mobileRoutes";
import enforcementRoutes from "./routes/enforcementRoutes";
import orchestrationRoutes from "./routes/orchestrationRoutes";
import recoveryRoutes from "./routes/recoveryRoutes";
import productionRoutes from "./routes/productionRoutes";
import dataImportRoutes from "./routes/dataImportRoutes";
import { errorHandler, AppError } from "./middleware/errorHandler";
import { env } from "./config/envValidator";
import {
  configureSecurityHeaders,
  configureCors,
  sanitizeInputs,
  generalApiLimiter,
} from "./middleware/security";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { requestLoggerMiddleware, logger } from "./services/logging/logger";
import {
  requestTimeoutMiddleware,
  preventParameterPollution,
  validateRequestHeaders,
} from "./middleware/requestHardening";
import { maintenanceModeMiddleware } from "./middleware/maintenanceMode";
import { metricsService } from "./services/observability/metricsService";
import { lifecycleManager } from "./services/production/lifecycleService";

const app = express();
const PORT = env.PORT || 4000;

// Configure Reverse Proxy Trust
if (env.TRUST_PROXY) {
  app.set("trust proxy", env.TRUST_PROXY);
}

// 1. Request Correlation ID & Performance Metrics Tracker
app.use(correlationIdMiddleware);

// Track active in-flight requests and response metrics
app.use((req, res, next) => {
  metricsService.incrementActive();
  lifecycleManager.incrementInFlight();
  const start = Date.now();

  res.on("finish", () => {
    metricsService.decrementActive();
    lifecycleManager.decrementInFlight();
    metricsService.recordRequest(req.originalUrl || req.path, res.statusCode, Date.now() - start);
  });

  res.on("close", () => {
    metricsService.decrementActive();
    lifecycleManager.decrementInFlight();
  });

  next();
});

// 2. Structured Request Logging
app.use(requestLoggerMiddleware);

// 3. Security Headers (Helmet) & Strict Production CORS
app.use(configureSecurityHeaders());
app.use(configureCors());

// 4. Request Hardening & Size Limits
app.use(requestTimeoutMiddleware(env.REQUEST_TIMEOUT_MS));
app.use(validateRequestHeaders);
app.use(preventParameterPollution);

// Safe body parsers with size limit
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(sanitizeInputs);

// 5. Root Health & Probe Endpoints (Accessible to load balancers, orchestrators, and container probes)
app.use(healthRoutes);

// 6. Maintenance Mode Filter
app.use(maintenanceModeMiddleware);

// 7. Global API Rate Limiter
app.use("/api", generalApiLimiter);

// 8. Main API Feature Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/activations", activationRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/protection", protectionRoutes);
app.use("/api/production-company", productionCompanyRoutes);
app.use("/api/playback", playbackRoutes);
app.use("/api/video-assets", videoAssetRoutes);
app.use("/api/drm", drmRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/operations", operationsRoutes);
app.use("/api/investigations", investigationRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/threat-intelligence", threatIntelRoutes);
app.use("/api/governance", governanceRouter);
app.use("/api/soc", socRouter);
app.use("/api/mobile", mobileRoutes);
app.use("/api/enforcement", enforcementRoutes);
app.use("/api/orchestration", orchestrationRoutes);
app.use("/api/recovery", recoveryRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/production-ops", productionRoutes);
app.use("/api/production-readiness", productionRoutes);
app.use("/api/data-import", dataImportRoutes);

// 9. Catch 404
app.use((req, _res, next) => {
  next(new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
});

// 10. Centralized Error Handling
app.use(errorHandler);

let server: http.Server | null = null;

if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    lifecycleManager.setReady();
    logger.info(`🚀 Theatre Anti-Piracy Platform API running on port ${PORT}`, {
      port: PORT,
      environment: env.NODE_ENV,
      version: env.APP_VERSION,
      maintenanceMode: env.MAINTENANCE_MODE,
      lifecycle: lifecycleManager.getState(),
    });
    logger.info(`📡 Health Check URL: http://localhost:${PORT}/health`);
    logger.info(`🛡️ SOC Operations URL: http://localhost:${PORT}/api/operations/health`);
    logger.info(`🏷️ Release Version URL: http://localhost:${PORT}/api/production/version`);
  });
}

/**
 * Graceful Shutdown Handler
 * Sequences: Stop accepting requests → Drain in-flight connections → Execute lifecycle hooks → Terminate cleanly
 */
let isShuttingDown = false;

export async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Received ${signal}. Initiating graceful shutdown sequence...`);

  const forceExitTimeout = setTimeout(() => {
    logger.error(`Graceful shutdown timed out (${env.DRAIN_TIMEOUT_MS}ms). Forcing exit.`);
    process.exit(1);
  }, env.DRAIN_TIMEOUT_MS);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) return reject(err);
          logger.info("HTTP Server closed. No longer accepting new requests.");
          resolve();
        });
      });
    }

    await lifecycleManager.executeGracefulShutdown(env.DRAIN_TIMEOUT_MS);

    clearTimeout(forceExitTimeout);
    logger.info("✅ Graceful shutdown completed successfully. Exiting.");
    if (process.env.NODE_ENV !== "test") {
      process.exit(0);
    }
  } catch (err) {
    logger.error("Error during graceful shutdown execution:", err);
    clearTimeout(forceExitTimeout);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
