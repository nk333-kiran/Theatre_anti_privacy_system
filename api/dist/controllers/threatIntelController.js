"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelController = void 0;
const database_1 = require("@antipiracy/database");
const threatIntelSourceService_1 = require("../services/threatIntel/threatIntelSourceService");
const threatIntelIngestionService_1 = require("../services/threatIntel/threatIntelIngestionService");
const threatIntelCorrelationEngine_1 = require("../services/threatIntel/threatIntelCorrelationEngine");
const piracyCampaignService_1 = require("../services/threatIntel/piracyCampaignService");
const webhookSecurityService_1 = require("../services/threatIntel/webhookSecurityService");
const indicatorNormalizationService_1 = require("../services/threatIntel/indicatorNormalizationService");
const threatIntelScoringEngine_1 = require("../services/threatIntel/threatIntelScoringEngine");
const securityAuditService_1 = require("../services/security/securityAuditService");
const database_2 = require("@antipiracy/database");
class ThreatIntelController {
    // ----------------------------------------------------
    // SOURCES & HEALTH
    // ----------------------------------------------------
    static async listSources(req, res) {
        try {
            const sources = await threatIntelSourceService_1.ThreatIntelSourceService.listSources();
            res.json({ success: true, data: sources });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOURCE_LIST_ERROR" });
        }
    }
    static async createSource(req, res) {
        try {
            const { name, providerType, description, trustLevel, defaultConfidence, syncFrequencyMinutes, authConfigReference, webhookSecret } = req.body;
            if (!name || !providerType) {
                res.status(400).json({ success: false, message: "name and providerType are required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const source = await threatIntelSourceService_1.ThreatIntelSourceService.createSource({
                name,
                providerType,
                description,
                trustLevel,
                defaultConfidence,
                syncFrequencyMinutes,
                authConfigReference,
                webhookSecret,
            });
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: database_2.SecurityEventType.STAFF_VERIFICATION,
                severity: database_2.SecuritySeverity.LOW,
                userId: req.user?.id,
                actorEmail: req.user?.email,
                actionSummary: `Created Threat Intelligence Source '${name}'`,
            });
            res.status(201).json({ success: true, data: source });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "CREATE_SOURCE_ERROR" });
        }
    }
    static async updateSource(req, res) {
        try {
            const { id } = req.params;
            const updated = await threatIntelSourceService_1.ThreatIntelSourceService.updateSource(id, req.body);
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "UPDATE_SOURCE_ERROR" });
        }
    }
    static async syncSource(req, res) {
        try {
            const { id } = req.params;
            const source = await threatIntelSourceService_1.ThreatIntelSourceService.getSourceById(id);
            if (!source) {
                res.status(404).json({ success: false, message: "Source not found", errorCode: "NOT_FOUND" });
                return;
            }
            // Trigger correlation scan after sync
            const correlationResult = await threatIntelCorrelationEngine_1.ThreatIntelCorrelationEngine.runCorrelationScan();
            res.json({
                success: true,
                data: {
                    sourceId: id,
                    syncedAt: new Date(),
                    status: "SYNC_SUCCESS",
                    correlatedMatches: correlationResult.matchCount,
                },
            });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SYNC_ERROR" });
        }
    }
    static async getSourceHealth(req, res) {
        try {
            const stats = await threatIntelSourceService_1.ThreatIntelSourceService.getSourceHealthStats();
            res.json({ success: true, data: stats });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "HEALTH_ERROR" });
        }
    }
    // ----------------------------------------------------
    // FEEDS & INGESTION
    // ----------------------------------------------------
    static async listFeeds(req, res) {
        try {
            const feeds = await database_1.prisma.threatIntelFeed.findMany({
                include: { source: true },
                orderBy: { createdAt: "desc" },
            });
            res.json({ success: true, data: feeds });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "FEED_LIST_ERROR" });
        }
    }
    static async importFeed(req, res) {
        try {
            const { sourceId, format, fileName, rawContent, indicators } = req.body;
            if (!sourceId) {
                res.status(400).json({ success: false, message: "sourceId is required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            let parsedIndicators = indicators;
            if (format === "CSV" && rawContent) {
                parsedIndicators = threatIntelIngestionService_1.ThreatIntelIngestionService.parseCsv(rawContent);
            }
            else if (format === "JSON" && rawContent) {
                parsedIndicators = typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
            }
            if (!parsedIndicators || !Array.isArray(parsedIndicators) || parsedIndicators.length === 0) {
                res.status(400).json({ success: false, message: "No valid indicators provided in import payload", errorCode: "EMPTY_IMPORT" });
                return;
            }
            const result = await threatIntelIngestionService_1.ThreatIntelIngestionService.ingestBatch({
                sourceId,
                format: format || "MANUAL",
                fileName,
                indicators: parsedIndicators,
                importedBy: req.user?.email || "ADMIN",
            });
            // Run internal correlation scan on new batch
            const correlation = await threatIntelCorrelationEngine_1.ThreatIntelCorrelationEngine.runCorrelationScan();
            res.status(201).json({
                success: true,
                data: {
                    ...result,
                    correlatedMatchesCount: correlation.matchCount,
                },
            });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "IMPORT_ERROR" });
        }
    }
    // ----------------------------------------------------
    // INDICATORS & MATCHES
    // ----------------------------------------------------
    static async listIndicators(req, res) {
        try {
            const { type, status, level, search, limit } = req.query;
            const where = {};
            if (type)
                where.indicatorType = type;
            if (status)
                where.status = status;
            if (level)
                where.confidenceLevel = level;
            if (search) {
                where.OR = [
                    { value: { contains: String(search), mode: "insensitive" } },
                    { threatClassification: { contains: String(search), mode: "insensitive" } },
                    { description: { contains: String(search), mode: "insensitive" } },
                ];
            }
            const indicators = await database_1.prisma.threatIntelIndicator.findMany({
                where,
                orderBy: { lastSeen: "desc" },
                take: limit ? parseInt(String(limit), 10) : 100,
                include: {
                    source: true,
                    _count: { select: { observations: true, matches: true } },
                },
            });
            res.json({ success: true, data: indicators });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "INDICATOR_LIST_ERROR" });
        }
    }
    static async getIndicatorById(req, res) {
        try {
            const { id } = req.params;
            const indicator = await database_1.prisma.threatIntelIndicator.findUnique({
                where: { id },
                include: {
                    source: true,
                    observations: { orderBy: { timestamp: "desc" }, take: 10 },
                    matches: {
                        include: { theatre: true, movie: true, playbackSession: true, investigationCase: true },
                    },
                    campaigns: true,
                },
            });
            if (!indicator) {
                res.status(404).json({ success: false, message: "Indicator not found", errorCode: "NOT_FOUND" });
                return;
            }
            res.json({ success: true, data: indicator });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "INDICATOR_ERROR" });
        }
    }
    static async validateIndicator(req, res) {
        try {
            const { id } = req.params;
            const { isConfirmed, notes } = req.body;
            const indicator = await database_1.prisma.threatIntelIndicator.findUnique({
                where: { id },
                include: { source: true },
            });
            if (!indicator) {
                res.status(404).json({ success: false, message: "Indicator not found", errorCode: "NOT_FOUND" });
                return;
            }
            const recalculated = threatIntelScoringEngine_1.ThreatIntelScoringEngine.calculateConfidence({
                sourceTrustLevel: indicator.source.trustLevel,
                isAnalystValidated: isConfirmed === true,
                isReportedFalsePositive: isConfirmed === false,
            });
            const updated = await database_1.prisma.threatIntelIndicator.update({
                where: { id },
                data: {
                    isAnalystValidated: isConfirmed === true,
                    confidenceScore: recalculated.score,
                    confidenceLevel: recalculated.level,
                    validatedBy: req.user?.email,
                    validatedAt: new Date(),
                },
            });
            await database_1.prisma.threatIntelAction.create({
                data: {
                    actionType: isConfirmed ? "ANALYST_VALIDATE" : "MARK_FALSE_POSITIVE",
                    indicatorId: id,
                    actorId: req.user?.id || "SYSTEM",
                    actorEmail: req.user?.email,
                    actorRole: req.user?.role,
                    notes: notes || (isConfirmed ? "Analyst verified indicator" : "Analyst reported false positive"),
                },
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "VALIDATION_ERROR" });
        }
    }
    static async listMatches(req, res) {
        try {
            const user = req.user;
            let theatreId = undefined;
            if (user?.role === "THEATRE_STAFF" || user?.role === "THEATRE_ADMIN") {
                theatreId = user.theatreId ?? undefined;
            }
            const matches = await threatIntelCorrelationEngine_1.ThreatIntelCorrelationEngine.listMatches({ theatreId });
            res.json({ success: true, data: matches });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "MATCH_LIST_ERROR" });
        }
    }
    // ----------------------------------------------------
    // CAMPAIGNS
    // ----------------------------------------------------
    static async listCampaigns(req, res) {
        try {
            const user = req.user;
            const options = {};
            if (user?.role === "PRODUCTION_COMPANY") {
                options.productionCompanyId = user.productionCompanyId ?? undefined;
            }
            else if (user?.role === "THEATRE_STAFF" || user?.role === "THEATRE_ADMIN") {
                options.theatreId = user.theatreId ?? undefined;
            }
            const campaigns = await piracyCampaignService_1.PiracyCampaignService.listCampaigns(options);
            res.json({ success: true, data: campaigns });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "CAMPAIGN_LIST_ERROR" });
        }
    }
    static async createCampaign(req, res) {
        try {
            const campaign = await piracyCampaignService_1.PiracyCampaignService.createCampaign(req.body);
            res.status(201).json({ success: true, data: campaign });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "CAMPAIGN_CREATE_ERROR" });
        }
    }
    static async getCampaignById(req, res) {
        try {
            const { id } = req.params;
            const campaign = await piracyCampaignService_1.PiracyCampaignService.getCampaignById(id);
            if (!campaign) {
                res.status(404).json({ success: false, message: "Campaign not found", errorCode: "NOT_FOUND" });
                return;
            }
            res.json({ success: true, data: campaign });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "CAMPAIGN_ERROR" });
        }
    }
    // ----------------------------------------------------
    // ANALYZE & STATS
    // ----------------------------------------------------
    static async analyzeInput(req, res) {
        try {
            const { type, value } = req.body;
            if (!type || !value) {
                res.status(400).json({ success: false, message: "type and value are required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const normalized = indicatorNormalizationService_1.IndicatorNormalizationService.normalize(type, value);
            const matchingIndicators = await database_1.prisma.threatIntelIndicator.findMany({
                where: {
                    indicatorType: type,
                    value: normalized.canonicalValue,
                },
                include: { source: true, campaigns: true, matches: true },
            });
            res.json({
                success: true,
                data: {
                    normalized,
                    isKnownThreat: matchingIndicators.length > 0,
                    threatIndicators: matchingIndicators,
                },
            });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "ANALYZE_ERROR" });
        }
    }
    static async getStats(req, res) {
        try {
            const [totalSources, activeSources, totalIndicators, activeIndicators, highConfidenceIndicators, totalCampaigns, activeCampaigns, totalMatches,] = await Promise.all([
                database_1.prisma.threatIntelSource.count(),
                database_1.prisma.threatIntelSource.count({ where: { isEnabled: true } }),
                database_1.prisma.threatIntelIndicator.count(),
                database_1.prisma.threatIntelIndicator.count({ where: { status: "ACTIVE" } }),
                database_1.prisma.threatIntelIndicator.count({ where: { confidenceLevel: { in: ["HIGH", "VERY_HIGH"] } } }),
                database_1.prisma.threatIntelCampaign.count(),
                database_1.prisma.threatIntelCampaign.count({ where: { status: "ACTIVE" } }),
                database_1.prisma.threatIntelMatch.count(),
            ]);
            res.json({
                success: true,
                data: {
                    totalSources,
                    activeSources,
                    totalIndicators,
                    activeIndicators,
                    highConfidenceIndicators,
                    totalCampaigns,
                    activeCampaigns,
                    totalMatches,
                },
            });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "STATS_ERROR" });
        }
    }
    // ----------------------------------------------------
    // SECURE WEBHOOK INGESTION
    // ----------------------------------------------------
    static async handleWebhook(req, res) {
        try {
            const { sourceId } = req.params;
            const signatureHeader = req.headers["x-threat-signature"];
            const timestampHeader = req.headers["x-threat-timestamp"];
            const source = await database_1.prisma.threatIntelSource.findUnique({
                where: { id: sourceId },
            });
            if (!source || !source.isEnabled) {
                res.status(404).json({ success: false, message: "Threat source not found or disabled", errorCode: "NOT_FOUND" });
                return;
            }
            // Default secret fallback or configured secret
            const secret = source.webhookSecretHash || "default_webhook_secret_key";
            const rawPayload = JSON.stringify(req.body);
            const validation = await webhookSecurityService_1.WebhookSecurityService.validateWebhook({
                rawPayload,
                signatureHeader,
                timestampHeader,
                configuredSecret: secret,
                ipAddress: req.ip,
            });
            if (!validation.isValid) {
                res.status(401).json({
                    success: false,
                    message: validation.errorMessage || "Webhook validation failed",
                    errorCode: validation.errorCode,
                });
                return;
            }
            const indicators = Array.isArray(req.body.indicators)
                ? req.body.indicators
                : [req.body];
            const ingestionResult = await threatIntelIngestionService_1.ThreatIntelIngestionService.ingestBatch({
                sourceId: source.id,
                format: "WEBHOOK",
                indicators,
                importedBy: "WEBHOOK",
            });
            // Advisory correlation
            await threatIntelCorrelationEngine_1.ThreatIntelCorrelationEngine.runCorrelationScan();
            res.status(200).json({
                success: true,
                data: {
                    message: "Webhook processed successfully",
                    ...ingestionResult,
                },
            });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "WEBHOOK_ERROR" });
        }
    }
}
exports.ThreatIntelController = ThreatIntelController;
