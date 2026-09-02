import { IRedisProvider } from "./types";
import { LocalRedisProvider } from "./localRedisProvider";
import { RedisProvider } from "./redisProvider";
import { logger } from "../logging/logger";

class RedisManager {
  private activeProvider: IRedisProvider;

  constructor() {
    if (process.env.REDIS_URL && process.env.NODE_ENV === "production") {
      this.activeProvider = new RedisProvider(process.env.REDIS_URL);
      logger.info("[RedisManager] Initialized Production Redis Provider");
    } else {
      this.activeProvider = new LocalRedisProvider();
      logger.info("[RedisManager] Initialized High-Performance In-Memory Redis Provider");
    }
  }

  public getProvider(): IRedisProvider {
    return this.activeProvider;
  }

  public setProvider(provider: IRedisProvider): void {
    this.activeProvider = provider;
  }
}

export const redisManager = new RedisManager();
