import { Request, Response, NextFunction } from "express";
import { env } from "../config/envValidator";

/**
 * Extract safely sanitized client IP address based on trust proxy configuration
 */
export function getClientIp(req: Request): string {
  if (env.TRUST_PROXY) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const parts = forwarded.split(",").map((s) => s.trim());
      if (parts.length > 0 && parts[0]) {
        return parts[0];
      }
    }
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

/**
 * Request Timeout Middleware
 * Enforces a strict processing timeout to prevent long-hanging connections.
 */
export const requestTimeoutMiddleware = (timeoutMs = env.REQUEST_TIMEOUT_MS) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Exempt video uploads/streaming from short timeouts if necessary
    if (req.path.startsWith("/api/video-assets/upload") || req.path.startsWith("/api/playback/stream")) {
      return next();
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: {
            code: "REQUEST_TIMEOUT",
            message: "Request processing timed out. Please try again.",
          },
          requestId: req.id,
        });
      }
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
};

/**
 * HTTP Parameter Pollution (HPP) Defense
 * Prevents attackers from passing duplicate query parameters to bypass filters/auth
 */
export const preventParameterPollution = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      const val = req.query[key];
      if (Array.isArray(val)) {
        // Keep the last parameter value if duplicated unexpectedly
        req.query[key] = val[val.length - 1];
      }
    }
  }
  next();
};

/**
 * Malformed Request & Content-Type Validator
 */
export const validateRequestHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Reject request with suspicious or oversized headers
  const userAgent = req.headers["user-agent"];
  if (userAgent && userAgent.length > 1024) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_HEADER",
        message: "User-Agent header exceeds maximum allowable length.",
      },
      requestId: req.id,
    });
    return;
  }

  // Validate Content-Type for POST/PUT/PATCH with body
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.headers["content-type"];
    const hasBody = req.body && Object.keys(req.body).length > 0;

    if (hasBody && !contentType) {
      res.status(415).json({
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Content-Type header is required for request payload.",
        },
        requestId: req.id,
      });
      return;
    }
  }

  next();
};
