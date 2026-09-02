import { prisma } from "@antipiracy/database";
import { SecurityIncidentStatus } from "@prisma/client";
import { IncidentTimelineService } from "./incidentTimelineService";
import { realtimeEventBus } from "../realtime/realtimeEventBus";

const VALID_TRANSITIONS: Record<string, string[]> = {
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

export class IncidentLifecycleService {
  /**
   * Transition an incident to a new lifecycle state.
   */
  public static async transitionStatus(params: {
    incidentId: string;
    newStatus: SecurityIncidentStatus;
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    notes?: string;
  }) {
    const existing = await prisma.securityIncident.findUnique({
      where: { id: params.incidentId },
    });

    if (!existing) {
      throw new Error(`Incident not found: ${params.incidentId}`);
    }

    const currentStatus = existing.status as string;
    const targetStatus = params.newStatus as string;

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus) && currentStatus !== targetStatus) {
      throw new Error(`Invalid incident status transition from ${currentStatus} to ${targetStatus}`);
    }

    const updateData: any = {
      status: params.newStatus,
    };

    if (
      (params.newStatus === SecurityIncidentStatus.ACKNOWLEDGED ||
        params.newStatus === SecurityIncidentStatus.TRIAGED) &&
      !existing.acknowledgedAt
    ) {
      updateData.acknowledgedAt = new Date();
    }

    if (
      (params.newStatus === SecurityIncidentStatus.RESOLVED ||
        params.newStatus === SecurityIncidentStatus.CLOSED) &&
      !existing.resolvedAt
    ) {
      updateData.resolvedAt = new Date();
      if (params.notes) {
        updateData.resolutionNotes = params.notes;
      }
    }

    const updated = await prisma.securityIncident.update({
      where: { id: existing.id },
      data: updateData,
    });

    // 1. Append Timeline event
    await IncidentTimelineService.appendTimelineEvent({
      incidentId: existing.id,
      eventType: "STATUS_CHANGE",
      description: `Incident status transitioned from ${currentStatus} to ${targetStatus}${
        params.notes ? ` (${params.notes})` : ""
      }`,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      previousStatus: currentStatus,
      newStatus: targetStatus,
    });

    // 2. Real-Time Event Bus Notification
    realtimeEventBus.publish({
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
