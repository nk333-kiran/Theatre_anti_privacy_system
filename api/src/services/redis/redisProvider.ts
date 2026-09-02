import { IRedisProvider, LockResult, SlidingWindowResult } from "./types";
import { LocalRedisProvider } from "./localRedisProvider";
import { logger } from "../logging/logger";

export class RedisProvider implements IRedisProvider {
  public name = "redis_cluster";
  private fallback: LocalRedisProvider;

  constructor(_redisUrl?: string) {
    this.fallback = new LocalRedisProvider();
  }

  public async get(key: string): Promise<string | null> {
    return this.fallback.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    return this.fallback.set(key, value, ttlSeconds);
  }

  public async del(key: string): Promise<void> {
    return this.fallback.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    return this.fallback.exists(key);
  }

  public async incr(key: string, ttlSeconds?: number): Promise<number> {
    return this.fallback.incr(key, ttlSeconds);
  }

  public async acquireLock(key: string, ttlSeconds = 10): Promise<LockResult> {
    return this.fallback.acquireLock(key, ttlSeconds);
  }

  public async slidingWindowRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<SlidingWindowResult> {
    return this.fallback.slidingWindowRateLimit(key, limit, windowSeconds);
  }

  public async ping(): Promise<boolean> {
    return true;
  }
}
