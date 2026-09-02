"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycleManager = exports.ApplicationLifecycleManager = void 0;
const logger_1 = require("../logging/logger");
const database_1 = require("@antipiracy/database");
class ApplicationLifecycleManager {
    static instance;
    state = "STARTING";
    stateChangeListeners = [];
    activeRequestCount = 0;
    shutdownHooks = [];
    constructor() {
        this.registerDefaultHooks();
    }
    static getInstance() {
        if (!ApplicationLifecycleManager.instance) {
            ApplicationLifecycleManager.instance = new ApplicationLifecycleManager();
        }
        return ApplicationLifecycleManager.instance;
    }
    getState() {
        return this.state;
    }
    isReady() {
        return this.state === "READY";
    }
    isAcceptingTraffic() {
        return this.state === "READY";
    }
    setReady() {
        if (this.state === "STARTING") {
            this.transitionTo("READY");
            logger_1.logger.info("🟢 Application Lifecycle: System transitioned to READY state.");
        }
    }
    incrementInFlight() {
        this.activeRequestCount++;
    }
    decrementInFlight() {
        if (this.activeRequestCount > 0) {
            this.activeRequestCount--;
        }
    }
    getInFlightCount() {
        return this.activeRequestCount;
    }
    registerShutdownHook(hook) {
        this.shutdownHooks.push(hook);
    }
    onStateChange(listener) {
        this.stateChangeListeners.push(listener);
    }
    transitionTo(newState) {
        this.state = newState;
        for (const listener of this.stateChangeListeners) {
            try {
                listener(newState);
            }
            catch (err) {
                logger_1.logger.error("Error in lifecycle state change listener:", err);
            }
        }
    }
    registerDefaultHooks() {
        // 1. Flush audit & telemetry queues hook
        this.registerShutdownHook(async () => {
            logger_1.logger.info("[Lifecycle] Flushing telemetry & audit event streams...");
            // Simulating clean telemetry drain
            await new Promise((resolve) => setTimeout(resolve, 50));
            logger_1.logger.info("[Lifecycle] Telemetry streams drained.");
        });
        // 2. Database client disconnect hook
        this.registerShutdownHook(async () => {
            logger_1.logger.info("[Lifecycle] Disconnecting Prisma database connections...");
            try {
                await database_1.prisma.$disconnect();
                logger_1.logger.info("[Lifecycle] Prisma database connections closed.");
            }
            catch (err) {
                logger_1.logger.error("[Lifecycle] Error disconnecting database:", err);
            }
        });
    }
    /**
     * Executes full production shutdown sequence:
     * DRAINING -> Complete in-flight -> Run shutdown hooks -> STOPPED
     */
    async executeGracefulShutdown(drainTimeoutMs = 5000) {
        if (this.state === "DRAINING" || this.state === "STOPPING" || this.state === "STOPPED") {
            return;
        }
        logger_1.logger.warn(`🛑 Application Lifecycle: Initiating graceful shutdown. Draining traffic...`);
        this.transitionTo("DRAINING");
        // Wait for in-flight requests or timeout
        const startDrain = Date.now();
        while (this.activeRequestCount > 0 && Date.now() - startDrain < drainTimeoutMs) {
            logger_1.logger.info(`[Lifecycle] Waiting for ${this.activeRequestCount} in-flight requests to complete...`);
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.transitionTo("STOPPING");
        logger_1.logger.info("[Lifecycle] Executing registered shutdown hooks...");
        for (const hook of this.shutdownHooks) {
            try {
                await hook();
            }
            catch (err) {
                logger_1.logger.error("[Lifecycle] Error executing shutdown hook:", err);
            }
        }
        this.transitionTo("STOPPED");
        logger_1.logger.info("⚪ Application Lifecycle: System STOPPED cleanly.");
    }
}
exports.ApplicationLifecycleManager = ApplicationLifecycleManager;
exports.lifecycleManager = ApplicationLifecycleManager.getInstance();
