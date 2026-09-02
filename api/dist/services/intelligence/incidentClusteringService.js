"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentClusteringService = exports.IncidentClusteringService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const threatIntelligenceEngine_1 = require("./threatIntelligenceEngine");
const securityAuditService_1 = require("../security/securityAuditService");
const logger_1 = require("../logging/logger");
class IncidentClusteringService {
    /**
     * Automatically cluster signals into an existing or new ThreatIntelligenceIncident
     */
    async clusterSignals(params) {
        const evaluation = threatIntelligenceEngine_1.threatIntelligenceEngine.evaluateRisk(params.signals);
        // Look for existing active incident in same theatre/show context to cluster
        let existingIncident = null;
        if (params.showId || params.playbackSessionId) {
            existingIncident = await database_1.prisma.threatIntelligenceIncident.findFirst({
                where: {
                    showId: params.showId || undefined,
                    playbackSessionId: params.playbackSessionId || undefined,
                    status: { in: ["DETECTED", "INVESTIGATING", "CONFIRMED"] },
                },
            });
        }
        if (existingIncident) {
            // Merge / update existing incident
            const updatedIncident = await database_1.prisma.threatIntelligenceIncident.update({
                where: { id: existingIncident.id },
                data: {
                    riskScore: Math.max(existingIncident.riskScore, evaluation.riskScore),
                    confidenceScore: Math.max(existingIncident.confidenceScore, evaluation.confidenceScore),
                    severity: evaluation.severity,
                    lastDetectedAt: new Date(),
                },
            });
            // Attach new signals
            for (const sig of params.signals) {
                await database_1.prisma.threatSignal.create({
                    data: {
                        incidentId: existingIncident.id,
                        signalType: sig.signalType,
                        signalValue: sig.signalValue,
                        riskWeight: sig.riskWeight,
                        confidence: sig.confidence,
                        metadata: sig.metadata ? JSON.stringify(sig.metadata) : undefined,
                    },
                });
            }
            logger_1.logger.info(`[IncidentClustering] Clustered ${params.signals.length} signals into existing incident ${existingIncident.incidentCode}`);
            return updatedIncident;
        }
        // Create new incident
        const incidentCode = `INT-${Date.now()}-${crypto_1.default.randomBytes(2).toString("hex").toUpperCase()}`;
        const incident = await database_1.prisma.threatIntelligenceIncident.create({
            data: {
                incidentCode,
                title: params.title,
                description: params.description,
                severity: evaluation.severity,
                riskScore: evaluation.riskScore,
                confidenceScore: evaluation.confidenceScore,
                status: "DETECTED",
                theatreId: params.theatreId,
                showId: params.showId,
                activationId: params.activationId,
                playbackSessionId: params.playbackSessionId,
                signals: {
                    create: params.signals.map((sig) => ({
                        signalType: sig.signalType,
                        signalValue: sig.signalValue,
                        riskWeight: sig.riskWeight,
                        confidence: sig.confidence,
                        metadata: sig.metadata ? JSON.stringify(sig.metadata) : undefined,
                    })),
                },
            },
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: evaluation.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
            theatreId: params.theatreId,
            showId: params.showId,
            activationId: params.activationId,
            actionSummary: `Created Threat Intelligence Incident ${incidentCode}: ${params.title} (Risk: ${evaluation.riskScore}/100)`,
            isThreat: true,
            threatDetails: evaluation.explanations.join("; "),
        });
        logger_1.logger.info(`[IncidentClustering] Created new Threat Intelligence Incident ${incidentCode}`);
        return incident;
    }
    /**
     * Merge two incidents
     */
    async mergeIncidents(sourceId, targetId, actorId) {
        const [source, target] = await Promise.all([
            database_1.prisma.threatIntelligenceIncident.findUnique({ where: { id: sourceId } }),
            database_1.prisma.threatIntelligenceIncident.findUnique({ where: { id: targetId } }),
        ]);
        if (!source || !target)
            throw new Error("Incident not found for merge");
        // Move all signals
        await database_1.prisma.threatSignal.updateMany({
            where: { incidentId: sourceId },
            data: { incidentId: targetId },
        });
        // Move all correlations
        await database_1.prisma.threatCorrelation.updateMany({
            where: { incidentId: sourceId },
            data: { incidentId: targetId },
        });
        // Mark source as CLOSED (MERGED)
        await database_1.prisma.threatIntelligenceIncident.update({
            where: { id: sourceId },
            data: {
                status: "CLOSED",
                resolvedAt: new Date(),
                description: `${source.description} (Merged into ${target.incidentCode})`,
            },
        });
        // Update target scores
        const updatedTarget = await database_1.prisma.threatIntelligenceIncident.update({
            where: { id: targetId },
            data: {
                riskScore: Math.max(source.riskScore, target.riskScore),
                confidenceScore: Math.max(source.confidenceScore, target.confidenceScore),
                lastDetectedAt: new Date(),
            },
        });
        logger_1.logger.info(`[IncidentClustering] Merged incident ${source.incidentCode} into ${target.incidentCode}`);
        return updatedTarget;
    }
    /**
     * Resolve an incident
     */
    async resolveIncident(id, resolutionNotes, actorUser) {
        const incident = await database_1.prisma.threatIntelligenceIncident.update({
            where: { id },
            data: {
                status: "CLOSED",
                resolvedAt: new Date(),
                description: resolutionNotes,
            },
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: "INFO",
            userId: actorUser?.id,
            actorEmail: actorUser?.email,
            actorRole: actorUser?.role,
            theatreId: incident.theatreId || undefined,
            showId: incident.showId || undefined,
            actionSummary: `Resolved Threat Intelligence Incident ${incident.incidentCode}: ${resolutionNotes}`,
        });
        return incident;
    }
    /**
     * Reopen an incident
     */
    async reopenIncident(id, reason, actorUser) {
        const incident = await database_1.prisma.threatIntelligenceIncident.update({
            where: { id },
            data: {
                status: "INVESTIGATING",
                resolvedAt: null,
            },
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: "MEDIUM",
            userId: actorUser?.id,
            actorEmail: actorUser?.email,
            actorRole: actorUser?.role,
            theatreId: incident.theatreId || undefined,
            showId: incident.showId || undefined,
            actionSummary: `Reopened Threat Intelligence Incident ${incident.incidentCode}: ${reason}`,
        });
        return incident;
    }
}
exports.IncidentClusteringService = IncidentClusteringService;
exports.incidentClusteringService = new IncidentClusteringService();
