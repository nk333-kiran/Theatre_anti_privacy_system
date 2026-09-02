"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisProvider = void 0;
const localRedisProvider_1 = require("./localRedisProvider");
class RedisProvider {
    name = "redis_cluster";
    fallback;
    constructor(_redisUrl) {
        this.fallback = new localRedisProvider_1.LocalRedisProvider();
    }
    async get(key) {
        return this.fallback.get(key);
    }
    async set(key, value, ttlSeconds) {
        return this.fallback.set(key, value, ttlSeconds);
    }
    async del(key) {
        return this.fallback.del(key);
    }
    async exists(key) {
        return this.fallback.exists(key);
    }
    async incr(key, ttlSeconds) {
        return this.fallback.incr(key, ttlSeconds);
    }
    async acquireLock(key, ttlSeconds = 10) {
        return this.fallback.acquireLock(key, ttlSeconds);
    }
    async slidingWindowRateLimit(key, limit, windowSeconds) {
        return this.fallback.slidingWindowRateLimit(key, limit, windowSeconds);
    }
    async ping() {
        return true;
    }
}
exports.RedisProvider = RedisProvider;
