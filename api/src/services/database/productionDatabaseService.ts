import { prisma } from "@antipiracy/database";
import { logger } from "../logging/logger";

export interface DatabasePoolConfig {
  connectionLimit: number;
  connectTimeoutMs: number;
  idleTimeoutMs: number;
  queryTimeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
}

export interface MigrationPreflightCheck {
  backupVerified: boolean;
  backupChecksumVerified: boolean;
  dbHealthOk: boolean;
  schemaCompatible: boolean;
  rollbackPlanReady: boolean;
  correlationId: string;
  authorizedBy: string;
  canProceed: boolean;
  blockers: string[];
}

export class ProductionDatabaseService {
  private static instance: ProductionDatabaseService;
  private poolConfig: DatabasePoolConfig = {
    connectionLimit: 20,
    connectTimeoutMs: 5000,
    idleTimeoutMs: 10000,
    queryTimeoutMs: 15000,
    maxRetries: 3,
    retryBackoffMs: 200,
  };

  private constructor() {}

  public static getInstance(): ProductionDatabaseService {
    if (!ProductionDatabaseService.instance) {
      ProductionDatabaseService.instance = new ProductionDatabaseService();
    }
    return ProductionDatabaseService.instance;
  }

  public getPoolConfig(): DatabasePoolConfig {
    return { ...this.poolConfig };
  }

  /**
   * Health and readiness probe with latency timing
   */
  public async checkHealth(): Promise<{ status: "HEALTHY" | "DEGRADED" | "UNHEALTHY"; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      // Direct raw probe to evaluate DB connectivity
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return {
        status: latencyMs > 2000 ? "DEGRADED" : "HEALTHY",
        latencyMs,
      };
    } catch (err: any) {
      return {
        status: "UNHEALTHY",
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Safe query executor with retry policy for transient errors
   */
  public async executeWithRetry<T>(queryFn: () => Promise<T>, operationLabel: string): Promise<T> {
    let attempt = 0;
    let lastError: any = null;

    while (attempt < this.poolConfig.maxRetries) {
      attempt++;
      try {
        return await queryFn();
      } catch (err: any) {
        lastError = err;
        const isTransient =
          err.code === "P1001" || // Can't reach database server
          err.code === "P1008" || // Operations timed out
          err.message?.includes("Connection lost") ||
          err.message?.includes("deadlock detected");

        if (!isTransient || attempt >= this.poolConfig.maxRetries) {
          logger.error(`[ProductionDatabase] Execution failed permanently on ${operationLabel}:`, err);
          throw err;
        }

        const backoff = this.poolConfig.retryBackoffMs * Math.pow(2, attempt - 1);
        logger.warn(`[ProductionDatabase] Transient error on ${operationLabel} (attempt ${attempt}/${this.poolConfig.maxRetries}). Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
    throw lastError;
  }

  /**
   * Validates safety requirements before executing a production migration.
   * Never automatically destroys production data or runs migrations without verified backups.
   */
  public async validateMigrationSafety(params: {
    backupVerified: boolean;
    backupChecksumVerified: boolean;
    rollbackPlanReady: boolean;
    correlationId: string;
    authorizedBy: string;
  }): Promise<MigrationPreflightCheck> {
    const blockers: string[] = [];
    const dbHealth = await this.checkHealth();

    if (dbHealth.status === "UNHEALTHY") {
      blockers.push("Database is currently UNHEALTHY. Cannot apply migrations.");
    }
    if (!params.backupVerified) {
      blockers.push("A fresh pre-migration backup must be verified before proceeding.");
    }
    if (!params.backupChecksumVerified) {
      blockers.push("Pre-migration backup checksum verification failed or was skipped.");
    }
    if (!params.rollbackPlanReady) {
      blockers.push("Rollback plan and script must be verified prior to migration.");
    }
    if (!params.authorizedBy || params.authorizedBy.trim() === "") {
      blockers.push("Explicit operator authorization is required for production migrations.");
    }
    if (!params.correlationId) {
      blockers.push("Deployment correlation ID must be provided.");
    }

    const canProceed = blockers.length === 0;

    return {
      backupVerified: params.backupVerified,
      backupChecksumVerified: params.backupChecksumVerified,
      dbHealthOk: dbHealth.status !== "UNHEALTHY",
      schemaCompatible: true,
      rollbackPlanReady: params.rollbackPlanReady,
      correlationId: params.correlationId,
      authorizedBy: params.authorizedBy,
      canProceed,
      blockers,
    };
  }
}

export const productionDatabaseService = ProductionDatabaseService.getInstance();
