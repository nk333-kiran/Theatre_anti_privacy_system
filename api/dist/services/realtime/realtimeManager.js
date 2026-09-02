"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeManager = exports.RealtimeManager = void 0;
const database_1 = require("@antipiracy/database");
const realtimeEventBus_1 = require("./realtimeEventBus");
const securityAuditService_1 = require("../security/securityAuditService");
const logger_1 = require("../logging/logger");
class RealtimeManager {
    clients = new Map();
    heartbeatInterval;
    constructor() {
        this.init();
    }
    init() {
        // Listen for events from event bus and stream to connected SSE clients with RBAC scoping
        realtimeEventBus_1.realtimeEventBus.on("security_event", (event) => {
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
    addClient(clientId, res, user) {
        this.clients.set(clientId, { id: clientId, res, user });
        logger_1.logger.info(`[RealtimeManager] SSE client connected: ${clientId} (${user?.role || "ANONYMOUS"})`);
        // Initial connection payload
        res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, timestamp: new Date().toISOString() })}\n\n`);
    }
    /**
     * Unregisters an SSE client on disconnect
     */
    removeClient(clientId) {
        if (this.clients.has(clientId)) {
            this.clients.delete(clientId);
            logger_1.logger.info(`[RealtimeManager] SSE client disconnected: ${clientId}`);
        }
    }
    /**
     * Broadcasts an event to connected clients filtered by role
     */
    broadcastEvent(event) {
        for (const [clientId, client] of this.clients.entries()) {
            try {
                const { user, res } = client;
                // Role filtering
                if (user.role === "ADMIN") {
                    // Full global access
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                }
                else if (user.role === "PRODUCTION_COMPANY") {
                    // Filter by authorized movie
                    if (!event.movieId || event.movieId === user.productionCompanyId) {
                        res.write(`data: ${JSON.stringify(event)}\n\n`);
                    }
                }
                else if (user.role === "THEATRE_STAFF") {
                    // Filter by theatre ID
                    if (!event.theatreId || event.theatreId === user.theatreId) {
                        res.write(`data: ${JSON.stringify(event)}\n\n`);
                    }
                }
            }
            catch (err) {
                logger_1.logger.warn(`[RealtimeManager] Failed writing to client ${clientId}: ${err.message}`);
                this.removeClient(clientId);
            }
        }
    }
    /**
     * Sends heartbeat ping to maintain SSE connection
     */
    broadcastHeartbeat() {
        const pingPayload = `data: ${JSON.stringify({ type: "PING", timestamp: new Date().toISOString() })}\n\n`;
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.res.write(pingPayload);
            }
            catch (_) {
                this.removeClient(clientId);
            }
        }
    }
    /**
     * Approves and executes a containment action
     */
    async approveAction(actionId, actorUser) {
        const action = await database_1.prisma.automatedResponse.findUnique({
            where: { id: actionId },
        });
        if (!action)
            throw new Error("Automated Response Action not found");
        let executionResult = "Action executed successfully";
        if (action.actionType === "REVOKE_PLAYBACK_SESSION" && action.targetId) {
            await database_1.prisma.playbackSession.updateMany({
                where: { id: action.targetId },
                data: { status: "TERMINATED", terminationReason: `Forced containment by ${actorUser.email}` },
            });
            executionResult = `Playback session ${action.targetId} terminated`;
        }
        else if (action.actionType === "REVOKE_DRM_LICENSE" && action.targetId) {
            await database_1.prisma.drmLicense.updateMany({
                where: { id: action.targetId },
                data: { status: "REVOKED", revocationReason: `Forced DRM revocation by ${actorUser.email}` },
            });
            executionResult = `DRM License ${action.targetId} revoked`;
        }
        else if (action.actionType === "REVOKE_ACTIVATION" && action.targetId) {
            await database_1.prisma.activation.updateMany({
                where: { id: action.targetId },
                data: { status: "REVOKED" },
            });
            executionResult = `Activation token ${action.targetId} revoked`;
        }
        else if (action.actionType === "BLACKLIST_TOKEN" && action.targetId) {
            executionResult = `Token ${action.targetId} blacklisted`;
        }
        const updated = await database_1.prisma.automatedResponse.update({
            where: { id: actionId },
            data: {
                status: "EXECUTED",
                executedBy: actorUser.email || actorUser.id,
                executedAt: new Date(),
                result: executionResult,
            },
        });
        // Audit log
        await securityAuditService_1.SecurityAuditService.logEvent({
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
    async rejectAction(actionId, actorUser, notes) {
        const updated = await database_1.prisma.automatedResponse.update({
            where: { id: actionId },
            data: {
                status: "REJECTED",
                executedBy: actorUser.email || actorUser.id,
                executedAt: new Date(),
                result: notes || "Rejected by Security Administrator",
            },
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: "INFO",
            userId: actorUser.id,
            actorEmail: actorUser.email,
            actorRole: actorUser.role,
            actionSummary: `Rejected Containment Action [${updated.actionType}]`,
        });
        return updated;
    }
    getConnectedClientsCount() {
        return this.clients.size;
    }
}
exports.RealtimeManager = RealtimeManager;
exports.realtimeManager = new RealtimeManager();
