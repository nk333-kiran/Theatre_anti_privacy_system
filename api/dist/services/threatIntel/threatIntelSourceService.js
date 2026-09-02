"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelSourceService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
class ThreatIntelSourceService {
    /**
     * Hashes a webhook secret using SHA-256 for secure constant-time verification.
     */
    static hashWebhookSecret(secret) {
        return crypto_1.default.createHash("sha256").update(secret.trim()).digest("hex");
    }
    /**
     * Masks sensitive credentials so they are never exposed in logs or API responses.
     */
    static maskSecret(secret) {
        if (!secret)
            return null;
        if (secret.length <= 6)
            return "******";
        return `${secret.slice(0, 3)}****${secret.slice(-2)}`;
    }
    /**
     * Registers a new Threat Intelligence Source.
     */
    static async createSource(params) {
        const webhookSecretHash = params.webhookSecret
            ? this.hashWebhookSecret(params.webhookSecret)
            : undefined;
        const source = await database_1.prisma.threatIntelSource.create({
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
        await database_1.prisma.threatIntelSourceHealth.create({
            data: {
                sourceId: source.id,
                status: client_1.ThreatIntelSourceHealthStatus.HEALTHY,
                responseLatencyMs: 0,
                recordsIngested: 0,
            },
        });
        return source;
    }
    /**
     * Updates an existing threat intelligence source.
     */
    static async updateSource(id, params) {
        const updateData = {};
        if (params.name !== undefined)
            updateData.name = params.name.trim();
        if (params.providerType !== undefined)
            updateData.providerType = params.providerType.trim();
        if (params.description !== undefined)
            updateData.description = params.description;
        if (params.trustLevel !== undefined)
            updateData.trustLevel = Math.max(0, Math.min(100, params.trustLevel));
        if (params.defaultConfidence !== undefined)
            updateData.defaultConfidence = Math.max(0, Math.min(100, params.defaultConfidence));
        if (params.isEnabled !== undefined)
            updateData.isEnabled = params.isEnabled;
        if (params.syncFrequencyMinutes !== undefined)
            updateData.syncFrequencyMinutes = params.syncFrequencyMinutes;
        if (params.authConfigReference !== undefined)
            updateData.authConfigReference = this.maskSecret(params.authConfigReference);
        if (params.webhookSecret !== undefined)
            updateData.webhookSecretHash = this.hashWebhookSecret(params.webhookSecret);
        return await database_1.prisma.threatIntelSource.update({
            where: { id },
            data: updateData,
        });
    }
    /**
     * Retrieves all threat intelligence sources with health metrics.
     */
    static async listSources() {
        return await database_1.prisma.threatIntelSource.findMany({
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
    static async getSourceById(id) {
        return await database_1.prisma.threatIntelSource.findUnique({
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
    static async recordSourceHealth(sourceId, status, latencyMs, recordsIngested, httpCode, errorMessage) {
        await database_1.prisma.threatIntelSourceHealth.create({
            data: {
                sourceId,
                status,
                responseLatencyMs: latencyMs,
                recordsIngested,
                lastHttpCode: httpCode,
                errorMessage,
            },
        });
        if (status === client_1.ThreatIntelSourceHealthStatus.HEALTHY) {
            await database_1.prisma.threatIntelSource.update({
                where: { id: sourceId },
                data: {
                    lastSyncSuccessAt: new Date(),
                    lastFailureReason: null,
                },
            });
        }
        else {
            await database_1.prisma.threatIntelSource.update({
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
    static async getSourceHealthStats() {
        const sources = await database_1.prisma.threatIntelSource.findMany({
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
            }
            else if (!src.healthRecords.length || src.healthRecords[0].status === client_1.ThreatIntelSourceHealthStatus.HEALTHY) {
                healthy++;
            }
            else if (src.healthRecords[0].status === client_1.ThreatIntelSourceHealthStatus.DEGRADED) {
                degraded++;
            }
            else {
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
exports.ThreatIntelSourceService = ThreatIntelSourceService;
