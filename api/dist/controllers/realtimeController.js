"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCustomAction = exports.rejectResponseAction = exports.approveResponseAction = exports.analyzeRealtimeEvent = exports.getEntityRisk = exports.getRealtimeIncidents = exports.getRealtimeThreats = exports.getRealtimeEvents = exports.getRealtimeStatus = exports.getSecurityStream = void 0;
const database_1 = require("@antipiracy/database");
const realtimeManager_1 = require("../services/realtime/realtimeManager");
const realtimeEventBus_1 = require("../services/realtime/realtimeEventBus");
const eventCorrelationEngine_1 = require("../services/realtime/eventCorrelationEngine");
const riskEscalationEngine_1 = require("../services/realtime/riskEscalationEngine");
const crypto_1 = __importDefault(require("crypto"));
/**
 * GET /api/realtime/security-stream (SSE Stream)
 */
const getSecurityStream = (req, res) => {
    const user = req.user;
    // SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const clientId = `client_${Date.now()}_${crypto_1.default.randomBytes(4).toString("hex")}`;
    realtimeManager_1.realtimeManager.addClient(clientId, res, user);
    req.on("close", () => {
        realtimeManager_1.realtimeManager.removeClient(clientId);
    });
};
exports.getSecurityStream = getSecurityStream;
/**
 * GET /api/realtime/status
 */
const getRealtimeStatus = async (_req, res, next) => {
    try {
        const connectedClients = realtimeManager_1.realtimeManager.getConnectedClientsCount();
        const overallRisk = riskEscalationEngine_1.riskEscalationEngine.getEntityRisk("OVERALL", "GLOBAL");
        const activeThreatClusters = eventCorrelationEngine_1.eventCorrelationEngine.correlateThreats().length;
        res.status(200).json({
            success: true,
            data: {
                status: "ONLINE",
                connectedStreamClients: connectedClients,
                overallRiskScore: overallRisk.currentScore,
                overallRiskLevel: overallRisk.riskLevel,
                activeThreatClusters,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getRealtimeStatus = getRealtimeStatus;
/**
 * GET /api/realtime/events
 */
const getRealtimeEvents = async (req, res, next) => {
    try {
        const { severity, eventType, theatreId } = req.query;
        const events = await database_1.prisma.realtimeThreatEvent.findMany({
            where: {
                severity: severity ? String(severity) : undefined,
                eventType: eventType ? String(eventType) : undefined,
                theatreId: theatreId ? String(theatreId) : undefined,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        res.status(200).json({ success: true, data: events });
    }
    catch (error) {
        next(error);
    }
};
exports.getRealtimeEvents = getRealtimeEvents;
/**
 * GET /api/realtime/threats
 */
const getRealtimeThreats = async (_req, res, next) => {
    try {
        const clusters = eventCorrelationEngine_1.eventCorrelationEngine.correlateThreats();
        res.status(200).json({ success: true, data: clusters });
    }
    catch (error) {
        next(error);
    }
};
exports.getRealtimeThreats = getRealtimeThreats;
/**
 * GET /api/realtime/incidents
 */
const getRealtimeIncidents = async (_req, res, next) => {
    try {
        const notifications = await database_1.prisma.realtimeIncidentNotification.findMany({
            include: { theatre: true, show: true, movie: true },
            orderBy: { sentAt: "desc" },
            take: 30,
        });
        res.status(200).json({ success: true, data: notifications });
    }
    catch (error) {
        next(error);
    }
};
exports.getRealtimeIncidents = getRealtimeIncidents;
/**
 * GET /api/realtime/risk/:entityType/:entityId
 */
const getEntityRisk = async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        const risk = riskEscalationEngine_1.riskEscalationEngine.getEntityRisk(entityType, entityId);
        res.status(200).json({ success: true, data: risk });
    }
    catch (error) {
        next(error);
    }
};
exports.getEntityRisk = getEntityRisk;
/**
 * POST /api/realtime/analyze
 */
const analyzeRealtimeEvent = async (req, res, next) => {
    try {
        const event = await realtimeEventBus_1.realtimeEventBus.publish(req.body);
        res.status(201).json({ success: true, data: event });
    }
    catch (error) {
        next(error);
    }
};
exports.analyzeRealtimeEvent = analyzeRealtimeEvent;
/**
 * POST /api/realtime/actions/:id/approve
 */
const approveResponseAction = async (req, res, next) => {
    try {
        const actorUser = req.user;
        const approved = await realtimeManager_1.realtimeManager.approveAction(req.params.id, actorUser);
        res.status(200).json({ success: true, data: approved });
    }
    catch (error) {
        next(error);
    }
};
exports.approveResponseAction = approveResponseAction;
/**
 * POST /api/realtime/actions/:id/reject
 */
const rejectResponseAction = async (req, res, next) => {
    try {
        const actorUser = req.user;
        const { notes } = req.body;
        const rejected = await realtimeManager_1.realtimeManager.rejectAction(req.params.id, actorUser, notes);
        res.status(200).json({ success: true, data: rejected });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectResponseAction = rejectResponseAction;
/**
 * POST /api/realtime/actions/execute
 */
const executeCustomAction = async (req, res, next) => {
    try {
        const { actionType, targetId, reason } = req.body;
        const actorUser = req.user;
        const action = await database_1.prisma.automatedResponse.create({
            data: {
                actionType,
                targetId,
                reason: reason || "Manual execution by administrator",
                status: "APPROVED",
            },
        });
        const executed = await realtimeManager_1.realtimeManager.approveAction(action.id, actorUser);
        res.status(200).json({ success: true, data: executed });
    }
    catch (error) {
        next(error);
    }
};
exports.executeCustomAction = executeCustomAction;
