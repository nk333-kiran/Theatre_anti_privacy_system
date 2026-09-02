import { Request, Response, NextFunction } from "express";
import { prisma } from "@antipiracy/database";
import { realtimeManager } from "../services/realtime/realtimeManager";
import { realtimeEventBus } from "../services/realtime/realtimeEventBus";
import { eventCorrelationEngine } from "../services/realtime/eventCorrelationEngine";
import { riskEscalationEngine } from "../services/realtime/riskEscalationEngine";
import { ApiResponse } from "../types";
import crypto from "crypto";

/**
 * GET /api/realtime/security-stream (SSE Stream)
 */
export const getSecurityStream = (req: Request, res: Response): void => {
  const user = (req as any).user;

  // SSE response headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const clientId = `client_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  realtimeManager.addClient(clientId, res, user);

  req.on("close", () => {
    realtimeManager.removeClient(clientId);
  });
};

/**
 * GET /api/realtime/status
 */
export const getRealtimeStatus = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const connectedClients = realtimeManager.getConnectedClientsCount();
    const overallRisk = riskEscalationEngine.getEntityRisk("OVERALL", "GLOBAL");
    const activeThreatClusters = eventCorrelationEngine.correlateThreats().length;

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
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/realtime/events
 */
export const getRealtimeEvents = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { severity, eventType, theatreId } = req.query;
    const events = await prisma.realtimeThreatEvent.findMany({
      where: {
        severity: severity ? (String(severity) as any) : undefined,
        eventType: eventType ? String(eventType) : undefined,
        theatreId: theatreId ? String(theatreId) : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/realtime/threats
 */
export const getRealtimeThreats = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const clusters = eventCorrelationEngine.correlateThreats();
    res.status(200).json({ success: true, data: clusters });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/realtime/incidents
 */
export const getRealtimeIncidents = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const notifications = await prisma.realtimeIncidentNotification.findMany({
      include: { theatre: true, show: true, movie: true },
      orderBy: { sentAt: "desc" },
      take: 30,
    });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/realtime/risk/:entityType/:entityId
 */
export const getEntityRisk = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    const risk = riskEscalationEngine.getEntityRisk(entityType, entityId);
    res.status(200).json({ success: true, data: risk });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/realtime/analyze
 */
export const analyzeRealtimeEvent = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await realtimeEventBus.publish(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/realtime/actions/:id/approve
 */
export const approveResponseAction = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const actorUser = (req as any).user;
    const approved = await realtimeManager.approveAction(req.params.id, actorUser);
    res.status(200).json({ success: true, data: approved });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/realtime/actions/:id/reject
 */
export const rejectResponseAction = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const actorUser = (req as any).user;
    const { notes } = req.body;
    const rejected = await realtimeManager.rejectAction(req.params.id, actorUser, notes);
    res.status(200).json({ success: true, data: rejected });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/realtime/actions/execute
 */
export const executeCustomAction = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { actionType, targetId, reason } = req.body;
    const actorUser = (req as any).user;

    const action = await prisma.automatedResponse.create({
      data: {
        actionType,
        targetId,
        reason: reason || "Manual execution by administrator",
        status: "APPROVED",
      },
    });

    const executed = await realtimeManager.approveAction(action.id, actorUser);
    res.status(200).json({ success: true, data: executed });
  } catch (error) {
    next(error);
  }
};
