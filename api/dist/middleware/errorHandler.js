"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const envValidator_1 = require("../config/envValidator");
const logger_1 = require("../services/logging/logger");
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
/**
 * Production-Safe Error Sanitizer
 * Strips internal SQL errors, database credentials, server paths, and stack traces.
 */
function sanitizeErrorMessage(rawMessage, isProduction, statusCode) {
    if (!isProduction)
        return rawMessage;
    // Mask database / Prisma connection / SQL errors in production
    if (rawMessage.includes("prisma") ||
        rawMessage.includes("postgresql://") ||
        rawMessage.includes("Invalid `prisma.") ||
        rawMessage.includes("SQLSTATE") ||
        rawMessage.includes("database") ||
        rawMessage.includes("syntax error at or near") ||
        rawMessage.includes("connect ECONNREFUSED")) {
        return "A database operation error occurred. Please contact system administrator.";
    }
    // Generic fallback for unhandled 500s
    if (statusCode >= 500) {
        return "An internal server error occurred. Please reference the request ID.";
    }
    return rawMessage;
}
const errorHandler = (err, req, res, _next) => {
    const isProd = envValidator_1.env.NODE_ENV === "production" || envValidator_1.env.NODE_ENV === "staging";
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const errorCode = err instanceof AppError ? err.code : "INTERNAL_SERVER_ERROR";
    const requestId = req.id || "REQ-UNKNOWN";
    // Log error via centralized structured logger
    logger_1.logger.error(`API Error: ${err.message}`, err, { statusCode, errorCode, path: req.path }, req);
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
exports.errorHandler = errorHandler;
