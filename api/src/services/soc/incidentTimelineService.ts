import { prisma } from "@antipiracy/database";

export interface AppendTimelineParams {
  incidentId: string;
  eventType: string; // "STATUS_CHANGE", "ESCALATION", "ANALYST_ASSIGNED", "CONTAINMENT", "NOTE_ADDED", "IOC_LINKED"
  description: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, any>;
}

export class IncidentTimelineService {
  /**
   * Append an immutable audit event to the incident timeline.
   */
  public static async appendTimelineEvent(params: AppendTimelineParams) {
    return prisma.securityIncidentTimeline.create({
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
  public static async getIncidentTimeline(incidentId: string) {
    return prisma.securityIncidentTimeline.findMany({
      where: { incidentId },
      orderBy: { timestamp: "asc" },
    });
  }
}
