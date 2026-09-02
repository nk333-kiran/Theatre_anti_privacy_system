"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLiveSecurityStream = exports.getLiveThreatAlerts = exports.getIncidentScorecard = exports.getIncidentEvidence = exports.executeResponseAction = exports.resolveIncident = exports.escalateIncident = exports.assignIncident = exports.acknowledgeIncident = exports.createSecurityIncident = exports.getSecurityIncidentDetails = exports.listSecurityIncidents = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const realtimeThreatEngine_1 = require("../services/security/realtimeThreatEngine");
const incidentResponseService_1 = require("../services/security/incidentResponseService");
const securityAuditService_1 = require("../services/security/securityAuditService");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * GET /api/incidents
 * List security incidents with filters
 */
const listSecurityIncidents = async (req, res, next) => {
    try {
        const { status, severity, theatreId, limit, offset } = req.query;
        const where = {};
        if (status && Object.values(database_1.SecurityIncidentStatus).includes(status)) {
            where.status = status;
        }
        if (severity && Object.values(database_1.IncidentSeverity).includes(severity)) {
            where.severity = severity;
        }
        if (theatreId) {
            where.theatreId = String(theatreId);
        }
        const take = limit ? Math.min(parseInt(String(limit), 10), 100) : 50;
        const skip = offset ? parseInt(String(offset), 10) : 0;
        const [incidents, totalCount] = await Promise.all([
            database_1.prisma.securityIncident.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: "desc" },
                include: {
                    theatre: { select: { id: true, name: true, code: true } },
                    movie: { select: { id: true, title: true } },
                    show: {
                        select: {
                            id: true,
                            startTime: true,
                            screen: { select: { screenNumber: true, name: true } },
                        },
                    },
                    assignedTo: { select: { id: true, name: true, email: true } },
                    _count: { select: { evidenceItems: true, actions: true } },
                },
            }),
            database_1.prisma.securityIncident.count({ where }),
        ]);
        res.status(200).json({
            success: true,
            data: { incidents, totalCount },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listSecurityIncidents = listSecurityIncidents;
/**
 * GET /api/incidents/:id
 * Retrieve incident details, evidence, actions, and full correlation graph
 */
const getSecurityIncidentDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const incident = await database_1.prisma.securityIncident.findFirst({
            where: {
                OR: [{ id }, { incidentNumber: id }],
            },
            include: {
                theatre: true,
                show: {
                    include: {
                        movie: true,
                        screen: true,
                    },
                },
                movie: true,
                activation: {
                    include: {
                        ticket: true,
                        verifications: {
                            include: { staff: { select: { id: true, name: true, email: true } } },
                        },
                    },
                },
                playbackSession: {
                    include: {
                        drmLicenses: true,
                    },
                },
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
                evidenceItems: {
                    orderBy: { capturedAt: "desc" },
                },
                actions: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!incident) {
            throw new errorHandler_1.AppError(`SecurityIncident ${id} not found`, 404, "NOT_FOUND");
        }
        // Build visual Threat Correlation Graph nodes & edges
        const correlationGraph = {
            nodes: [
                { id: "THEATRE", type: "theatre", label: incident.theatre?.name || "Global / Online", code: incident.theatre?.code },
                { id: "SHOW", type: "show", label: incident.movie?.title || "Screening Show", startTime: incident.show?.startTime },
                { id: "SCREEN", type: "screen", label: `Screen ${incident.show?.screen?.screenNumber || "1"}` },
                { id: "SEAT", type: "seat", label: `Seat ${incident.activation?.ticket?.seatNumber || "General"}` },
                { id: "TICKET", type: "ticket", label: incident.activation?.ticket?.ticketNumber || "N/A" },
                { id: "ACTIVATION", type: "activation", label: incident.activation?.activationCode ? `ACT-${incident.activation.activationCode.slice(0, 8)}` : "N/A", status: incident.activation?.status },
                { id: "SESSION", type: "session", label: incident.playbackSession ? `PBT-${incident.playbackSession.id.slice(0, 8)}` : "No Active Session", status: incident.playbackSession?.status },
                { id: "DRM", type: "drm", label: incident.playbackSession?.drmLicenses[0]?.status ? `DRM-${incident.playbackSession.drmLicenses[0].status}` : "DRM Unlicensed" },
                { id: "INCIDENT", type: "incident", label: incident.incidentNumber, severity: incident.severity, riskScore: incident.riskScore },
            ],
            chain: "Theatre -> Show -> Screen -> Seat -> Ticket -> Activation -> Playback Session -> DRM License -> Security Events -> Incident",
        };
        res.status(200).json({
            success: true,
            data: {
                incident,
                correlationGraph,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSecurityIncidentDetails = getSecurityIncidentDetails;
/**
 * POST /api/incidents
 * Create a new Security Incident
 */
const createSecurityIncident = async (req, res, next) => {
    try {
        const { title, description, severity, source, theatreId, showId, movieId, activationId, playbackSessionId, riskScore, } = req.body;
        const actorUser = req.user;
        const incidentNumber = `SEC-${Date.now().toString(36).toUpperCase()}-${crypto_1.default.randomBytes(2).toString("hex").toUpperCase()}`;
        const incident = await database_1.prisma.securityIncident.create({
            data: {
                incidentNumber,
                title: title || "Automated Threat Alert Triggered",
                description,
                severity: severity || "MEDIUM",
                status: "NEW",
                source: source || "THREAT_ENGINE",
                theatreId,
                showId,
                movieId,
                activationId,
                playbackSessionId,
                riskScore: riskScore ? Number(riskScore) : 50,
                assignedToId: actorUser?.id,
            },
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: incident.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
            userId: actorUser?.id,
            actorEmail: actorUser?.email,
            actorRole: actorUser?.role,
            theatreId,
            showId,
            activationId,
            actionSummary: `Created Security Incident ${incident.incidentNumber}: ${incident.title}`,
            isThreat: true,
            threatDetails: `Risk: ${incident.riskScore}/100, Severity: ${incident.severity}`,
        });
        realtimeThreatEngine_1.realtimeThreatEngine.broadcast("incident_created", {
            incidentId: incident.id,
            incidentNumber: incident.incidentNumber,
            title: incident.title,
            severity: incident.severity,
            riskScore: incident.riskScore,
            createdAt: incident.createdAt.toISOString(),
        });
        res.status(201).json({
            success: true,
            message: `Security Incident ${incident.incidentNumber} created.`,
            data: incident,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createSecurityIncident = createSecurityIncident;
/**
 * POST /api/incidents/:id/acknowledge
 */
const acknowledgeIncident = async (req, res, next) => {
    try {
        const { id } = req.params;
        const actorUser = req.user;
        const updated = await database_1.prisma.securityIncident.update({
            where: { id },
            data: {
                status: "ACKNOWLEDGED",
                acknowledgedAt: new Date(),
                assignedToId: actorUser?.id || undefined,
            },
        });
        realtimeThreatEngine_1.realtimeThreatEngine.broadcast("incident_updated", {
            incidentId: updated.id,
            status: updated.status,
            acknowledgedAt: updated.acknowledgedAt?.toISOString(),
        });
        res.status(200).json({
            success: true,
            message: `Incident ${updated.incidentNumber} acknowledged.`,
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.acknowledgeIncident = acknowledgeIncident;
/**
 * POST /api/incidents/:id/assign
 */
const assignIncident = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { assignedToId } = req.body;
        const updated = await database_1.prisma.securityIncident.update({
            where: { id },
            data: {
                assignedToId,
                status: "INVESTIGATING",
            },
        });
        res.status(200).json({
            success: true,
            message: `Incident ${updated.incidentNumber} assigned to operator.`,
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.assignIncident = assignIncident;
/**
 * POST /api/incidents/:id/escalate
 */
const escalateIncident = async (req, res, next) => {
    try {
        const { id } = req.params;
        const actorUser = req.user;
        const actionResult = await incidentResponseService_1.incidentResponseService.executeAction({
            incidentId: id,
            actionType: "SEVERITY_ESCALATED",
            actorId: actorUser?.id,
            actorEmail: actorUser?.email,
            actorRole: actorUser?.role,
            reason: "Manual operator escalation to CRITICAL",
        });
        res.status(200).json({
            success: true,
            message: `Incident escalated.`,
            data: actionResult,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.escalateIncident = escalateIncident;
/**
 * POST /api/incidents/:id/resolve
 */
const resolveIncident = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { resolutionNotes } = req.body;
        const actorUser = req.user;
        const actionResult = await incidentResponseService_1.incidentResponseService.executeAction({
            incidentId: id,
            actionType: "RESOLVED",
            actorId: actorUser?.id,
            actorEmail: actorUser?.email,
            actorRole: actorUser?.role,
            reason: resolutionNotes || "Resolved by operator",
        });
        res.status(200).json({
            success: true,
            message: `Incident resolved.`,
            data: actionResult,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resolveIncident = resolveIncident;
/**
 * POST /api/incidents/:id/actions
 * Execute any authorized automated/manual containment response action
 */
const executeResponseAction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { actionType, reason, metadata } = req.body;
        const actorUser = req.user;
        if (!actionType || !Object.values(database_1.IncidentActionType).includes(actionType)) {
            throw new errorHandler_1.AppError("Invalid actionType specified", 400, "INVALID_ACTION_TYPE");
        }
        const actionResult = await incidentResponseService_1.incidentResponseService.executeAction({
            incidentId: id,
            actionType: actionType,
            actorId: actorUser?.id,
            actorEmail: actorUser?.email,
            actorRole: actorUser?.role,
            reason,
            metadata,
        });
        res.status(200).json({
            success: true,
            message: `Response action ${actionType} executed: ${actionResult.details}`,
            data: actionResult,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.executeResponseAction = executeResponseAction;
/**
 * GET /api/incidents/:id/evidence
 */
const getIncidentEvidence = async (req, res, next) => {
    try {
        const { id } = req.params;
        const evidence = await database_1.prisma.incidentEvidence.findMany({
            where: { incidentId: id },
            orderBy: { capturedAt: "desc" },
        });
        res.status(200).json({
            success: true,
            data: evidence,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getIncidentEvidence = getIncidentEvidence;
/**
 * GET /api/incidents/stats
 * Get KPI scoreboard for the command center
 */
const getIncidentScorecard = async (_req, res, next) => {
    try {
        const scorecard = await realtimeThreatEngine_1.realtimeThreatEngine.getScorecard();
        res.status(200).json({
            success: true,
            data: scorecard,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getIncidentScorecard = getIncidentScorecard;
/**
 * GET /api/incidents/live
 * Latest active threat alerts and anomalies
 */
const getLiveThreatAlerts = async (_req, res, next) => {
    try {
        const alerts = await database_1.prisma.threatAlert.findMany({
            take: 20,
            orderBy: { detectedAt: "desc" },
            include: {
                theatre: { select: { id: true, name: true, code: true } },
                show: { select: { id: true, startTime: true, movie: { select: { title: true } } } },
            },
        });
        res.status(200).json({
            success: true,
            data: alerts,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLiveThreatAlerts = getLiveThreatAlerts;
/**
 * GET /api/security/live-stream
 * Server-Sent Events (SSE) Live Security Stream
 */
const handleLiveSecurityStream = (req, res) => {
    const actorUser = req.user;
    const clientId = `sse-${Date.now().toString(36)}-${crypto_1.default.randomBytes(3).toString("hex")}`;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const client = {
        id: clientId,
        res,
        userId: actorUser?.id,
        role: actorUser?.role,
        connectedAt: new Date(),
    };
    realtimeThreatEngine_1.realtimeThreatEngine.registerClient(client);
    req.on("close", () => {
        realtimeThreatEngine_1.realtimeThreatEngine.removeClient(clientId);
    });
};
exports.handleLiveSecurityStream = handleLiveSecurityStream;
