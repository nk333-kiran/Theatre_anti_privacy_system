import { Request, Response, NextFunction } from "express";
import { prisma } from "@antipiracy/database";
import { intelligenceFeedService } from "../services/intelligence/intelligenceFeedService";
import { threatIntelligenceEngine } from "../services/intelligence/threatIntelligenceEngine";
import { incidentClusteringService } from "../services/intelligence/incidentClusteringService";
import { automatedResponseEngine } from "../services/intelligence/automatedResponseEngine";
import { intelligenceManager } from "../services/intelligence/intelligenceManager";
import { signalAggregator } from "../services/intelligence/signalAggregator";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { ApiResponse } from "../types";

/**
 * GET /api/intelligence/overview
 */
export const getIntelligenceOverview = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await intelligenceFeedService.getOverview();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/stats
 */
export const getIntelligenceStats = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    const stats = await intelligenceManager.getStats(user);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/risk
 */
export const getRiskScores = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType } = req.query;
    const scores = await prisma.threatRiskScore.findMany({
      where: { entityType: entityType ? String(entityType) : undefined },
      orderBy: { calculatedAt: "desc" },
      take: 20,
    });
    res.status(200).json({ success: true, data: scores });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/patterns
 */
export const getThreatPatterns = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    const isProduction = user?.role === "PRODUCTION_COMPANY";
    const companyId = user?.productionCompanyId;

    const patterns = await prisma.threatPattern.findMany({
      where: {
        movie: isProduction && companyId ? { productionCompanyId: companyId } : undefined,
      },
      include: {
        theatre: { select: { name: true, code: true } },
        show: { select: { startTime: true, movie: { select: { title: true } } } },
        signals: true,
        links: true,
      },
      orderBy: { lastDetectedAt: "desc" },
      take: 50,
    });

    res.status(200).json({ success: true, data: patterns });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/signals
 */
export const getThreatSignals = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const signals = await prisma.threatSignal.findMany({
      orderBy: { detectedAt: "desc" },
      take: 50,
    });
    res.status(200).json({ success: true, data: signals });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/predictions
 */
export const getThreatPredictions = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    const isProduction = user?.role === "PRODUCTION_COMPANY";
    const companyId = user?.productionCompanyId;

    const predictions = await prisma.threatPrediction.findMany({
      where: {
        movie: isProduction && companyId ? { productionCompanyId: companyId } : undefined,
      },
      include: {
        theatre: { select: { name: true, code: true } },
        show: { select: { startTime: true, screen: { select: { name: true } } } },
        movie: { select: { title: true, rating: true } },
        links: true,
      },
      orderBy: { predictedRisk: "desc" },
      take: 30,
    });

    res.status(200).json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/patterns/:id/acknowledge
 */
export const acknowledgeThreatPattern = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const actorUser = (req as any).user;
    const pattern = await intelligenceManager.acknowledgePattern(req.params.id, actorUser);
    res.status(200).json({ success: true, data: pattern });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/predictions/:id/investigate
 */
export const investigatePrediction = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { incidentId, investigationId, notes } = req.body;
    const link = await intelligenceManager.linkToInvestigation({
      predictionId: req.params.id,
      incidentId,
      investigationId,
      notes: notes || "Linked via Threat Intelligence predictive workflow",
    });
    res.status(200).json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/recalculate
 */
export const recalculateThreatIntelligence = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const actorUser = (req as any).user;
    const result = await intelligenceManager.recalculateAll(actorUser);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/incidents
 */
export const listIncidents = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { severity, status } = req.query;
    const incidents = await prisma.threatIntelligenceIncident.findMany({
      where: {
        severity: severity ? (String(severity) as any) : undefined,
        status: status ? (String(status) as any) : undefined,
      },
      include: {
        theatre: { select: { name: true, code: true } },
        show: { select: { startTime: true, movie: { select: { title: true } } } },
        signals: true,
        actions: true,
      },
      orderBy: { lastDetectedAt: "desc" },
    });

    res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/incidents/:id
 */
