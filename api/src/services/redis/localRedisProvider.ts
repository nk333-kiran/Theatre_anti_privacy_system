import crypto from "crypto";
import { IRedisProvider, LockResult, SlidingWindowResult } from "./types";
import { logger } from "../logging/logger";

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

export class LocalRedisProvider implements IRedisProvider {
  public name = "local_memory";
  private store = new Map<string, MemoryEntry>();
  private locks = new Map<string, { token: string; expiresAt: number }>();
  private slidingWindows = new Map<string, number[]>();

  public async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  public async incr(key: string, ttlSeconds?: number): Promise<number> {
    const currentStr = await this.get(key);
    const count = currentStr ? parseInt(currentStr, 10) + 1 : 1;
    await this.set(key, String(count), ttlSeconds);
    return count;
  }

  public async acquireLock(key: string, ttlSeconds = 10): Promise<LockResult> {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      return {
        acquired: false,
        lockKey: key,
        release: async () => false,
      };
    }

    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = now + ttlSeconds * 1000;
    this.locks.set(key, { token, expiresAt });

    const release = async (): Promise<boolean> => {
      const current = this.locks.get(key);
      if (current && current.token === token) {
        this.locks.delete(key);
        return true;
      }
      return false;
    };

    return { acquired: true, lockKey: key, token, release };
  }

  public async slidingWindowRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<SlidingWindowResult> {
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

  public async ping(): Promise<boolean> {
    return true;
  }

  public async flushAll(): Promise<void> {
    this.store.clear();
    this.locks.clear();
    this.slidingWindows.clear();
  }
}
