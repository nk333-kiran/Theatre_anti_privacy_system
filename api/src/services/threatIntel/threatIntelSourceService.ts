import { prisma } from "@antipiracy/database";
import { ThreatIntelSourceHealthStatus } from "@prisma/client";
import crypto from "crypto";

export interface CreateSourceParams {
  name: string;
  providerType: string;
  description?: string;
  trustLevel?: number;
  defaultConfidence?: number;
  syncFrequencyMinutes?: number;
  authConfigReference?: string;
  webhookSecret?: string;
}

export interface UpdateSourceParams {
  name?: string;
  providerType?: string;
  description?: string;
  trustLevel?: number;
  defaultConfidence?: number;
  isEnabled?: boolean;
  syncFrequencyMinutes?: number;
  authConfigReference?: string;
  webhookSecret?: string;
}

export class ThreatIntelSourceService {
  /**
   * Hashes a webhook secret using SHA-256 for secure constant-time verification.
   */
  public static hashWebhookSecret(secret: string): string {
    return crypto.createHash("sha256").update(secret.trim()).digest("hex");
  }

  /**
   * Masks sensitive credentials so they are never exposed in logs or API responses.
   */
  public static maskSecret(secret?: string | null): string | null {
    if (!secret) return null;
    if (secret.length <= 6) return "******";
    return `${secret.slice(0, 3)}****${secret.slice(-2)}`;
  }

  /**
   * Registers a new Threat Intelligence Source.
   */
  public static async createSource(params: CreateSourceParams) {
    const webhookSecretHash = params.webhookSecret
      ? this.hashWebhookSecret(params.webhookSecret)
      : undefined;

    const source = await prisma.threatIntelSource.create({
      data: {
        name: params.name.trim(),
        providerType: params.providerType.trim(),
        description: params.description,
        trustLevel: Math.max(0, Math.min(100, params.trustLevel ?? 50)),
        defaultConfidence: Math.max(0, Math.min(100, params.defaultConfidence ?? 50)),
        syncFrequencyMinutes: params.syncFrequencyMinutes ?? 60,
        authConfigReference: params.authConfigReference ? this.maskSecret(params.authConfigReference) : null,
        webhookSecretHash,
      },
    });

    // Record initial health status
    await prisma.threatIntelSourceHealth.create({
      data: {
        sourceId: source.id,
        status: ThreatIntelSourceHealthStatus.HEALTHY,
        responseLatencyMs: 0,
        recordsIngested: 0,
      },
    });

    return source;
  }

  /**
   * Updates an existing threat intelligence source.
   */
  public static async updateSource(id: string, params: UpdateSourceParams) {
    const updateData: any = {};

    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.providerType !== undefined) updateData.providerType = params.providerType.trim();
    if (params.description !== undefined) updateData.description = params.description;
    if (params.trustLevel !== undefined) updateData.trustLevel = Math.max(0, Math.min(100, params.trustLevel));
    if (params.defaultConfidence !== undefined) updateData.defaultConfidence = Math.max(0, Math.min(100, params.defaultConfidence));
    if (params.isEnabled !== undefined) updateData.isEnabled = params.isEnabled;
    if (params.syncFrequencyMinutes !== undefined) updateData.syncFrequencyMinutes = params.syncFrequencyMinutes;
    if (params.authConfigReference !== undefined) updateData.authConfigReference = this.maskSecret(params.authConfigReference);
    if (params.webhookSecret !== undefined) updateData.webhookSecretHash = this.hashWebhookSecret(params.webhookSecret);

    return await prisma.threatIntelSource.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Retrieves all threat intelligence sources with health metrics.
   */
  public static async listSources() {
    return await prisma.threatIntelSource.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            indicators: true,
            feeds: true,
            imports: true,
          },
        },
        healthRecords: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  /**
   * Retrieves a single source by ID.
   */
  public static async getSourceById(id: string) {
    return await prisma.threatIntelSource.findUnique({
      where: { id },
      include: {
        feeds: true,
        healthRecords: {
          orderBy: { checkedAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            indicators: true,
            imports: true,
          },
        },
      },
    });
  }

  /**
   * Records health telemetry for a source after synchronization/ingestion.
   */
  public static async recordSourceHealth(
    sourceId: string,
    status: ThreatIntelSourceHealthStatus,
    latencyMs: number,
    recordsIngested: number,
    httpCode?: number,
    errorMessage?: string
  ) {
    await prisma.threatIntelSourceHealth.create({
      data: {
        sourceId,
        status,
        responseLatencyMs: latencyMs,
        recordsIngested,
        lastHttpCode: httpCode,
        errorMessage,
      },
    });

    if (status === ThreatIntelSourceHealthStatus.HEALTHY) {
      await prisma.threatIntelSource.update({
        where: { id: sourceId },
        data: {
          lastSyncSuccessAt: new Date(),
          lastFailureReason: null,
        },
      });
    } else {
      await prisma.threatIntelSource.update({
        where: { id: sourceId },
        data: {
          lastSyncFailureAt: new Date(),
          lastFailureReason: errorMessage || "Unknown error during synchronization",
        },
      });
    }
  }

  /**
   * Fetches aggregated source health statistics across the entire platform.
   */
  public static async getSourceHealthStats() {
    const sources = await prisma.threatIntelSource.findMany({
      include: {
        healthRecords: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    });

    let total = sources.length;
    let healthy = 0;
    let degraded = 0;
    let failed = 0;
    let disabled = 0;

    for (const src of sources) {
      if (!src.isEnabled) {
        disabled++;
      } else if (!src.healthRecords.length || src.healthRecords[0].status === ThreatIntelSourceHealthStatus.HEALTHY) {
        healthy++;
      } else if (src.healthRecords[0].status === ThreatIntelSourceHealthStatus.DEGRADED) {
        degraded++;
      } else {
        failed++;
      }
    }

    return {
      total,
      healthy,
      degraded,
      failed,
      disabled,
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        providerType: s.providerType,
        trustLevel: s.trustLevel,
        isEnabled: s.isEnabled,
        lastSyncSuccessAt: s.lastSyncSuccessAt,
        lastSyncFailureAt: s.lastSyncFailureAt,
        lastFailureReason: s.lastFailureReason,
        status: s.isEnabled ? (s.healthRecords[0]?.status || "HEALTHY") : "DISABLED",
        latencyMs: s.healthRecords[0]?.responseLatencyMs || 0,
      })),
    };
  }
}
