"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentLifecycleService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const incidentTimelineService_1 = require("./incidentTimelineService");
const realtimeEventBus_1 = require("../realtime/realtimeEventBus");
const VALID_TRANSITIONS = {
    NEW: ["DETECTED", "TRIAGED", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED", "RESOLVED", "CLOSED"],
    OPEN: ["DETECTED", "TRIAGED", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED", "RESOLVED", "CLOSED"],
    DETECTED: ["TRIAGED", "INVESTIGATING", "ACKNOWLEDGED", "RESOLVED", "CLOSED"],
    TRIAGED: ["INVESTIGATING", "CONTAINMENT_PENDING", "CONTAINED", "RESOLVED", "CLOSED"],
    ACKNOWLEDGED: ["INVESTIGATING", "TRIAGED", "CONTAINMENT_PENDING", "RESOLVED", "CLOSED"],
    INVESTIGATING: ["CONTAINMENT_PENDING", "CONTAINED", "MONITORING", "RESOLVED", "CLOSED"],
    CONTAINMENT_PENDING: ["CONTAINED", "INVESTIGATING", "MONITORING", "RESOLVED", "CLOSED"],
    CONTAINED: ["MONITORING", "RESOLVED", "CLOSED", "INVESTIGATING"],
    MONITORING: ["RESOLVED", "CLOSED", "INVESTIGATING"],
    ESCALATED: ["INVESTIGATING", "CONTAINMENT_PENDING", "CONTAINED", "RESOLVED", "CLOSED"],
    RESOLVED: ["CLOSED", "INVESTIGATING", "MONITORING"],
    CLOSED: ["INVESTIGATING"], // Can be reopened if new telemetry emerges
};
class IncidentLifecycleService {
    /**
     * Transition an incident to a new lifecycle state.
     */
    static async transitionStatus(params) {
        const existing = await database_1.prisma.securityIncident.findUnique({
            where: { id: params.incidentId },
        });
        if (!existing) {
            throw new Error(`Incident not found: ${params.incidentId}`);
        }
        const currentStatus = existing.status;
        const targetStatus = params.newStatus;
        const allowed = VALID_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(targetStatus) && currentStatus !== targetStatus) {
            throw new Error(`Invalid incident status transition from ${currentStatus} to ${targetStatus}`);
        }
        const updateData = {
            status: params.newStatus,
        };
        if ((params.newStatus === client_1.SecurityIncidentStatus.ACKNOWLEDGED ||
            params.newStatus === client_1.SecurityIncidentStatus.TRIAGED) &&
            !existing.acknowledgedAt) {
            updateData.acknowledgedAt = new Date();
        }
        if ((params.newStatus === client_1.SecurityIncidentStatus.RESOLVED ||
            params.newStatus === client_1.SecurityIncidentStatus.CLOSED) &&
            !existing.resolvedAt) {
            updateData.resolvedAt = new Date();
            if (params.notes) {
                updateData.resolutionNotes = params.notes;
            }
        }
        const updated = await database_1.prisma.securityIncident.update({
            where: { id: existing.id },
            data: updateData,
        });
        // 1. Append Timeline event
        await incidentTimelineService_1.IncidentTimelineService.appendTimelineEvent({
            incidentId: existing.id,
            eventType: "STATUS_CHANGE",
            description: `Incident status transitioned from ${currentStatus} to ${targetStatus}${params.notes ? ` (${params.notes})` : ""}`,
            actorId: params.actorId,
            actorEmail: params.actorEmail,
            actorRole: params.actorRole,
            previousStatus: currentStatus,
            newStatus: targetStatus,
        });
        // 2. Real-Time Event Bus Notification
        realtimeEventBus_1.realtimeEventBus.publish({
            eventType: "INCIDENT_CREATED", // Broadcast incident lifecycle change
            source: "INCIDENT_LIFECYCLE_SERVICE",
            severity: existing.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
            theatreId: existing.theatreId ?? undefined,
            movieId: existing.movieId ?? undefined,
            metadata: {
                incidentId: existing.id,
                incidentNumber: existing.incidentNumber,
                previousStatus: currentStatus,
                newStatus: targetStatus,
                actor: params.actorEmail || params.actorId,
            },
        });
        return updated;
    }
}
exports.IncidentLifecycleService = IncidentLifecycleService;
