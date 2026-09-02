import { prisma } from "@antipiracy/database";
import { IncidentSeverity } from "@prisma/client";
import { IncidentTimelineService } from "./incidentTimelineService";
import { realtimeEventBus } from "../realtime/realtimeEventBus";
import crypto from "crypto";

export interface EscalationCriteria {
  riskScore?: number;
  isEvidenceTampered?: boolean;
  repeatIocCount?: number;
  affectedTheatresCount?: number;
  reason: string;
  triggeredBy?: string; // "AUTOMATED_POLICY", "ANALYST_ACTION", "IOC_CORRELATION", "EVIDENCE_TAMPERING"
  policyId?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
}

export class IncidentEscalationService {
  /**
   * Determine target severity from risk and telemetry signals.
   */
  public static calculateTargetSeverity(criteria: EscalationCriteria): IncidentSeverity {
    if (
      (criteria.riskScore && criteria.riskScore >= 80) ||
      criteria.isEvidenceTampered ||
      (criteria.affectedTheatresCount && criteria.affectedTheatresCount >= 2) ||
      (criteria.repeatIocCount && criteria.repeatIocCount >= 5)
    ) {
      return IncidentSeverity.CRITICAL;
    }

    if (
      (criteria.riskScore && criteria.riskScore >= 60) ||
      (criteria.repeatIocCount && criteria.repeatIocCount >= 2)
    ) {
      return IncidentSeverity.HIGH;
    }

    return IncidentSeverity.MEDIUM;
  }

  /**
   * Evaluate and escalate an existing security incident.
   */
  public static async escalateIncident(incidentId: string, criteria: EscalationCriteria) {
    const existing = await prisma.securityIncident.findUnique({
      where: { id: incidentId },
    });

    if (!existing) {
      throw new Error(`Security incident not found: ${incidentId}`);
    }

    const targetSeverity = this.calculateTargetSeverity(criteria);
    const targetRisk = criteria.riskScore !== undefined ? criteria.riskScore : Math.max(existing.riskScore, 85);
    const correlationId = `ESC-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    // Update incident severity and risk score
    const updated = await prisma.securityIncident.update({
      where: { id: existing.id },
      data: {
        severity: targetSeverity,
        riskScore: targetRisk,
      },
    });

    // Record escalation history
    const escalation = await prisma.securityEscalation.create({
      data: {
        incidentId: existing.id,
        fromSeverity: existing.severity,
        toSeverity: targetSeverity,
        fromRisk: existing.riskScore,
        toRisk: targetRisk,
        reason: criteria.reason,
        triggeredBy: criteria.triggeredBy || "AUTOMATED_POLICY",
        policyId: criteria.policyId,
        correlationId,
      },
    });

    // Append to timeline
    await IncidentTimelineService.appendTimelineEvent({
      incidentId: existing.id,
      eventType: "ESCALATION",
      description: `Incident escalated from ${existing.severity} (${existing.riskScore}/100) to ${targetSeverity} (${targetRisk}/100): ${criteria.reason}`,
      actorId: criteria.actorId,
      actorEmail: criteria.actorEmail,
      actorRole: criteria.actorRole,
      metadata: {
        escalationId: escalation.id,
        correlationId,
        fromSeverity: existing.severity,
        toSeverity: targetSeverity,
      },
    });

    // Real-Time Event Bus
    realtimeEventBus.publish({
      eventType: "INCIDENT_ESCALATED",
      source: "INCIDENT_ESCALATION_SERVICE",
      severity: targetSeverity === "CRITICAL" ? "CRITICAL" : "HIGH",
      theatreId: existing.theatreId ?? undefined,
      movieId: existing.movieId ?? undefined,
      metadata: {
        incidentId: existing.id,
        incidentNumber: existing.incidentNumber,
        fromSeverity: existing.severity,
        toSeverity: targetSeverity,
        reason: criteria.reason,
        correlationId,
      },
    });

    return { incident: updated, escalation };
  }
}
