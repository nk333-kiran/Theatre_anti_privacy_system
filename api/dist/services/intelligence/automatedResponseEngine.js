"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automatedResponseEngine = exports.AutomatedResponseEngine = void 0;
const database_1 = require("@antipiracy/database");
const securityAuditService_1 = require("../security/securityAuditService");
const logger_1 = require("../logging/logger");
class AutomatedResponseEngine {
    /**
     * Execute a controlled containment response
     */
    async executeAction(params) {
        const incident = await database_1.prisma.threatIntelligenceIncident.findUnique({
            where: { id: params.incidentId },
        });
        if (!incident) {
            throw new Error(`Incident not found: ${params.incidentId}`);
        }
        // Approval requirement evaluation
        if (incident.severity === "HIGH" && !params.isApprovedBySoc) {
            // Record recommended action requiring SOC approval
            const action = await database_1.prisma.automatedResponseAction.create({
                data: {
                    incidentId: params.incidentId,
                    actionType: params.actionType,
                    status: "PENDING_SOC_APPROVAL",
                    reason: `High severity action requires explicit SOC review: ${params.reason}`,
                },
            });
            logger_1.logger.warn(`[AutomatedResponse] Action ${params.actionType} on incident ${incident.incidentCode} requires SOC approval`);
            return {
                executed: false,
                requiresApproval: true,
                actionId: action.id,
                message: "Action queued pending SOC confirmation.",
            };
        }
        let executionResult = "";
        switch (params.actionType) {
            case "REVOKE_PLAYBACK_SESSION":
                if (incident.playbackSessionId) {
                    await database_1.prisma.playbackSession.update({
                        where: { id: incident.playbackSessionId },
                        data: {
                            status: "TERMINATED",
                            terminatedAt: new Date(),
                            terminationReason: `Automated Threat Containment: ${params.reason}`,
                        },
                    });
                    executionResult = `Revoked Playback Session ${incident.playbackSessionId}`;
                }
                break;
            case "REVOKE_ACTIVATION":
                if (incident.activationId) {
                    await database_1.prisma.activation.update({
                        where: { id: incident.activationId },
                        data: {
                            status: "EXPIRED",
                        },
                    });
                    executionResult = `Revoked Ticket Activation ${incident.activationId}`;
                }
                break;
            case "REVOKE_DRM_LICENSE":
                if (incident.playbackSessionId) {
                    await database_1.prisma.drmLicense.updateMany({
                        where: { playbackSessionId: incident.playbackSessionId },
                        data: {
                            status: "REVOKED",
                            revocationReason: `Automated Response: ${params.reason}`,
                            revokedAt: new Date(),
                        },
                    });
                    executionResult = `Revoked DRM licenses for session ${incident.playbackSessionId}`;
                }
                break;
            case "FLAG_SESSION":
            case "RATE_LIMIT_SOURCE":
            case "ESCALATE_INCIDENT":
            case "REQUIRE_MANUAL_REVIEW":
            default:
                executionResult = `Applied policy: ${params.actionType} (${params.reason})`;
                break;
        }
        // Record completed response action
        const actionRecord = await database_1.prisma.automatedResponseAction.create({
            data: {
                incidentId: params.incidentId,
                actionType: params.actionType,
                status: "EXECUTED",
                reason: params.reason,
                executedBy: params.actorUser?.id || "SYSTEM_AUTOMATION",
                executedAt: new Date(),
                metadata: JSON.stringify({ result: executionResult }),
            },
        });
        // Update incident status
        await database_1.prisma.threatIntelligenceIncident.update({
            where: { id: params.incidentId },
            data: { status: "CONFIRMED" },
        });
        // Audit logging
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: incident.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
            userId: params.actorUser?.id,
            actorEmail: params.actorUser?.email,
            actorRole: params.actorUser?.role,
            theatreId: incident.theatreId || undefined,
            showId: incident.showId || undefined,
            activationId: incident.activationId || undefined,
            actionSummary: `Automated Containment: Executed ${params.actionType} on incident ${incident.incidentCode} (${executionResult})`,
            isThreat: true,
            threatDetails: params.reason,
        });
        logger_1.logger.info(`[AutomatedResponse] Executed ${params.actionType} on ${incident.incidentCode}: ${executionResult}`);
        return {
            executed: true,
            requiresApproval: false,
            actionId: actionRecord.id,
            result: executionResult,
        };
    }
}
exports.AutomatedResponseEngine = AutomatedResponseEngine;
exports.automatedResponseEngine = new AutomatedResponseEngine();
