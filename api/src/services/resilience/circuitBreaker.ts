import { CircuitState, CircuitBreakerOptions, CircuitBreakerStats } from "./types";
import { logger } from "../logging/logger";

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastStateChangeTime: Date = new Date();

  private failureThreshold: number;
  private resetTimeoutMs: number;
  private halfOpenMaxProbes: number;
  private fallbackValue?: any;

  constructor(name: string, options?: CircuitBreakerOptions) {
    this.name = name;
    this.failureThreshold = options?.failureThreshold || 5;
    this.resetTimeoutMs = options?.resetTimeoutMs || 10000;
    this.halfOpenMaxProbes = options?.halfOpenMaxProbes || 2;
    this.fallbackValue = options?.fallbackValue;
  }

  public getState(): CircuitState {
    if (this.state === "OPEN" && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime.getTime();
      if (elapsed >= this.resetTimeoutMs) {
        this.transitionTo("HALF_OPEN");
      }
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      logger.warn(`[CircuitBreaker:${this.name}] Circuit is OPEN - failing fast without calling dependency`);
      if (fallback) return fallback();
      if (this.fallbackValue !== undefined) return this.fallbackValue;
      throw new Error(`CircuitBreaker[${this.name}] is OPEN (Dependency Unavailable)`);
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (err: any) {
      this.recordFailure(err);
      if (fallback) return fallback();
      if (this.fallbackValue !== undefined) return this.fallbackValue;
      throw err;
    }
  }

  private recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxProbes) {
        this.transitionTo("CLOSED");
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  private recordFailure(err: any): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    logger.warn(`[CircuitBreaker:${this.name}] Recorded failure (${this.failureCount}/${this.failureThreshold}): ${err.message || err}`);

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.transitionTo("OPEN");
    }
  }

  private transitionTo(newState: CircuitState): void {
    const old = this.state;
    this.state = newState;
    this.lastStateChangeTime = new Date();
    logger.warn(`[CircuitBreaker:${this.name}] State transition: ${old} -> ${newState}`);
  }

  public getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime,
    };
  }

  public reset(): void {
    this.transitionTo("CLOSED");
    this.failureCount = 0;
    this.successCount = 0;
  }
}

// Registry of platform circuit breakers
export const circuitBreakers = {
  database: new CircuitBreaker("database", { failureThreshold: 5, resetTimeoutMs: 5000 }),
  redis: new CircuitBreaker("redis", { failureThreshold: 3, resetTimeoutMs: 5000 }),
  storage: new CircuitBreaker("storage", { failureThreshold: 4, resetTimeoutMs: 10000 }),
  cdn: new CircuitBreaker("cdn", { failureThreshold: 3, resetTimeoutMs: 5000 }),
  drm: new CircuitBreaker("drm", { failureThreshold: 4, resetTimeoutMs: 8000 }),
  kms: new CircuitBreaker("kms", { failureThreshold: 3, resetTimeoutMs: 5000 }),
};
