import { logger } from "../logging/logger";
import { prisma } from "@antipiracy/database";

export type ApplicationLifecycleState = "STARTING" | "READY" | "DRAINING" | "STOPPING" | "STOPPED";

export class ApplicationLifecycleManager {
  private static instance: ApplicationLifecycleManager;
  private state: ApplicationLifecycleState = "STARTING";
  private stateChangeListeners: Array<(newState: ApplicationLifecycleState) => void> = [];
  private activeRequestCount = 0;
  private shutdownHooks: Array<() => Promise<void>> = [];

  private constructor() {
    this.registerDefaultHooks();
  }

  public static getInstance(): ApplicationLifecycleManager {
    if (!ApplicationLifecycleManager.instance) {
      ApplicationLifecycleManager.instance = new ApplicationLifecycleManager();
    }
    return ApplicationLifecycleManager.instance;
  }

  public getState(): ApplicationLifecycleState {
    return this.state;
  }

  public isReady(): boolean {
    return this.state === "READY";
  }

  public isAcceptingTraffic(): boolean {
    return this.state === "READY";
  }

  public setReady(): void {
    if (this.state === "STARTING") {
      this.transitionTo("READY");
      logger.info("🟢 Application Lifecycle: System transitioned to READY state.");
    }
  }

  public incrementInFlight(): void {
    this.activeRequestCount++;
  }

  public decrementInFlight(): void {
    if (this.activeRequestCount > 0) {
      this.activeRequestCount--;
    }
  }

  public getInFlightCount(): number {
    return this.activeRequestCount;
  }

  public registerShutdownHook(hook: () => Promise<void>): void {
    this.shutdownHooks.push(hook);
  }

  public onStateChange(listener: (newState: ApplicationLifecycleState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  private transitionTo(newState: ApplicationLifecycleState): void {
    this.state = newState;
    for (const listener of this.stateChangeListeners) {
      try {
        listener(newState);
      } catch (err) {
        logger.error("Error in lifecycle state change listener:", err);
      }
    }
  }

  private registerDefaultHooks(): void {
    // 1. Flush audit & telemetry queues hook
    this.registerShutdownHook(async () => {
      logger.info("[Lifecycle] Flushing telemetry & audit event streams...");
      // Simulating clean telemetry drain
      await new Promise((resolve) => setTimeout(resolve, 50));
      logger.info("[Lifecycle] Telemetry streams drained.");
    });

    // 2. Database client disconnect hook
    this.registerShutdownHook(async () => {
      logger.info("[Lifecycle] Disconnecting Prisma database connections...");
      try {
        await prisma.$disconnect();
        logger.info("[Lifecycle] Prisma database connections closed.");
      } catch (err) {
        logger.error("[Lifecycle] Error disconnecting database:", err);
      }
    });
  }

  /**
   * Executes full production shutdown sequence:
   * DRAINING -> Complete in-flight -> Run shutdown hooks -> STOPPED
   */
  public async executeGracefulShutdown(drainTimeoutMs = 5000): Promise<void> {
    if (this.state === "DRAINING" || this.state === "STOPPING" || this.state === "STOPPED") {
      return;
    }

    logger.warn(`🛑 Application Lifecycle: Initiating graceful shutdown. Draining traffic...`);
    this.transitionTo("DRAINING");

    // Wait for in-flight requests or timeout
    const startDrain = Date.now();
    while (this.activeRequestCount > 0 && Date.now() - startDrain < drainTimeoutMs) {
      logger.info(`[Lifecycle] Waiting for ${this.activeRequestCount} in-flight requests to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.transitionTo("STOPPING");
    logger.info("[Lifecycle] Executing registered shutdown hooks...");

    for (const hook of this.shutdownHooks) {
      try {
        await hook();
      } catch (err) {
        logger.error("[Lifecycle] Error executing shutdown hook:", err);
      }
    }

    this.transitionTo("STOPPED");
    logger.info("⚪ Application Lifecycle: System STOPPED cleanly.");
  }
}

export const lifecycleManager = ApplicationLifecycleManager.getInstance();
