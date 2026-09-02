import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { prisma } from "@antipiracy/database";
import { redisManager } from "../redis/redisManager";
import { logger } from "../logging/logger";

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  status?: "PENDING" | "COMPLETED" | "FAILED";
  statusCode?: number;
  responseBody?: any;
}

export class IdempotencyService {
  /**
   * Generates a deterministic hash from request components
   */
  public static generateRequestHash(req: Request): string {
    const raw = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body || {})}:${(req as any).user?.id || "anon"}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Check or acquire idempotency lock for an Idempotency-Key
   */
  public static async checkOrAcquire(
    key: string,
    req: Request,
    ttlSeconds = 86400 // 24 hours retention
  ): Promise<IdempotencyCheckResult> {
    const requestHash = this.generateRequestHash(req);
    const redis = redisManager.getProvider();
    const lock = await redis.acquireLock(`idemp_lock:${key}`, 5);

    try {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key },
      });

      if (existing) {
        if (existing.status === "COMPLETED") {
          let parsedBody = existing.responseBody;
          try {
            if (existing.responseBody) parsedBody = JSON.parse(existing.responseBody);
          } catch {}

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
      await prisma.idempotencyRecord.upsert({
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
    } finally {
      await lock.release();
    }
  }

  /**
   * Complete and save cached response for an Idempotency-Key
   */
  public static async recordResponse(
    key: string,
    statusCode: number,
    responseBody: any
  ): Promise<void> {
    try {
      const serialized = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
      await prisma.idempotencyRecord.update({
        where: { key },
        data: {
          status: "COMPLETED",
          statusCode,
          responseBody: serialized,
        },
      });
      logger.info(`[Idempotency] Recorded response for key ${key.slice(0, 16)}... (status: ${statusCode})`);
    } catch (err: any) {
      logger.warn(`[Idempotency] Failed to record response for key ${key}: ${err.message || err}`);
    }
  }
}

/**
 * Express middleware to enforce Idempotency-Key handling on critical mutations
 */
export const requireIdempotency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        IdempotencyService.recordResponse(idempotencyKey, res.statusCode, body);
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};
