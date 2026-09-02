"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportStudioReport = exports.generateStudioManagementReport = exports.getStudioThreatRankings = exports.getStudioDashboardData = exports.executeResponseAction = exports.reopenIncident = exports.resolveIncident = exports.assignIncident = exports.analyzeThreatContext = exports.getIncidentById = exports.listIncidents = exports.recalculateThreatIntelligence = exports.investigatePrediction = exports.acknowledgeThreatPattern = exports.getThreatPredictions = exports.getThreatSignals = exports.getThreatPatterns = exports.getRiskScores = exports.getIntelligenceStats = exports.getIntelligenceOverview = void 0;
const database_1 = require("@antipiracy/database");
const intelligenceFeedService_1 = require("../services/intelligence/intelligenceFeedService");
const threatIntelligenceEngine_1 = require("../services/intelligence/threatIntelligenceEngine");
const incidentClusteringService_1 = require("../services/intelligence/incidentClusteringService");
const automatedResponseEngine_1 = require("../services/intelligence/automatedResponseEngine");
const intelligenceManager_1 = require("../services/intelligence/intelligenceManager");
/**
 * GET /api/intelligence/overview
 */
const getIntelligenceOverview = async (_req, res, next) => {
    try {
        const data = await intelligenceFeedService_1.intelligenceFeedService.getOverview();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
};
exports.getIntelligenceOverview = getIntelligenceOverview;
/**
 * GET /api/intelligence/stats
 */
const getIntelligenceStats = async (req, res, next) => {
    try {
        const user = req.user;
        const stats = await intelligenceManager_1.intelligenceManager.getStats(user);
        res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
};
exports.getIntelligenceStats = getIntelligenceStats;
/**
 * GET /api/intelligence/risk
 */
const getRiskScores = async (req, res, next) => {
    try {
        const { entityType } = req.query;
        const scores = await database_1.prisma.threatRiskScore.findMany({
            where: { entityType: entityType ? String(entityType) : undefined },
            orderBy: { calculatedAt: "desc" },
            take: 20,
        });
        res.status(200).json({ success: true, data: scores });
    }
    catch (error) {
        next(error);
    }
};
exports.getRiskScores = getRiskScores;
/**
 * GET /api/intelligence/patterns
 */
const getThreatPatterns = async (req, res, next) => {
    try {
        const user = req.user;
        const isProduction = user?.role === "PRODUCTION_COMPANY";
        const companyId = user?.productionCompanyId;
        const patterns = await database_1.prisma.threatPattern.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getThreatPatterns = getThreatPatterns;
/**
 * GET /api/intelligence/signals
 */
const getThreatSignals = async (req, res, next) => {
    try {
        const signals = await database_1.prisma.threatSignal.findMany({
            orderBy: { detectedAt: "desc" },
            take: 50,
        });
        res.status(200).json({ success: true, data: signals });
    }
    catch (error) {
        next(error);
    }
};
exports.getThreatSignals = getThreatSignals;
/**
 * GET /api/intelligence/predictions
 */
const getThreatPredictions = async (req, res, next) => {
    try {
        const user = req.user;
        const isProduction = user?.role === "PRODUCTION_COMPANY";
        const companyId = user?.productionCompanyId;
        const predictions = await database_1.prisma.threatPrediction.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getThreatPredictions = getThreatPredictions;
/**
 * POST /api/intelligence/patterns/:id/acknowledge
 */
const acknowledgeThreatPattern = async (req, res, next) => {
    try {
        const actorUser = req.user;
        const pattern = await intelligenceManager_1.intelligenceManager.acknowledgePattern(req.params.id, actorUser);
        res.status(200).json({ success: true, data: pattern });
    }
    catch (error) {
        next(error);
    }
};
exports.acknowledgeThreatPattern = acknowledgeThreatPattern;
/**
 * POST /api/intelligence/predictions/:id/investigate
 */
const investigatePrediction = async (req, res, next) => {
    try {
        const { incidentId, investigationId, notes } = req.body;
        const link = await intelligenceManager_1.intelligenceManager.linkToInvestigation({
            predictionId: req.params.id,
            incidentId,
            investigationId,
            notes: notes || "Linked via Threat Intelligence predictive workflow",
        });
        res.status(200).json({ success: true, data: link });
    }
    catch (error) {
        next(error);
    }
};
exports.investigatePrediction = investigatePrediction;
/**
 * POST /api/intelligence/recalculate
 */
const recalculateThreatIntelligence = async (req, res, next) => {
    try {
        const actorUser = req.user;
        const result = await intelligenceManager_1.intelligenceManager.recalculateAll(actorUser);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.recalculateThreatIntelligence = recalculateThreatIntelligence;
/**
 * GET /api/intelligence/incidents
 */
const listIncidents = async (req, res, next) => {
    try {
        const { severity, status } = req.query;
        const incidents = await database_1.prisma.threatIntelligenceIncident.findMany({
            where: {
                severity: severity ? String(severity) : undefined,
                status: status ? String(status) : undefined,
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
    }
    catch (error) {
        next(error);
    }
};
exports.listIncidents = listIncidents;
/**
 * GET /api/intelligence/incidents/:id
 */
const getIncidentById = async (req, res, next) => {
    try {
        const incident = await database_1.prisma.threatIntelligenceIncident.findUnique({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getIncidentById = getIncidentById;
/**
 * POST /api/intelligence/analyze
 */
const analyzeThreatContext = async (req, res, next) => {
    try {
        const evaluation = await threatIntelligenceEngine_1.threatIntelligenceEngine.analyzeSessionOrContext(req.body);
        res.status(200).json({ success: true, data: evaluation });
    }
    catch (error) {
        next(error);
    }
};
exports.analyzeThreatContext = analyzeThreatContext;
/**
 * POST /api/intelligence/incidents/:id/assign
 */
const assignIncident = async (req, res, next) => {
    try {
        const { assignedTo } = req.body;
        const incident = await database_1.prisma.threatIntelligenceIncident.update({
            where: { id: req.params.id },
            data: {
                assignedTo,
                status: "INVESTIGATING",
            },
        });
        res.status(200).json({ success: true, data: incident });
    }
    catch (error) {
        next(error);
    }
};
exports.assignIncident = assignIncident;
/**
 * POST /api/intelligence/incidents/:id/resolve
 */
const resolveIncident = async (req, res, next) => {
    try {
        const { resolutionNotes } = req.body;
        const actorUser = req.user;
        const incident = await incidentClusteringService_1.incidentClusteringService.resolveIncident(req.params.id, resolutionNotes || "Resolved by SOC Analyst", actorUser);
        res.status(200).json({ success: true, data: incident });
    }
    catch (error) {
        next(error);
    }
};
exports.resolveIncident = resolveIncident;
/**
 * POST /api/intelligence/incidents/:id/reopen
 */
const reopenIncident = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const actorUser = req.user;
        const incident = await incidentClusteringService_1.incidentClusteringService.reopenIncident(req.params.id, reason || "Reopened for additional investigation", actorUser);
        res.status(200).json({ success: true, data: incident });
    }
    catch (error) {
        next(error);
    }
};
exports.reopenIncident = reopenIncident;
/**
 * POST /api/intelligence/actions/execute
 */
const executeResponseAction = async (req, res, next) => {
    try {
        const { incidentId, actionType, reason, isApprovedBySoc } = req.body;
        const actorUser = req.user;
        const result = await automatedResponseEngine_1.automatedResponseEngine.executeAction({
            incidentId,
            actionType,
            reason: reason || "Automated response triggered by analyst",
            actorUser,
            isApprovedBySoc: !!isApprovedBySoc,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.executeResponseAction = executeResponseAction;
/**
 * GET /api/intelligence/studio/dashboard
 */
const getStudioDashboardData = async (req, res, next) => {
    try {
        const user = req.user;
        const { productionCompanyId, movieId, theatreId, startDate, endDate } = req.query;
        const { studioIntelligenceService } = await Promise.resolve().then(() => __importStar(require("../services/intelligence/studioIntelligenceService")));
        const summary = await studioIntelligenceService.getStudioIntelligence({
            productionCompanyId: productionCompanyId,
            movieId: movieId,
            theatreId: theatreId,
            startDate: startDate,
            endDate: endDate,
        }, user);
        res.status(200).json({ success: true, data: summary });
    }
    catch (error) {
        next(error);
    }
};
exports.getStudioDashboardData = getStudioDashboardData;
/**
 * GET /api/intelligence/studio/rankings
 */
const getStudioThreatRankings = async (req, res, next) => {
    try {
        const user = req.user;
        const { productionCompanyId, startDate, endDate } = req.query;
        const { studioIntelligenceService } = await Promise.resolve().then(() => __importStar(require("../services/intelligence/studioIntelligenceService")));
        const summary = await studioIntelligenceService.getStudioIntelligence({
            productionCompanyId: productionCompanyId,
            startDate: startDate,
            endDate: endDate,
        }, user);
        res.status(200).json({
            success: true,
            data: {
                movieRankings: summary.movieRankings,
                theatreRankings: summary.theatreRankings,
                kpis: summary.kpis,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getStudioThreatRankings = getStudioThreatRankings;
/**
 * POST /api/intelligence/studio/report
 */
const generateStudioManagementReport = async (req, res, next) => {
    try {
        const user = req.user;
        const { productionCompanyId, movieId, theatreId, startDate, endDate, correlationId } = req.body;
        const { studioReportService } = await Promise.resolve().then(() => __importStar(require("../services/intelligence/studioReportService")));
        const report = await studioReportService.generateManagementReport({
            productionCompanyId,
            movieId,
            theatreId,
            startDate,
            endDate,
        }, user, correlationId);
        res.status(201).json({ success: true, data: report });
    }
    catch (error) {
        next(error);
    }
};
exports.generateStudioManagementReport = generateStudioManagementReport;
/**
 * GET /api/intelligence/studio/report/export
 */
const exportStudioReport = async (req, res, next) => {
    try {
        const user = req.user;
        const { productionCompanyId, movieId, theatreId, startDate, endDate, format } = req.query;
        const { studioReportService } = await Promise.resolve().then(() => __importStar(require("../services/intelligence/studioReportService")));
        if (format === "csv") {
            const { filename, csvData } = await studioReportService.exportReportAsCsv({
                productionCompanyId: productionCompanyId,
                movieId: movieId,
                theatreId: theatreId,
                startDate: startDate,
                endDate: endDate,
            }, user);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.status(200).send(csvData);
            return;
        }
        const report = await studioReportService.generateManagementReport({
            productionCompanyId: productionCompanyId,
            movieId: movieId,
            theatreId: theatreId,
            startDate: startDate,
            endDate: endDate,
        }, user);
        res.status(200).json({ success: true, data: report });
    }
    catch (error) {
        next(error);
    }
};
exports.exportStudioReport = exportStudioReport;
