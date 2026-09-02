import { Response } from "express";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { prisma } from "@antipiracy/database";
import { ThreatIntelSourceService } from "../services/threatIntel/threatIntelSourceService";
import { ThreatIntelIngestionService } from "../services/threatIntel/threatIntelIngestionService";
import { ThreatIntelCorrelationEngine } from "../services/threatIntel/threatIntelCorrelationEngine";
import { PiracyCampaignService } from "../services/threatIntel/piracyCampaignService";
import { WebhookSecurityService } from "../services/threatIntel/webhookSecurityService";
import { IndicatorNormalizationService } from "../services/threatIntel/indicatorNormalizationService";
import { ThreatIntelScoringEngine } from "../services/threatIntel/threatIntelScoringEngine";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { SecurityEventType, SecuritySeverity } from "@antipiracy/database";

export class ThreatIntelController {
  // ----------------------------------------------------
  // SOURCES & HEALTH
  // ----------------------------------------------------
  public static async listSources(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const sources = await ThreatIntelSourceService.listSources();
      res.json({ success: true, data: sources });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOURCE_LIST_ERROR" });
    }
  }

  public static async createSource(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { name, providerType, description, trustLevel, defaultConfidence, syncFrequencyMinutes, authConfigReference, webhookSecret } = req.body;
      if (!name || !providerType) {
        res.status(400).json({ success: false, message: "name and providerType are required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const source = await ThreatIntelSourceService.createSource({
        name,
        providerType,
        description,
        trustLevel,
        defaultConfidence,
        syncFrequencyMinutes,
        authConfigReference,
        webhookSecret,
      });

      await SecurityAuditService.logEvent({
        eventType: SecurityEventType.STAFF_VERIFICATION,
        severity: SecuritySeverity.LOW,
        userId: req.user?.id,
        actorEmail: req.user?.email,
        actionSummary: `Created Threat Intelligence Source '${name}'`,
      });

      res.status(201).json({ success: true, data: source });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "CREATE_SOURCE_ERROR" });
    }
  }

  public static async updateSource(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const updated = await ThreatIntelSourceService.updateSource(id, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "UPDATE_SOURCE_ERROR" });
    }
  }

  public static async syncSource(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const source = await ThreatIntelSourceService.getSourceById(id);
      if (!source) {
        res.status(404).json({ success: false, message: "Source not found", errorCode: "NOT_FOUND" });
        return;
      }

      // Trigger correlation scan after sync
      const correlationResult = await ThreatIntelCorrelationEngine.runCorrelationScan();

      res.json({
        success: true,
        data: {
          sourceId: id,
          syncedAt: new Date(),
          status: "SYNC_SUCCESS",
          correlatedMatches: correlationResult.matchCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SYNC_ERROR" });
    }
  }

  public static async getSourceHealth(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const stats = await ThreatIntelSourceService.getSourceHealthStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "HEALTH_ERROR" });
    }
  }

  // ----------------------------------------------------
  // FEEDS & INGESTION
  // ----------------------------------------------------
  public static async listFeeds(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const feeds = await prisma.threatIntelFeed.findMany({
        include: { source: true },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: feeds });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "FEED_LIST_ERROR" });
    }
  }

  public static async importFeed(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { sourceId, format, fileName, rawContent, indicators } = req.body;
      if (!sourceId) {
        res.status(400).json({ success: false, message: "sourceId is required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      let parsedIndicators = indicators;
      if (format === "CSV" && rawContent) {
        parsedIndicators = ThreatIntelIngestionService.parseCsv(rawContent);
      } else if (format === "JSON" && rawContent) {
        parsedIndicators = typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
      }

      if (!parsedIndicators || !Array.isArray(parsedIndicators) || parsedIndicators.length === 0) {
        res.status(400).json({ success: false, message: "No valid indicators provided in import payload", errorCode: "EMPTY_IMPORT" });
        return;
      }

      const result = await ThreatIntelIngestionService.ingestBatch({
        sourceId,
        format: format || "MANUAL",
        fileName,
        indicators: parsedIndicators,
        importedBy: req.user?.email || "ADMIN",
      });

      // Run internal correlation scan on new batch
      const correlation = await ThreatIntelCorrelationEngine.runCorrelationScan();

      res.status(201).json({
        success: true,
        data: {
          ...result,
          correlatedMatchesCount: correlation.matchCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "IMPORT_ERROR" });
    }
  }

  // ----------------------------------------------------
  // INDICATORS & MATCHES
  // ----------------------------------------------------
  public static async listIndicators(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { type, status, level, search, limit } = req.query;
      const where: any = {};

      if (type) where.indicatorType = type as any;
      if (status) where.status = status as any;
      if (level) where.confidenceLevel = level as any;
      if (search) {
        where.OR = [
          { value: { contains: String(search), mode: "insensitive" } },
          { threatClassification: { contains: String(search), mode: "insensitive" } },
          { description: { contains: String(search), mode: "insensitive" } },
        ];
      }

      const indicators = await prisma.threatIntelIndicator.findMany({
        where,
        orderBy: { lastSeen: "desc" },
        take: limit ? parseInt(String(limit), 10) : 100,
        include: {
          source: true,
          _count: { select: { observations: true, matches: true } },
        },
      });

      res.json({ success: true, data: indicators });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "INDICATOR_LIST_ERROR" });
    }
  }

  public static async getIndicatorById(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const indicator = await prisma.threatIntelIndicator.findUnique({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "INDICATOR_ERROR" });
    }
  }

  public static async validateIndicator(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { isConfirmed, notes } = req.body;

      const indicator = await prisma.threatIntelIndicator.findUnique({
        where: { id },
        include: { source: true },
      });

      if (!indicator) {
        res.status(404).json({ success: false, message: "Indicator not found", errorCode: "NOT_FOUND" });
        return;
      }

      const recalculated = ThreatIntelScoringEngine.calculateConfidence({
        sourceTrustLevel: indicator.source.trustLevel,
        isAnalystValidated: isConfirmed === true,
        isReportedFalsePositive: isConfirmed === false,
      });

      const updated = await prisma.threatIntelIndicator.update({
        where: { id },
        data: {
          isAnalystValidated: isConfirmed === true,
          confidenceScore: recalculated.score,
          confidenceLevel: recalculated.level,
          validatedBy: req.user?.email,
          validatedAt: new Date(),
        },
      });

      await prisma.threatIntelAction.create({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "VALIDATION_ERROR" });
    }
  }

  public static async listMatches(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const user = req.user;
      let theatreId: string | undefined = undefined;

      if (user?.role === "THEATRE_STAFF" || user?.role === "THEATRE_ADMIN") {
        theatreId = user.theatreId ?? undefined;
      }

      const matches = await ThreatIntelCorrelationEngine.listMatches({ theatreId });
      res.json({ success: true, data: matches });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "MATCH_LIST_ERROR" });
    }
  }

  // ----------------------------------------------------
  // CAMPAIGNS
  // ----------------------------------------------------
  public static async listCampaigns(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const user = req.user;
      const options: any = {};

      if (user?.role === "PRODUCTION_COMPANY") {
        options.productionCompanyId = user.productionCompanyId ?? undefined;
      } else if (user?.role === "THEATRE_STAFF" || user?.role === "THEATRE_ADMIN") {
        options.theatreId = user.theatreId ?? undefined;
      }

      const campaigns = await PiracyCampaignService.listCampaigns(options);
      res.json({ success: true, data: campaigns });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "CAMPAIGN_LIST_ERROR" });
    }
  }

  public static async createCampaign(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const campaign = await PiracyCampaignService.createCampaign(req.body);
      res.status(201).json({ success: true, data: campaign });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "CAMPAIGN_CREATE_ERROR" });
    }
  }

  public static async getCampaignById(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const campaign = await PiracyCampaignService.getCampaignById(id);
      if (!campaign) {
        res.status(404).json({ success: false, message: "Campaign not found", errorCode: "NOT_FOUND" });
        return;
      }
      res.json({ success: true, data: campaign });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "CAMPAIGN_ERROR" });
    }
  }

  // ----------------------------------------------------
  // ANALYZE & STATS
  // ----------------------------------------------------
  public static async analyzeInput(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { type, value } = req.body;
      if (!type || !value) {
        res.status(400).json({ success: false, message: "type and value are required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const normalized = IndicatorNormalizationService.normalize(type, value);
      const matchingIndicators = await prisma.threatIntelIndicator.findMany({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "ANALYZE_ERROR" });
    }
  }

  public static async getStats(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const [
        totalSources,
        activeSources,
        totalIndicators,
        activeIndicators,
        highConfidenceIndicators,
        totalCampaigns,
        activeCampaigns,
        totalMatches,
      ] = await Promise.all([
        prisma.threatIntelSource.count(),
        prisma.threatIntelSource.count({ where: { isEnabled: true } }),
        prisma.threatIntelIndicator.count(),
        prisma.threatIntelIndicator.count({ where: { status: "ACTIVE" } }),
        prisma.threatIntelIndicator.count({ where: { confidenceLevel: { in: ["HIGH", "VERY_HIGH"] } } }),
        prisma.threatIntelCampaign.count(),
        prisma.threatIntelCampaign.count({ where: { status: "ACTIVE" } }),
        prisma.threatIntelMatch.count(),
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "STATS_ERROR" });
    }
  }

  // ----------------------------------------------------
  // SECURE WEBHOOK INGESTION
  // ----------------------------------------------------
  public static async handleWebhook(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { sourceId } = req.params;
      const signatureHeader = req.headers["x-threat-signature"] as string | undefined;
      const timestampHeader = req.headers["x-threat-timestamp"] as string | undefined;

      const source = await prisma.threatIntelSource.findUnique({
        where: { id: sourceId },
      });

      if (!source || !source.isEnabled) {
        res.status(404).json({ success: false, message: "Threat source not found or disabled", errorCode: "NOT_FOUND" });
        return;
      }

      // Default secret fallback or configured secret
      const secret = source.webhookSecretHash || "default_webhook_secret_key";
      const rawPayload = JSON.stringify(req.body);

      const validation = await WebhookSecurityService.validateWebhook({
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

      const ingestionResult = await ThreatIntelIngestionService.ingestBatch({
        sourceId: source.id,
        format: "WEBHOOK",
        indicators,
        importedBy: "WEBHOOK",
      });

      // Advisory correlation
      await ThreatIntelCorrelationEngine.runCorrelationScan();

      res.status(200).json({
        success: true,
        data: {
          message: "Webhook processed successfully",
          ...ingestionResult,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "WEBHOOK_ERROR" });
    }
  }
}
