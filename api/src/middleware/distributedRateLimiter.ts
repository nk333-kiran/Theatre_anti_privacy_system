import { Request, Response, NextFunction } from "express";
import { redisManager } from "../services/redis/redisManager";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { logger } from "../services/logging/logger";

export interface RateLimitOptions {
  windowSeconds?: number;
  maxRequests?: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
}

export const createDistributedRateLimiter = (options: RateLimitOptions) => {
  const windowSeconds = options.windowSeconds || 60;
  const maxRequests = options.maxRequests || 100;
  const keyPrefix = options.keyPrefix || "rl";

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userId = (req as any).user?.id || "anon";
    const rateLimitKey = `${keyPrefix}:${clientIp}:${userId}`;

    try {
      const redis = redisManager.getProvider();
      const check = await redis.slidingWindowRateLimit(rateLimitKey, maxRequests, windowSeconds);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", check.remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil(check.resetTimeMs / 1000));

      if (!check.allowed) {
        logger.warn(`[RateLimiter] Rate limit exceeded for ${rateLimitKey} (${check.currentCount}/${maxRequests})`);

        await SecurityAuditService.logEvent({
          eventType: "RATE_LIMIT_EXCEEDED",
          severity: "MEDIUM",
          userId: (req as any).user?.id,
          actorEmail: (req as any).user?.email,
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
    } catch (err) {
      // Safe fail-open on rate-limiter infrastructure failure so legitimate operations aren't blocked
      logger.error("[RateLimiter] Error evaluating distributed rate limit:", err);
      next();
    }
  };
};

// Standard rate limiters
export const standardApiLimiter = createDistributedRateLimiter({
  windowSeconds: 60,
  maxRequests: 300,
  keyPrefix: "api_std",
});

export const peakShowtimeLimiter = createDistributedRateLimiter({
  windowSeconds: 60,
  maxRequests: 1000,
  keyPrefix: "showtime_peak",
});

export const strictAuthLimiter = createDistributedRateLimiter({
  windowSeconds: 60,
  maxRequests: 15,
  keyPrefix: "auth_strict",
});
