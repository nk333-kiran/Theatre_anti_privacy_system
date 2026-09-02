export interface LockResult {
  acquired: boolean;
  lockKey: string;
  token?: string;
  release: () => Promise<boolean>;
}

export interface SlidingWindowResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  resetTimeMs: number;
}

export interface IRedisProvider {
  name: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  acquireLock(key: string, ttlSeconds?: number): Promise<LockResult>;
  slidingWindowRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<SlidingWindowResult>;
  ping(): Promise<boolean>;
  flushAll?(): Promise<void>;
}
