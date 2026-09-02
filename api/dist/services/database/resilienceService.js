"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTransientDbError = isTransientDbError;
exports.withDbRetry = withDbRetry;
const logger_1 = require("../logging/logger");
/**
 * Check if a Prisma / Database error is transient and safe to retry
 */
function isTransientDbError(error) {
    if (!error)
        return false;
    const msg = (error.message || "").toLowerCase();
    const code = error.code;
    // Prisma & PostgreSQL transient connection errors
    if (code === "P1001" || // Can't reach database server
        code === "P1002" || // Database server timed out
        code === "P1008" || // Operations timed out
        code === "P1017" || // Server closed the connection
        code === "P2028" || // Transaction API error
        code === "40001" || // Serialization failure / deadlock
        code === "57P01" || // Admin shutdown
        msg.includes("connection closed") ||
        msg.includes("connection terminated") ||
        msg.includes("deadlock detected") ||
        msg.includes("pool timeout") ||
        msg.includes("econnrefused") ||
        msg.includes("econnreset") ||
        msg.includes("etimedout")) {
        return true;
    }
    return false;
}
/**
 * Executes a database operation with exponential backoff retry for transient network glitches
 */
async function withDbRetry(operation, options = {}) {
    const maxRetries = options.maxRetries ?? 3;
    const initialBackoffMs = options.initialBackoffMs ?? 100;
    const maxBackoffMs = options.maxBackoffMs ?? 3000;
    const operationName = options.operationName ?? "Database Operation";
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            return await operation();
        }
        catch (err) {
            attempt++;
            if (attempt > maxRetries || !isTransientDbError(err)) {
                throw err;
            }
            // Calculate jittered exponential backoff: (2^attempt * initial) + random jitter
            const exponential = Math.min(initialBackoffMs * Math.pow(2, attempt - 1), maxBackoffMs);
            const jitter = Math.floor(Math.random() * 50);
            const delayMs = exponential + jitter;
            logger_1.logger.warn(`[Resilience] Transient error in ${operationName} (Attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms... Error: ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw new Error(`${operationName} failed after ${maxRetries} retry attempts.`);
}
