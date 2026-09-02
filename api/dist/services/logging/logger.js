"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggerMiddleware = exports.logger = void 0;
exports.redactSensitiveData = redactSensitiveData;
const envValidator_1 = require("../../config/envValidator");
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
// Sensitive keys to strictly redact from any log output
const SENSITIVE_KEYS = new Set([
    "password",
    "passwordhash",
    "token",
    "jwt",
    "jwtsecret",
    "secret",
    "apikey",
    "authorization",
    "rawmasterkey",
    "rawsecretkey",
    "drmkey",
    "drmapikey",
    "drmapisecret",
    "cookie",
    "creditcard",
    "cardnumber",
    "cvv",
    "activationcode",
    "sessiontoken",
    "licensetoken",
]);
function redactSensitiveData(data) {
    if (data === null || data === undefined)
        return data;
    if (typeof data === "string") {
        // Redact bearer tokens if present in string
        if (/bearer\s+[a-zA-Z0-9\-_.]+/i.test(data)) {
            return data.replace(/bearer\s+[a-zA-Z0-9\-_.]+/gi, "Bearer [REDACTED]");
        }
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(redactSensitiveData);
    }
    if (typeof data === "object") {
        const clean = {};
        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            if (SENSITIVE_KEYS.has(lowerKey)) {
                clean[key] = "[REDACTED]";
            }
            else if (lowerKey.includes("secret") || lowerKey.includes("password") || lowerKey.includes("key")) {
                clean[key] = "[REDACTED]";
            }
            else {
                clean[key] = redactSensitiveData(value);
            }
        }
        return clean;
    }
    return data;
}
class StructuredLogger {
    serviceName = "theatre-anti-piracy-api";
    minLevel = envValidator_1.env.LOG_LEVEL;
    shouldLog(level) {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
    }
    formatLog(payload) {
        const sanitized = redactSensitiveData(payload);
        if (envValidator_1.env.NODE_ENV === "development") {
            const statusStr = sanitized.status ? ` [${sanitized.status}]` : "";
            const methodStr = sanitized.method ? ` ${sanitized.method}` : "";
            const routeStr = sanitized.route ? ` ${sanitized.route}` : "";
            const durStr = sanitized.durationMs !== undefined ? ` (${sanitized.durationMs}ms)` : "";
            const reqIdStr = sanitized.requestId ? ` [${sanitized.requestId}]` : "";
            const errStr = sanitized.errorCode ? ` [ERR:${sanitized.errorCode}]` : "";
            const msgStr = sanitized.message ? ` - ${sanitized.message}` : "";
            return `[${sanitized.timestamp}] [${sanitized.level.toUpperCase()}]${reqIdStr}${methodStr}${routeStr}${statusStr}${durStr}${errStr}${msgStr}`;
        }
        return JSON.stringify(sanitized);
    }
    debug(message, meta, req) {
        if (!this.shouldLog("debug"))
            return;
        const payload = {
            timestamp: new Date().toISOString(),
            level: "debug",
            service: this.serviceName,
            environment: envValidator_1.env.NODE_ENV,
            requestId: req?.id,
            method: req?.method,
            route: req?.originalUrl || req?.path,
            message,
            metadata: meta,
        };
        console.debug(this.formatLog(payload));
    }
    info(message, meta, req) {
        if (!this.shouldLog("info"))
            return;
        const payload = {
            timestamp: new Date().toISOString(),
            level: "info",
            service: this.serviceName,
            environment: envValidator_1.env.NODE_ENV,
            requestId: req?.id,
            method: req?.method,
            route: req?.originalUrl || req?.path,
            message,
            metadata: meta,
        };
        console.log(this.formatLog(payload));
    }
    warn(message, meta, req) {
        if (!this.shouldLog("warn"))
            return;
        const payload = {
            timestamp: new Date().toISOString(),
            level: "warn",
            service: this.serviceName,
            environment: envValidator_1.env.NODE_ENV,
            requestId: req?.id,
            method: req?.method,
            route: req?.originalUrl || req?.path,
            message,
            metadata: meta,
        };
        console.warn(this.formatLog(payload));
    }
    error(message, error, meta, req) {
        if (!this.shouldLog("error"))
            return;
        const isProd = envValidator_1.env.NODE_ENV === "production";
        const payload = {
            timestamp: new Date().toISOString(),
            level: "error",
            service: this.serviceName,
            environment: envValidator_1.env.NODE_ENV,
            requestId: req?.id,
            method: req?.method,
            route: req?.originalUrl || req?.path,
            errorCode: error?.code || "INTERNAL_ERROR",
            message,
            metadata: meta,
            error: isProd ? undefined : error?.stack || error?.message || error,
        };
        console.error(this.formatLog(payload));
    }
    /**
     * Log completed HTTP request
     */
    logHttpRequest(req, res, durationMs) {
        const status = res.statusCode;
        const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
        if (!this.shouldLog(level))
            return;
        const payload = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            environment: envValidator_1.env.NODE_ENV,
            requestId: req.id,
            method: req.method,
            route: req.originalUrl || req.path,
            status,
            durationMs,
            clientIp: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
            userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : undefined,
        };
        if (level === "error") {
            console.error(this.formatLog(payload));
        }
        else if (level === "warn") {
            console.warn(this.formatLog(payload));
        }
        else {
            console.log(this.formatLog(payload));
        }
    }
}
exports.logger = new StructuredLogger();
/**
 * Express Request Logger Middleware
 */
const requestLoggerMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const durationMs = Date.now() - start;
        exports.logger.logHttpRequest(req, res, durationMs);
    });
    next();
};
exports.requestLoggerMiddleware = requestLoggerMiddleware;
