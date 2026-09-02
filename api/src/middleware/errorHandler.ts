import { Request, Response, NextFunction } from "express";
import { env } from "../config/envValidator";
import { logger } from "../services/logging/logger";

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Production-Safe Error Sanitizer
 * Strips internal SQL errors, database credentials, server paths, and stack traces.
 */
function sanitizeErrorMessage(rawMessage: string, isProduction: boolean, statusCode: number): string {
  if (!isProduction) return rawMessage;

  // Mask database / Prisma connection / SQL errors in production
  if (
    rawMessage.includes("prisma") ||
    rawMessage.includes("postgresql://") ||
    rawMessage.includes("Invalid `prisma.") ||
    rawMessage.includes("SQLSTATE") ||
    rawMessage.includes("database") ||
    rawMessage.includes("syntax error at or near") ||
    rawMessage.includes("connect ECONNREFUSED")
  ) {
    return "A database operation error occurred. Please contact system administrator.";
  }

  // Generic fallback for unhandled 500s
  if (statusCode >= 500) {
    return "An internal server error occurred. Please reference the request ID.";
  }

  return rawMessage;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isProd = env.NODE_ENV === "production" || env.NODE_ENV === "staging";
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : "INTERNAL_SERVER_ERROR";
  const requestId = req.id || "REQ-UNKNOWN";

  // Log error via centralized structured logger
  logger.error(`API Error: ${err.message}`, err, { statusCode, errorCode, path: req.path }, req);

  const safeMessage = sanitizeErrorMessage(err.message || "An unexpected error occurred.", isProd, statusCode);

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    error: {
      code: errorCode,
      message: safeMessage,
      details: !isProd ? err.stack : undefined,
    },
    requestId,
  });
};
