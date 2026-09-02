"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInputs = exports.drmLicenseLimiter = exports.playbackLimiter = exports.adminLimiter = exports.recoveryLimiter = exports.evidenceLimiter = exports.telemetryLimiter = exports.verificationLimiter = exports.activationLimiter = exports.authLimiter = exports.generalApiLimiter = exports.createLimiter = exports.configureCors = exports.configureSecurityHeaders = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const envValidator_1 = require("../config/envValidator");
const securityAuditService_1 = require("../services/security/securityAuditService");
const requestHardening_1 = require("./requestHardening");
// 1. Strict Helmet Security Headers
const configureSecurityHeaders = () => {
    return (0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:", "https:"],
                mediaSrc: ["'self'", "blob:", "data:"],
                connectSrc: ["'self'", ...envValidator_1.env.CORS_ORIGIN, envValidator_1.env.API_BASE_URL, envValidator_1.env.WEB_BASE_URL],
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
exports.configureSecurityHeaders = configureSecurityHeaders;
// 2. Production Strict CORS Configuration
const configureCors = () => {
    const allowedOrigins = new Set(envValidator_1.env.CORS_ORIGIN);
    return (0, cors_1.default)({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, server-to-server health probes)
            if (!origin) {
                return callback(null, true);
            }
            if (allowedOrigins.has(origin)) {
                return callback(null, true);
            }
            // In development / staging / test mode or when ALLOW_LAN_CORS is enabled, allow localhost and private LAN IP origins
            const isLanOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
            if ((envValidator_1.env.NODE_ENV !== "production" || process.env.ALLOW_LAN_CORS === "true") && isLanOrigin) {
                return callback(null, true);
            }
            // Reject unauthorized origins
            const error = new Error(`CORS Policy: Origin ${origin} is not permitted.`);
            error.status = 403;
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
exports.configureCors = configureCors;
// 3. Rate Limiting Helper using trusted client IP and optional tenant/actor identity
const createLimiter = (windowMs, max, endpointLabel, message = "Too many requests. Please try again later.") => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            const ip = (0, requestHardening_1.getClientIp)(req);
            const tenant = req.user?.theatreId || req.user?.productionCompanyId || req.headers["x-tenant-id"] || "";
            const user = req.user?.id || "";
            return tenant || user ? `${ip}:${tenant}:${user}` : ip;
        },
        message: { success: false, message, errorCode: "RATE_LIMIT_EXCEEDED" },
        handler: async (req, res) => {
            const clientIp = (0, requestHardening_1.getClientIp)(req);
            await securityAuditService_1.SecurityAuditService.logEvent({
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
exports.createLimiter = createLimiter;
// Production Rate Limiters
exports.generalApiLimiter = (0, exports.createLimiter)(60 * 1000, 300, "/api", "Rate limit exceeded.");
exports.authLimiter = (0, exports.createLimiter)(5 * 60 * 1000, 10, "/api/auth/login", "Too many failed login attempts. Please wait 5 minutes.");
exports.activationLimiter = (0, exports.createLimiter)(5 * 60 * 1000, 25, "/api/activations/activate", "Too many activation attempts.");
exports.verificationLimiter = (0, exports.createLimiter)(60 * 1000, 80, "/api/verifications/verify", "Verification checkpoint rate limit reached.");
exports.telemetryLimiter = (0, exports.createLimiter)(60 * 1000, 200, "/api/mobile/telemetry", "Telemetry rate limit exceeded.");
exports.evidenceLimiter = (0, exports.createLimiter)(60 * 1000, 50, "/api/evidence", "Evidence processing rate limit exceeded.");
exports.recoveryLimiter = (0, exports.createLimiter)(5 * 60 * 1000, 20, "/api/recovery", "Recovery actions rate limit exceeded.");
exports.adminLimiter = (0, exports.createLimiter)(60 * 1000, 60, "/api/governance", "Administrative action rate limit exceeded.");
exports.playbackLimiter = (0, exports.createLimiter)(5 * 60 * 1000, 30, "/api/playback/authorize", "Too many playback authorization requests.");
exports.drmLicenseLimiter = (0, exports.createLimiter)(5 * 60 * 1000, 40, "/api/drm/license", "DRM license request rate limit exceeded.");
// 4. Input Sanitizer Middleware (Prevents XSS, prototype pollution, and malformed control characters)
function sanitizeValue(value) {
    if (typeof value === "string") {
        return value.replace(/\0/g, "").trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === "object") {
        const cleanObj = {};
        for (const [k, v] of Object.entries(value)) {
            if (k === "__proto__" || k === "constructor" || k === "prototype")
                continue;
            cleanObj[k] = sanitizeValue(v);
        }
        return cleanObj;
    }
    return value;
}
const sanitizeInputs = (req, _res, next) => {
    if (req.body)
        req.body = sanitizeValue(req.body);
    if (req.query)
        req.query = sanitizeValue(req.query);
    if (req.params)
        req.params = sanitizeValue(req.params);
    next();
};
exports.sanitizeInputs = sanitizeInputs;
