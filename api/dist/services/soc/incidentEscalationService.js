"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentEscalationService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const incidentTimelineService_1 = require("./incidentTimelineService");
const realtimeEventBus_1 = require("../realtime/realtimeEventBus");
const crypto_1 = __importDefault(require("crypto"));
class IncidentEscalationService {
    /**
     * Determine target severity from risk and telemetry signals.
     */
    static calculateTargetSeverity(criteria) {
        if ((criteria.riskScore && criteria.riskScore >= 80) ||
            criteria.isEvidenceTampered ||
            (criteria.affectedTheatresCount && criteria.affectedTheatresCount >= 2) ||
            (criteria.repeatIocCount && criteria.repeatIocCount >= 5)) {
            return client_1.IncidentSeverity.CRITICAL;
        }
        if ((criteria.riskScore && criteria.riskScore >= 60) ||
            (criteria.repeatIocCount && criteria.repeatIocCount >= 2)) {
            return client_1.IncidentSeverity.HIGH;
        }
        return client_1.IncidentSeverity.MEDIUM;
    }
    /**
     * Evaluate and escalate an existing security incident.
     */
    static async escalateIncident(incidentId, criteria) {
        const existing = await database_1.prisma.securityIncident.findUnique({
            where: { id: incidentId },
        });
        if (!existing) {
            throw new Error(`Security incident not found: ${incidentId}`);
        }
        const targetSeverity = this.calculateTargetSeverity(criteria);
        const targetRisk = criteria.riskScore !== undefined ? criteria.riskScore : Math.max(existing.riskScore, 85);
        const correlationId = `ESC-${Date.now()}-${crypto_1.default.randomBytes(3).toString("hex")}`;
        // Update incident severity and risk score
        const updated = await database_1.prisma.securityIncident.update({
            where: { id: existing.id },
            data: {
                severity: targetSeverity,
                riskScore: targetRisk,
            },
        });
        // Record escalation history
        const escalation = await database_1.prisma.securityEscalation.create({
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
        await incidentTimelineService_1.IncidentTimelineService.appendTimelineEvent({
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
        realtimeEventBus_1.realtimeEventBus.publish({
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
exports.IncidentEscalationService = IncidentEscalationService;
