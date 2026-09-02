"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisManager = void 0;
const localRedisProvider_1 = require("./localRedisProvider");
const redisProvider_1 = require("./redisProvider");
const logger_1 = require("../logging/logger");
class RedisManager {
    activeProvider;
    constructor() {
        if (process.env.REDIS_URL && process.env.NODE_ENV === "production") {
            this.activeProvider = new redisProvider_1.RedisProvider(process.env.REDIS_URL);
            logger_1.logger.info("[RedisManager] Initialized Production Redis Provider");
        }
        else {
            this.activeProvider = new localRedisProvider_1.LocalRedisProvider();
            logger_1.logger.info("[RedisManager] Initialized High-Performance In-Memory Redis Provider");
        }
    }
    getProvider() {
        return this.activeProvider;
    }
    setProvider(provider) {
        this.activeProvider = provider;
    }
}
exports.redisManager = new RedisManager();
