"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelIngestionService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const indicatorNormalizationService_1 = require("./indicatorNormalizationService");
const threatIntelScoringEngine_1 = require("./threatIntelScoringEngine");
const threatIntelSourceService_1 = require("./threatIntelSourceService");
class ThreatIntelIngestionService {
    /**
     * Main batch ingestion pipeline.
     */
    static async ingestBatch(params) {
        const startTime = Date.now();
        const source = await database_1.prisma.threatIntelSource.findUnique({
            where: { id: params.sourceId },
        });
        if (!source) {
            throw new Error(`Threat Intel Source '${params.sourceId}' not found`);
        }
        if (!source.isEnabled) {
            throw new Error(`Threat Intel Source '${source.name}' is currently disabled`);
        }
        const errors = [];
        let importedCount = 0;
        let duplicateCount = 0;
        let rejectedCount = 0;
        const importRecord = await database_1.prisma.threatIntelImport.create({
            data: {
                sourceId: source.id,
                importFormat: params.format,
                fileName: params.fileName,
                totalRecords: params.indicators.length,
                importedCount: 0,
                duplicateCount: 0,
                rejectedCount: 0,
                status: "PROCESSING",
                importedBy: params.importedBy || "SYSTEM",
            },
        });
        for (const item of params.indicators) {
            try {
                // 1. Resolve and validate Enum type
                const indicatorType = item.type;
                if (!Object.values(client_1.ThreatIntelIndicatorType).includes(indicatorType)) {
                    rejectedCount++;
                    errors.push(`Unsupported indicator type '${item.type}' for value '${item.value}'`);
                    continue;
                }
                // 2. Canonical Normalization
                const normalized = indicatorNormalizationService_1.IndicatorNormalizationService.normalize(indicatorType, item.value);
                if (!normalized.isValid || !normalized.canonicalValue) {
                    rejectedCount++;
                    errors.push(`Normalization failed for '${item.value}' (${indicatorType}): ${normalized.validationError || "Invalid format"}`);
                    continue;
                }
                // 3. Scoring & Expiration calculation
                const confidence = threatIntelScoringEngine_1.ThreatIntelScoringEngine.calculateConfidence({
                    sourceTrustLevel: source.trustLevel,
                    corroboratingSourcesCount: 1,
                });
                const expiresInDays = item.expiresInDays && item.expiresInDays > 0 ? item.expiresInDays : 90;
                const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
                const tagsString = Array.isArray(item.tags)
                    ? item.tags.join(",")
                    : item.tags || null;
                // 4. Check for duplicate within the same source
                const existing = await database_1.prisma.threatIntelIndicator.findUnique({
                    where: {
                        sourceId_indicatorType_value: {
                            sourceId: source.id,
                            indicatorType: normalized.type,
                            value: normalized.canonicalValue,
                        },
                    },
                });
                if (existing) {
                    duplicateCount++;
                    // Update lastSeen timestamp and observation
                    await database_1.prisma.threatIntelIndicator.update({
                        where: { id: existing.id },
                        data: {
                            lastSeen: new Date(),
                            status: client_1.ThreatIntelIndicatorStatus.ACTIVE,
                            expiresAt,
                        },
                    });
                    await database_1.prisma.threatIntelObservation.create({
                        data: {
                            indicatorId: existing.id,
                            sightingSource: source.name,
                            contextTelemetry: item.sightingContext || "Batch re-ingestion observation",
                        },
                    });
                }
                else {
                    // 5. Create new Indicator record
                    const newIndicator = await database_1.prisma.threatIntelIndicator.create({
                        data: {
                            sourceId: source.id,
                            indicatorType: normalized.type,
                            value: normalized.canonicalValue,
                            rawValue: item.value,
                            confidenceScore: confidence.score,
                            confidenceLevel: confidence.level,
                            status: client_1.ThreatIntelIndicatorStatus.ACTIVE,
                            threatClassification: item.threatClassification || "UNCLASSIFIED_THREAT",
                            description: item.description,
                            tags: tagsString,
                            firstSeen: new Date(),
                            lastSeen: new Date(),
                            expiresAt,
                        },
                    });
                    await database_1.prisma.threatIntelObservation.create({
                        data: {
                            indicatorId: newIndicator.id,
                            sightingSource: source.name,
                            contextTelemetry: item.sightingContext || "Initial feed ingestion sighting",
                        },
                    });
                    importedCount++;
                }
            }
            catch (err) {
                rejectedCount++;
                errors.push(`Error processing indicator '${item.value}': ${err.message}`);
            }
        }
        const durationMs = Date.now() - startTime;
        const finalStatus = rejectedCount === params.indicators.length && params.indicators.length > 0
            ? "FAILED"
            : rejectedCount > 0
                ? "PARTIAL"
                : "COMPLETED";
        await database_1.prisma.threatIntelImport.update({
            where: { id: importRecord.id },
            data: {
                importedCount,
                duplicateCount,
                rejectedCount,
                status: finalStatus,
                errorMessage: errors.length ? errors.slice(0, 5).join(" | ") : null,
            },
        });
        // Record source health
        await threatIntelSourceService_1.ThreatIntelSourceService.recordSourceHealth(source.id, finalStatus === "FAILED" ? client_1.ThreatIntelSourceHealthStatus.FAILED : client_1.ThreatIntelSourceHealthStatus.HEALTHY, durationMs, importedCount + duplicateCount, 200, errors.length ? errors[0] : undefined);
        return {
            importId: importRecord.id,
            totalRecords: params.indicators.length,
            importedCount,
            duplicateCount,
            rejectedCount,
            errors,
        };
    }
    /**
     * Helper to parse CSV string formatted as: type,value,threatClassification,description,tags
     */
    static parseCsv(csvContent) {
        const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0)
            return [];
        const indicators = [];
        const startIndex = lines[0].toLowerCase().startsWith("type,") || lines[0].toLowerCase().startsWith('"type"') ? 1 : 0;
        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
            if (parts.length < 2)
                continue;
            indicators.push({
                type: parts[0],
                value: parts[1],
                threatClassification: parts[2] || undefined,
                description: parts[3] || undefined,
                tags: parts[4] || undefined,
            });
        }
        return indicators;
    }
}
exports.ThreatIntelIngestionService = ThreatIntelIngestionService;
