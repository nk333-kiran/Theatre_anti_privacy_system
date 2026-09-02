"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireIdempotency = exports.IdempotencyService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const redisManager_1 = require("../redis/redisManager");
const logger_1 = require("../logging/logger");
class IdempotencyService {
    /**
     * Generates a deterministic hash from request components
     */
    static generateRequestHash(req) {
        const raw = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body || {})}:${req.user?.id || "anon"}`;
        return crypto_1.default.createHash("sha256").update(raw).digest("hex");
    }
    /**
     * Check or acquire idempotency lock for an Idempotency-Key
     */
    static async checkOrAcquire(key, req, ttlSeconds = 86400 // 24 hours retention
    ) {
        const requestHash = this.generateRequestHash(req);
        const redis = redisManager_1.redisManager.getProvider();
        const lock = await redis.acquireLock(`idemp_lock:${key}`, 5);
        try {
            const existing = await database_1.prisma.idempotencyRecord.findUnique({
                where: { key },
            });
            if (existing) {
                if (existing.status === "COMPLETED") {
                    let parsedBody = existing.responseBody;
                    try {
                        if (existing.responseBody)
                            parsedBody = JSON.parse(existing.responseBody);
                    }
                    catch { }
                    return {
                        isDuplicate: true,
                        status: "COMPLETED",
                        statusCode: existing.statusCode || 200,
                        responseBody: parsedBody,
                    };
                }
                if (existing.status === "PENDING") {
                    return {
                        isDuplicate: true,
                        status: "PENDING",
                    };
                }
            }
            // Create new pending idempotency record
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            await database_1.prisma.idempotencyRecord.upsert({
                where: { key },
                create: {
                    key,
                    path: req.originalUrl || req.path,
                    method: req.method,
                    requestHash,
                    status: "PENDING",
                    expiresAt,
                },
                update: {
                    status: "PENDING",
                    requestHash,
                    expiresAt,
                },
            });
            return { isDuplicate: false };
        }
        finally {
            await lock.release();
        }
    }
    /**
     * Complete and save cached response for an Idempotency-Key
     */
    static async recordResponse(key, statusCode, responseBody) {
        try {
            const serialized = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
            await database_1.prisma.idempotencyRecord.update({
                where: { key },
                data: {
                    status: "COMPLETED",
                    statusCode,
                    responseBody: serialized,
                },
            });
            logger_1.logger.info(`[Idempotency] Recorded response for key ${key.slice(0, 16)}... (status: ${statusCode})`);
        }
        catch (err) {
            logger_1.logger.warn(`[Idempotency] Failed to record response for key ${key}: ${err.message || err}`);
        }
    }
}
exports.IdempotencyService = IdempotencyService;
/**
 * Express middleware to enforce Idempotency-Key handling on critical mutations
 */
const requireIdempotency = async (req, res, next) => {
    const idempotencyKey = req.header("Idempotency-Key") || (req.body && req.body.idempotencyKey);
    if (!idempotencyKey) {
        // If client didn't supply key, proceed normally
        return next();
    }
    try {
        const check = await IdempotencyService.checkOrAcquire(idempotencyKey, req);
        if (check.isDuplicate) {
            if (check.status === "PENDING") {
                res.status(409).json({
                    success: false,
                    error: {
                        code: "CONCURRENT_REQUEST",
                        message: "A request with this Idempotency-Key is currently being processed. Please retry shortly.",
                    },
                });
                return;
            }
            if (check.status === "COMPLETED") {
                res.setHeader("X-Idempotent-Replay", "true");
                res.status(check.statusCode || 200).json(check.responseBody);
                return;
            }
        }
        // Intercept res.json to record response automatically
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                IdempotencyService.recordResponse(idempotencyKey, res.statusCode, body);
            }
            return originalJson(body);
        };
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.requireIdempotency = requireIdempotency;
