import { redisManager } from "../redis/redisManager";
import { logger } from "../logging/logger";

export class CacheService {
  private defaultTtlSeconds = 120; // 2 minutes short-lived cache
  private hits = 0;
  private misses = 0;

  /**
   * Fetch from cache or compute and cache
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const redis = redisManager.getProvider();
    const cacheKey = `cache:${key}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        this.hits++;
        return JSON.parse(cached) as T;
      }
    } catch (err: any) {
      logger.warn(`[CacheService] Cache read error for ${key}: ${err.message || err}`);
    }

    this.misses++;
    const fresh = await factory();

    try {
      const ttl = ttlSeconds || this.defaultTtlSeconds;
      await redis.set(cacheKey, JSON.stringify(fresh), ttl);
    } catch (err: any) {
      logger.warn(`[CacheService] Cache write error for ${key}: ${err.message || err}`);
    }

    return fresh;
  }

  /**
   * Invalidate specific cache key
   */
  public async invalidate(key: string): Promise<void> {
    const redis = redisManager.getProvider();
    await redis.del(`cache:${key}`);
    logger.info(`[CacheService] Invalidated cache key: ${key}`);
  }

  /**
   * Invalidate cache by entity type
   */
  public async invalidateEntity(entityType: "theatre" | "movie" | "show" | "device", id?: string): Promise<void> {
    const redis = redisManager.getProvider();
    if (id) {
      await redis.del(`cache:${entityType}:${id}`);
    }
    await redis.del(`cache:${entityType}:list`);
  }

  public getStats(): { hits: number; misses: number; hitRatio: number } {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? parseFloat(((this.hits / total) * 100).toFixed(2)) : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio,
    };
  }

  public resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

export const cacheService = new CacheService();
