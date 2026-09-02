"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const redisManager_1 = require("../redis/redisManager");
const logger_1 = require("../logging/logger");
class CacheService {
    defaultTtlSeconds = 120; // 2 minutes short-lived cache
    hits = 0;
    misses = 0;
    /**
     * Fetch from cache or compute and cache
     */
    async getOrSet(key, factory, ttlSeconds) {
        const redis = redisManager_1.redisManager.getProvider();
        const cacheKey = `cache:${key}`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                this.hits++;
                return JSON.parse(cached);
            }
        }
        catch (err) {
            logger_1.logger.warn(`[CacheService] Cache read error for ${key}: ${err.message || err}`);
        }
        this.misses++;
        const fresh = await factory();
        try {
            const ttl = ttlSeconds || this.defaultTtlSeconds;
            await redis.set(cacheKey, JSON.stringify(fresh), ttl);
        }
        catch (err) {
            logger_1.logger.warn(`[CacheService] Cache write error for ${key}: ${err.message || err}`);
        }
        return fresh;
    }
    /**
     * Invalidate specific cache key
     */
    async invalidate(key) {
        const redis = redisManager_1.redisManager.getProvider();
        await redis.del(`cache:${key}`);
        logger_1.logger.info(`[CacheService] Invalidated cache key: ${key}`);
    }
    /**
     * Invalidate cache by entity type
     */
    async invalidateEntity(entityType, id) {
        const redis = redisManager_1.redisManager.getProvider();
        if (id) {
            await redis.del(`cache:${entityType}:${id}`);
        }
        await redis.del(`cache:${entityType}:list`);
    }
    getStats() {
        const total = this.hits + this.misses;
        const hitRatio = total > 0 ? parseFloat(((this.hits / total) * 100).toFixed(2)) : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRatio,
        };
    }
    resetStats() {
        this.hits = 0;
        this.misses = 0;
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
