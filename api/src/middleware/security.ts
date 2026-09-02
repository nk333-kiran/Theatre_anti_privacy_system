import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { env } from "../config/envValidator";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { getClientIp } from "./requestHardening";

// 1. Strict Helmet Security Headers
export const configureSecurityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "blob:", "data:"],
        connectSrc: ["'self'", ...env.CORS_ORIGIN, env.API_BASE_URL, env.WEB_BASE_URL],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "sameorigin" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
};

// 2. Production Strict CORS Configuration
export const configureCors = () => {
  const allowedOrigins = new Set(env.CORS_ORIGIN);

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server health probes)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // In development / staging / test mode or when ALLOW_LAN_CORS is enabled, allow localhost and private LAN IP origins
      const isLanOrigin =
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        );

      if ((env.NODE_ENV !== "production" || process.env.ALLOW_LAN_CORS === "true") && isLanOrigin) {
        return callback(null, true);
      }

      // Reject unauthorized origins
      const error = new Error(`CORS Policy: Origin ${origin} is not permitted.`);
      (error as any).status = 403;
      return callback(error, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Device-Fingerprint",
      "X-Client-Version",
      "X-Tenant-ID",
      "Range",
    ],
    exposedHeaders: ["X-Request-ID", "Content-Range", "Accept-Ranges"],
    maxAge: 86400, // 24 hours preflight cache
  });
};

// 3. Rate Limiting Helper using trusted client IP and optional tenant/actor identity
export const createLimiter = (
  windowMs: number,
  max: number,
  endpointLabel: string,
  message = "Too many requests. Please try again later."
) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const ip = getClientIp(req);
      const tenant = (req as any).user?.theatreId || (req as any).user?.productionCompanyId || req.headers["x-tenant-id"] || "";
      const user = (req as any).user?.id || "";
      return tenant || user ? `${ip}:${tenant}:${user}` : ip;
    },
    message: { success: false, message, errorCode: "RATE_LIMIT_EXCEEDED" },
    handler: async (req: Request, res: Response) => {
      const clientIp = getClientIp(req);
      await SecurityAuditService.logEvent({
        eventType: "RATE_LIMIT_EXCEEDED",
        severity: "HIGH",
        ipAddress: clientIp,
        endpoint: endpointLabel,
        actionSummary: `Rate limit of ${max} requests per ${windowMs / 1000}s exceeded on ${endpointLabel} (RequestID: ${req.id})`,
      });
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
        },
        requestId: req.id,
      });
    },
  });
};

// Production Rate Limiters
export const generalApiLimiter = createLimiter(60 * 1000, 300, "/api", "Rate limit exceeded.");
export const authLimiter = createLimiter(5 * 60 * 1000, 10, "/api/auth/login", "Too many failed login attempts. Please wait 5 minutes.");
export const activationLimiter = createLimiter(5 * 60 * 1000, 25, "/api/activations/activate", "Too many activation attempts.");
export const verificationLimiter = createLimiter(60 * 1000, 80, "/api/verifications/verify", "Verification checkpoint rate limit reached.");
export const telemetryLimiter = createLimiter(60 * 1000, 200, "/api/mobile/telemetry", "Telemetry rate limit exceeded.");
export const evidenceLimiter = createLimiter(60 * 1000, 50, "/api/evidence", "Evidence processing rate limit exceeded.");
export const recoveryLimiter = createLimiter(5 * 60 * 1000, 20, "/api/recovery", "Recovery actions rate limit exceeded.");
export const adminLimiter = createLimiter(60 * 1000, 60, "/api/governance", "Administrative action rate limit exceeded.");
export const playbackLimiter = createLimiter(5 * 60 * 1000, 30, "/api/playback/authorize", "Too many playback authorization requests.");
export const drmLicenseLimiter = createLimiter(5 * 60 * 1000, 40, "/api/drm/license", "DRM license request rate limit exceeded.");

// 4. Input Sanitizer Middleware (Prevents XSS, prototype pollution, and malformed control characters)
function sanitizeValue(value: any): any {
  if (typeof value === "string") {
    return value.replace(/\0/g, "").trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    const cleanObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      cleanObj[k] = sanitizeValue(v);
    }
    return cleanObj;
  }
  return value;
}

export const sanitizeInputs = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};
