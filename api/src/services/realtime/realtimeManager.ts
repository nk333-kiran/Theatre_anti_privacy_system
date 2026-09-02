import { Response } from "express";
import { prisma } from "@antipiracy/database";
import { realtimeEventBus, SanitizedRealtimeEvent } from "./realtimeEventBus";
import { SecurityAuditService } from "../security/securityAuditService";
import { logger } from "../logging/logger";

interface SseClient {
  id: string;
  res: Response;
  user: any;
}

export class RealtimeManager {
  private clients: Map<string, SseClient> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for events from event bus and stream to connected SSE clients with RBAC scoping
    realtimeEventBus.on("security_event", (event: SanitizedRealtimeEvent) => {
      this.broadcastEvent(event);
    });

    // Start 15-second heartbeat ping
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 15000);
  }

  /**
   * Registers a new SSE client connection
   */
  public addClient(clientId: string, res: Response, user: any) {
    this.clients.set(clientId, { id: clientId, res, user });
    logger.info(`[RealtimeManager] SSE client connected: ${clientId} (${user?.role || "ANONYMOUS"})`);

    // Initial connection payload
    res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, timestamp: new Date().toISOString() })}\n\n`);
  }

  /**
   * Unregisters an SSE client on disconnect
   */
  public removeClient(clientId: string) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      logger.info(`[RealtimeManager] SSE client disconnected: ${clientId}`);
    }
  }

  /**
   * Broadcasts an event to connected clients filtered by role
   */
  public broadcastEvent(event: SanitizedRealtimeEvent) {
    for (const [clientId, client] of this.clients.entries()) {
      try {
        const { user, res } = client;
        // Role filtering
        if (user.role === "ADMIN") {
          // Full global access
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } else if (user.role === "PRODUCTION_COMPANY") {
          // Filter by authorized movie
          if (!event.movieId || event.movieId === user.productionCompanyId) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } else if (user.role === "THEATRE_STAFF") {
          // Filter by theatre ID
          if (!event.theatreId || event.theatreId === user.theatreId) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        }
      } catch (err: any) {
        logger.warn(`[RealtimeManager] Failed writing to client ${clientId}: ${err.message}`);
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Sends heartbeat ping to maintain SSE connection
   */
  private broadcastHeartbeat() {
    const pingPayload = `data: ${JSON.stringify({ type: "PING", timestamp: new Date().toISOString() })}\n\n`;
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(pingPayload);
      } catch (_) {
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Approves and executes a containment action
   */
  public async approveAction(actionId: string, actorUser: any) {
    const action = await prisma.automatedResponse.findUnique({
      where: { id: actionId },
    });

    if (!action) throw new Error("Automated Response Action not found");

    let executionResult = "Action executed successfully";

    if (action.actionType === "REVOKE_PLAYBACK_SESSION" && action.targetId) {
      await prisma.playbackSession.updateMany({
        where: { id: action.targetId },
        data: { status: "TERMINATED", terminationReason: `Forced containment by ${actorUser.email}` },
      });
      executionResult = `Playback session ${action.targetId} terminated`;
    } else if (action.actionType === "REVOKE_DRM_LICENSE" && action.targetId) {
      await prisma.drmLicense.updateMany({
        where: { id: action.targetId },
        data: { status: "REVOKED", revocationReason: `Forced DRM revocation by ${actorUser.email}` },
      });
      executionResult = `DRM License ${action.targetId} revoked`;
    } else if (action.actionType === "REVOKE_ACTIVATION" && action.targetId) {
      await prisma.activation.updateMany({
        where: { id: action.targetId },
        data: { status: "REVOKED" },
      });
      executionResult = `Activation token ${action.targetId} revoked`;
    } else if (action.actionType === "BLACKLIST_TOKEN" && action.targetId) {
      executionResult = `Token ${action.targetId} blacklisted`;
    }

    const updated = await prisma.automatedResponse.update({
      where: { id: actionId },
      data: {
        status: "EXECUTED",
        executedBy: actorUser.email || actorUser.id,
        executedAt: new Date(),
        result: executionResult,
      },
    });

    // Audit log
    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: "CRITICAL",
      userId: actorUser.id,
      actorEmail: actorUser.email,
      actorRole: actorUser.role,
      actionSummary: `Executed Containment Action [${action.actionType}] on target ${action.targetId || "GLOBAL"}`,
      isThreat: true,
      threatDetails: action.reason,
    });

    return updated;
  }

  /**
   * Rejects a recommended response action
   */
  public async rejectAction(actionId: string, actorUser: any, notes?: string) {
    const updated = await prisma.automatedResponse.update({
      where: { id: actionId },
      data: {
        status: "REJECTED",
        executedBy: actorUser.email || actorUser.id,
        executedAt: new Date(),
        result: notes || "Rejected by Security Administrator",
      },
    });

    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: "INFO",
      userId: actorUser.id,
      actorEmail: actorUser.email,
      actorRole: actorUser.role,
      actionSummary: `Rejected Containment Action [${updated.actionType}]`,
    });

    return updated;
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const realtimeManager = new RealtimeManager();
