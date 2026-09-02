import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  prisma,
  IncidentSeverity,
  SecurityIncidentStatus,
  IncidentSource,
  IncidentActionType,
  IncidentEvidenceType,
} from "@antipiracy/database";
import { realtimeThreatEngine, LiveStreamClient } from "../services/security/realtimeThreatEngine";
import { incidentResponseService } from "../services/security/incidentResponseService";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { ApiResponse } from "../types";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../services/logging/logger";

/**
 * GET /api/incidents
 * List security incidents with filters
 */
export const listSecurityIncidents = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, severity, theatreId, limit, offset } = req.query;

    const where: any = {};
    if (status && Object.values(SecurityIncidentStatus).includes(status as SecurityIncidentStatus)) {
      where.status = status as SecurityIncidentStatus;
    }
    if (severity && Object.values(IncidentSeverity).includes(severity as IncidentSeverity)) {
      where.severity = severity as IncidentSeverity;
    }
    if (theatreId) {
      where.theatreId = String(theatreId);
    }

    const take = limit ? Math.min(parseInt(String(limit), 10), 100) : 50;
    const skip = offset ? parseInt(String(offset), 10) : 0;

    const [incidents, totalCount] = await Promise.all([
      prisma.securityIncident.findMany({
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
      prisma.securityIncident.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: { incidents, totalCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents/:id
 * Retrieve incident details, evidence, actions, and full correlation graph
 */
export const getSecurityIncidentDetails = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const incident = await prisma.securityIncident.findFirst({
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
      throw new AppError(`SecurityIncident ${id} not found`, 404, "NOT_FOUND");
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
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents
 * Create a new Security Incident
 */
export const createSecurityIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title,
      description,
      severity,
      source,
      theatreId,
      showId,
      movieId,
      activationId,
      playbackSessionId,
      riskScore,
    } = req.body;

    const actorUser = (req as any).user;
    const incidentNumber = `SEC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const incident = await prisma.securityIncident.create({
      data: {
        incidentNumber,
        title: title || "Automated Threat Alert Triggered",
        description,
        severity: (severity as IncidentSeverity) || "MEDIUM",
        status: "NEW",
        source: (source as IncidentSource) || "THREAT_ENGINE",
        theatreId,
        showId,
        movieId,
        activationId,
        playbackSessionId,
        riskScore: riskScore ? Number(riskScore) : 50,
        assignedToId: actorUser?.id,
      },
    });

    await SecurityAuditService.logEvent({
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

    realtimeThreatEngine.broadcast("incident_created", {
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
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/acknowledge
 */
export const acknowledgeIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const actorUser = (req as any).user;

    const updated = await prisma.securityIncident.update({
      where: { id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        assignedToId: actorUser?.id || undefined,
      },
    });

    realtimeThreatEngine.broadcast("incident_updated", {
      incidentId: updated.id,
      status: updated.status,
      acknowledgedAt: updated.acknowledgedAt?.toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Incident ${updated.incidentNumber} acknowledged.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/assign
 */
export const assignIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const updated = await prisma.securityIncident.update({
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
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/escalate
 */
export const escalateIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const actorUser = (req as any).user;

    const actionResult = await incidentResponseService.executeAction({
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
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/resolve
 */
export const resolveIncident = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const actorUser = (req as any).user;

    const actionResult = await incidentResponseService.executeAction({
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
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/actions
 * Execute any authorized automated/manual containment response action
 */
export const executeResponseAction = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { actionType, reason, metadata } = req.body;
    const actorUser = (req as any).user;

    if (!actionType || !Object.values(IncidentActionType).includes(actionType)) {
      throw new AppError("Invalid actionType specified", 400, "INVALID_ACTION_TYPE");
    }

    const actionResult = await incidentResponseService.executeAction({
      incidentId: id,
      actionType: actionType as IncidentActionType,
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
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents/:id/evidence
 */
export const getIncidentEvidence = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const evidence = await prisma.incidentEvidence.findMany({
      where: { incidentId: id },
      orderBy: { capturedAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: evidence,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents/stats
 * Get KPI scoreboard for the command center
 */
export const getIncidentScorecard = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const scorecard = await realtimeThreatEngine.getScorecard();
    res.status(200).json({
      success: true,
      data: scorecard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents/live
 * Latest active threat alerts and anomalies
 */
export const getLiveThreatAlerts = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const alerts = await prisma.threatAlert.findMany({
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
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/security/live-stream
 * Server-Sent Events (SSE) Live Security Stream
 */
export const handleLiveSecurityStream = (req: Request, res: Response): void => {
  const actorUser = (req as any).user;
  const clientId = `sse-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const client: LiveStreamClient = {
    id: clientId,
    res,
    userId: actorUser?.id,
    role: actorUser?.role,
    connectedAt: new Date(),
  };

  realtimeThreatEngine.registerClient(client);

  req.on("close", () => {
    realtimeThreatEngine.removeClient(clientId);
  });
};
