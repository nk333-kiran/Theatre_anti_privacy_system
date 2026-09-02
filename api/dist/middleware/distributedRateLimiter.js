"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictAuthLimiter = exports.peakShowtimeLimiter = exports.standardApiLimiter = exports.createDistributedRateLimiter = void 0;
const redisManager_1 = require("../services/redis/redisManager");
const securityAuditService_1 = require("../services/security/securityAuditService");
const logger_1 = require("../services/logging/logger");
const createDistributedRateLimiter = (options) => {
    const windowSeconds = options.windowSeconds || 60;
    const maxRequests = options.maxRequests || 100;
    const keyPrefix = options.keyPrefix || "rl";
    return async (req, res, next) => {
        const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
        const userId = req.user?.id || "anon";
        const rateLimitKey = `${keyPrefix}:${clientIp}:${userId}`;
        try {
            const redis = redisManager_1.redisManager.getProvider();
            const check = await redis.slidingWindowRateLimit(rateLimitKey, maxRequests, windowSeconds);
            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", check.remaining);
            res.setHeader("X-RateLimit-Reset", Math.ceil(check.resetTimeMs / 1000));
            if (!check.allowed) {
                logger_1.logger.warn(`[RateLimiter] Rate limit exceeded for ${rateLimitKey} (${check.currentCount}/${maxRequests})`);
                await securityAuditService_1.SecurityAuditService.logEvent({
                    eventType: "RATE_LIMIT_EXCEEDED",
                    severity: "MEDIUM",
                    userId: req.user?.id,
                    actorEmail: req.user?.email,
                    ipAddress: clientIp,
                    endpoint: req.originalUrl || req.path,
                    actionSummary: `Distributed rate limit exceeded on ${req.method} ${req.path}`,
                    isThreat: true,
                    threatDetails: `Requests: ${check.currentCount}/${maxRequests} in ${windowSeconds}s`,
                });
                res.status(429).json({
                    success: false,
                    error: {
                        code: "RATE_LIMIT_EXCEEDED",
                        message: `Too many requests. Please retry in ${Math.ceil((check.resetTimeMs - Date.now()) / 1000)} seconds.`,
                    },
                });
                return;
            }
            next();
        }
        catch (err) {
            // Safe fail-open on rate-limiter infrastructure failure so legitimate operations aren't blocked
            logger_1.logger.error("[RateLimiter] Error evaluating distributed rate limit:", err);
            next();
        }
    };
};
exports.createDistributedRateLimiter = createDistributedRateLimiter;
// Standard rate limiters
exports.standardApiLimiter = (0, exports.createDistributedRateLimiter)({
    windowSeconds: 60,
    maxRequests: 300,
    keyPrefix: "api_std",
});
exports.peakShowtimeLimiter = (0, exports.createDistributedRateLimiter)({
    windowSeconds: 60,
    maxRequests: 1000,
    keyPrefix: "showtime_peak",
});
exports.strictAuthLimiter = (0, exports.createDistributedRateLimiter)({
    windowSeconds: 60,
    maxRequests: 15,
    keyPrefix: "auth_strict",
});
