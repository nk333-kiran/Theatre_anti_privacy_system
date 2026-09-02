"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalRedisProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
class LocalRedisProvider {
    name = "local_memory";
    store = new Map();
    locks = new Map();
    slidingWindows = new Map();
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlSeconds) {
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        this.store.set(key, { value, expiresAt });
    }
    async del(key) {
        this.store.delete(key);
    }
    async exists(key) {
        const val = await this.get(key);
        return val !== null;
    }
    async incr(key, ttlSeconds) {
        const currentStr = await this.get(key);
        const count = currentStr ? parseInt(currentStr, 10) + 1 : 1;
        await this.set(key, String(count), ttlSeconds);
        return count;
    }
    async acquireLock(key, ttlSeconds = 10) {
        const now = Date.now();
        const existing = this.locks.get(key);
        if (existing && existing.expiresAt > now) {
            return {
                acquired: false,
                lockKey: key,
                release: async () => false,
            };
        }
        const token = crypto_1.default.randomBytes(16).toString("hex");
        const expiresAt = now + ttlSeconds * 1000;
        this.locks.set(key, { token, expiresAt });
        const release = async () => {
            const current = this.locks.get(key);
            if (current && current.token === token) {
                this.locks.delete(key);
                return true;
            }
            return false;
        };
        return { acquired: true, lockKey: key, token, release };
    }
    async slidingWindowRateLimit(key, limit, windowSeconds) {
        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        const cutoff = now - windowMs;
        let timestamps = this.slidingWindows.get(key) || [];
        timestamps = timestamps.filter((ts) => ts > cutoff);
        const allowed = timestamps.length < limit;
        if (allowed) {
            timestamps.push(now);
        }
        this.slidingWindows.set(key, timestamps);
        const currentCount = timestamps.length;
        const remaining = Math.max(0, limit - currentCount);
        const resetTimeMs = (timestamps[0] || now) + windowMs;
        return {
            allowed,
            currentCount,
            remaining,
            resetTimeMs,
        };
    }
    async ping() {
        return true;
    }
    async flushAll() {
        this.store.clear();
        this.locks.clear();
        this.slidingWindows.clear();
    }
}
exports.LocalRedisProvider = LocalRedisProvider;
