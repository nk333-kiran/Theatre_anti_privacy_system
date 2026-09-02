import { Request, Response, NextFunction } from "express";
import { env } from "../../config/envValidator";
import { SecurityAuditService } from "../security/securityAuditService";
import { SecurityEventType, SecuritySeverity } from "@antipiracy/database";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  clientIp?: string;
  userAgent?: string;
  errorCode?: string;
  message?: string;
  metadata?: Record<string, any>;
  error?: any;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
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

export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
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
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        clean[key] = "[REDACTED]";
      } else if (lowerKey.includes("secret") || lowerKey.includes("password") || lowerKey.includes("key")) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = redactSensitiveData(value);
      }
    }
    return clean;
  }
  return data;
}

class StructuredLogger {
  private serviceName = "theatre-anti-piracy-api";
  private minLevel: LogLevel = env.LOG_LEVEL;

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private formatLog(payload: LogPayload): string {
    const sanitized = redactSensitiveData(payload);
    if (env.NODE_ENV === "development") {
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

  public debug(message: string, meta?: Record<string, any>, req?: Request): void {
    if (!this.shouldLog("debug")) return;
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level: "debug",
      service: this.serviceName,
      environment: env.NODE_ENV,
      requestId: req?.id,
      method: req?.method,
      route: req?.originalUrl || req?.path,
      message,
      metadata: meta,
    };
    console.debug(this.formatLog(payload));
  }

  public info(message: string, meta?: Record<string, any>, req?: Request): void {
    if (!this.shouldLog("info")) return;
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level: "info",
      service: this.serviceName,
      environment: env.NODE_ENV,
      requestId: req?.id,
      method: req?.method,
      route: req?.originalUrl || req?.path,
      message,
      metadata: meta,
    };
    console.log(this.formatLog(payload));
  }

  public warn(message: string, meta?: Record<string, any>, req?: Request): void {
    if (!this.shouldLog("warn")) return;
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level: "warn",
      service: this.serviceName,
      environment: env.NODE_ENV,
      requestId: req?.id,
      method: req?.method,
      route: req?.originalUrl || req?.path,
      message,
      metadata: meta,
    };
    console.warn(this.formatLog(payload));
  }

  public error(message: string, error?: any, meta?: Record<string, any>, req?: Request): void {
    if (!this.shouldLog("error")) return;
    const isProd = env.NODE_ENV === "production";
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level: "error",
      service: this.serviceName,
      environment: env.NODE_ENV,
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
  public logHttpRequest(req: Request, res: Response, durationMs: number): void {
    const status = res.statusCode;
    const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    if (!this.shouldLog(level)) return;

    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      environment: env.NODE_ENV,
      requestId: req.id,
      method: req.method,
      route: req.originalUrl || req.path,
      status,
      durationMs,
      clientIp: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : undefined,
    };

    if (level === "error") {
      console.error(this.formatLog(payload));
    } else if (level === "warn") {
      console.warn(this.formatLog(payload));
    } else {
      console.log(this.formatLog(payload));
    }
  }
}

export const logger = new StructuredLogger();

/**
 * Express Request Logger Middleware
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.logHttpRequest(req, res, durationMs);
  });

  next();
};
