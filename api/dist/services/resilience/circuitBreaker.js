"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakers = exports.CircuitBreaker = void 0;
const logger_1 = require("../logging/logger");
class CircuitBreaker {
    name;
    state = "CLOSED";
    failureCount = 0;
    successCount = 0;
    lastFailureTime;
    lastStateChangeTime = new Date();
    failureThreshold;
    resetTimeoutMs;
    halfOpenMaxProbes;
    fallbackValue;
    constructor(name, options) {
        this.name = name;
        this.failureThreshold = options?.failureThreshold || 5;
        this.resetTimeoutMs = options?.resetTimeoutMs || 10000;
        this.halfOpenMaxProbes = options?.halfOpenMaxProbes || 2;
        this.fallbackValue = options?.fallbackValue;
    }
    getState() {
        if (this.state === "OPEN" && this.lastFailureTime) {
            const elapsed = Date.now() - this.lastFailureTime.getTime();
            if (elapsed >= this.resetTimeoutMs) {
                this.transitionTo("HALF_OPEN");
            }
        }
        return this.state;
    }
    async execute(action, fallback) {
        const currentState = this.getState();
        if (currentState === "OPEN") {
            logger_1.logger.warn(`[CircuitBreaker:${this.name}] Circuit is OPEN - failing fast without calling dependency`);
            if (fallback)
                return fallback();
            if (this.fallbackValue !== undefined)
                return this.fallbackValue;
            throw new Error(`CircuitBreaker[${this.name}] is OPEN (Dependency Unavailable)`);
        }
        try {
            const result = await action();
            this.recordSuccess();
            return result;
        }
        catch (err) {
            this.recordFailure(err);
            if (fallback)
                return fallback();
            if (this.fallbackValue !== undefined)
                return this.fallbackValue;
            throw err;
        }
    }
    recordSuccess() {
        if (this.state === "HALF_OPEN") {
            this.successCount++;
            if (this.successCount >= this.halfOpenMaxProbes) {
                this.transitionTo("CLOSED");
                this.failureCount = 0;
                this.successCount = 0;
            }
        }
        else if (this.state === "CLOSED") {
            this.failureCount = 0;
        }
    }
    recordFailure(err) {
        this.failureCount++;
        this.lastFailureTime = new Date();
        logger_1.logger.warn(`[CircuitBreaker:${this.name}] Recorded failure (${this.failureCount}/${this.failureThreshold}): ${err.message || err}`);
        if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
            this.transitionTo("OPEN");
        }
    }
    transitionTo(newState) {
        const old = this.state;
        this.state = newState;
        this.lastStateChangeTime = new Date();
        logger_1.logger.warn(`[CircuitBreaker:${this.name}] State transition: ${old} -> ${newState}`);
    }
    getStats() {
        return {
            name: this.name,
            state: this.getState(),
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            lastStateChangeTime: this.lastStateChangeTime,
        };
    }
    reset() {
        this.transitionTo("CLOSED");
        this.failureCount = 0;
        this.successCount = 0;
    }
}
exports.CircuitBreaker = CircuitBreaker;
// Registry of platform circuit breakers
exports.circuitBreakers = {
    database: new CircuitBreaker("database", { failureThreshold: 5, resetTimeoutMs: 5000 }),
    redis: new CircuitBreaker("redis", { failureThreshold: 3, resetTimeoutMs: 5000 }),
    storage: new CircuitBreaker("storage", { failureThreshold: 4, resetTimeoutMs: 10000 }),
    cdn: new CircuitBreaker("cdn", { failureThreshold: 3, resetTimeoutMs: 5000 }),
    drm: new CircuitBreaker("drm", { failureThreshold: 4, resetTimeoutMs: 8000 }),
    kms: new CircuitBreaker("kms", { failureThreshold: 3, resetTimeoutMs: 5000 }),
};
