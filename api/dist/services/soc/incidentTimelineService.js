"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentTimelineService = void 0;
const database_1 = require("@antipiracy/database");
class IncidentTimelineService {
    /**
     * Append an immutable audit event to the incident timeline.
     */
    static async appendTimelineEvent(params) {
        return database_1.prisma.securityIncidentTimeline.create({
            data: {
                incidentId: params.incidentId,
                eventType: params.eventType,
                description: params.description,
                actorId: params.actorId,
                actorEmail: params.actorEmail,
                actorRole: params.actorRole,
                previousStatus: params.previousStatus,
                newStatus: params.newStatus,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            },
        });
    }
    /**
     * Retrieve chronologically ordered timeline events for an incident.
     */
    static async getIncidentTimeline(incidentId) {
        return database_1.prisma.securityIncidentTimeline.findMany({
            where: { incidentId },
            orderBy: { timestamp: "asc" },
        });
    }
}
exports.IncidentTimelineService = IncidentTimelineService;