export const getIncidentById = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const incident = await prisma.threatIntelligenceIncident.findUnique({
      where: { id: req.params.id },
      include: {
        theatre: true,
        show: { include: { movie: true } },
        activation: true,
        playbackSession: true,
        signals: true,
        correlations: true,
        actions: true,
      },
    });

    if (!incident) {
      res.status(404).json({ success: false, message: "Threat Intelligence Incident not found" });
      return;
    }

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/analyze
 */
export const analyzeThreatContext = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const evaluation = await threatIntelligenceEngine.analyzeSessionOrContext(req.body);
    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/incidents/:id/assign
 */
export const assignIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { assignedTo } = req.body;
    const incident = await prisma.threatIntelligenceIncident.update({
      where: { id: req.params.id },
      data: {
        assignedTo,
        status: "INVESTIGATING",
      },
    });

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/incidents/:id/resolve
 */
export const resolveIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { resolutionNotes } = req.body;
    const actorUser = (req as any).user;
    const incident = await incidentClusteringService.resolveIncident(
      req.params.id,
      resolutionNotes || "Resolved by SOC Analyst",
      actorUser
    );

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/incidents/:id/reopen
 */
export const reopenIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { reason } = req.body;
    const actorUser = (req as any).user;
    const incident = await incidentClusteringService.reopenIncident(
      req.params.id,
      reason || "Reopened for additional investigation",
      actorUser
    );

    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/actions/execute
 */
export const executeResponseAction = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { incidentId, actionType, reason, isApprovedBySoc } = req.body;
    const actorUser = (req as any).user;

    const result = await automatedResponseEngine.executeAction({
      incidentId,
      actionType,
      reason: reason || "Automated response triggered by analyst",
      actorUser,
      isApprovedBySoc: !!isApprovedBySoc,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/studio/dashboard
 */
export const getStudioDashboardData = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { productionCompanyId, movieId, theatreId, startDate, endDate } = req.query;

    const { studioIntelligenceService } = await import("../services/intelligence/studioIntelligenceService");
    const summary = await studioIntelligenceService.getStudioIntelligence(
      {
        productionCompanyId: productionCompanyId as string,
        movieId: movieId as string,
        theatreId: theatreId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      user
    );

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/studio/rankings
 */
export const getStudioThreatRankings = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { productionCompanyId, startDate, endDate } = req.query;

    const { studioIntelligenceService } = await import("../services/intelligence/studioIntelligenceService");
    const summary = await studioIntelligenceService.getStudioIntelligence(
      {
        productionCompanyId: productionCompanyId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      user
    );

    res.status(200).json({
      success: true,
      data: {
        movieRankings: summary.movieRankings,
        theatreRankings: summary.theatreRankings,
        kpis: summary.kpis,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/intelligence/studio/report
 */
export const generateStudioManagementReport = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { productionCompanyId, movieId, theatreId, startDate, endDate, correlationId } = req.body;

    const { studioReportService } = await import("../services/intelligence/studioReportService");
    const report = await studioReportService.generateManagementReport(
      {
        productionCompanyId,
        movieId,
        theatreId,
        startDate,
        endDate,
      },
      user,
      correlationId
    );

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/intelligence/studio/report/export
 */
export const exportStudioReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { productionCompanyId, movieId, theatreId, startDate, endDate, format } = req.query;

    const { studioReportService } = await import("../services/intelligence/studioReportService");

    if (format === "csv") {
      const { filename, csvData } = await studioReportService.exportReportAsCsv(
        {
          productionCompanyId: productionCompanyId as string,
          movieId: movieId as string,
          theatreId: theatreId as string,
          startDate: startDate as string,
          endDate: endDate as string,
        },
        user
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csvData);
      return;
    }

    const report = await studioReportService.generateManagementReport(
      {
        productionCompanyId: productionCompanyId as string,
        movieId: movieId as string,
        theatreId: theatreId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      user
    );

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};
