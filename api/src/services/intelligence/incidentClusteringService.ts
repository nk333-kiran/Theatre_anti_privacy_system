import crypto from "crypto";
import { prisma } from "@antipiracy/database";
import { SignalInput, RiskEvaluationResult } from "./types";
import { threatIntelligenceEngine } from "./threatIntelligenceEngine";
import { SecurityAuditService } from "../security/securityAuditService";
import { logger } from "../logging/logger";

export class IncidentClusteringService {
  /**
   * Automatically cluster signals into an existing or new ThreatIntelligenceIncident
   */
  public async clusterSignals(params: {
    title: string;
    description: string;
    signals: SignalInput[];
    theatreId?: string;
    showId?: string;
    activationId?: string;
    playbackSessionId?: string;
  }) {
    const evaluation = threatIntelligenceEngine.evaluateRisk(params.signals);

    // Look for existing active incident in same theatre/show context to cluster
    let existingIncident = null;
    if (params.showId || params.playbackSessionId) {
      existingIncident = await prisma.threatIntelligenceIncident.findFirst({
        where: {
          showId: params.showId || undefined,
          playbackSessionId: params.playbackSessionId || undefined,
          status: { in: ["DETECTED", "INVESTIGATING", "CONFIRMED"] },
        },
      });
    }

    if (existingIncident) {
      // Merge / update existing incident
      const updatedIncident = await prisma.threatIntelligenceIncident.update({
        where: { id: existingIncident.id },
        data: {
          riskScore: Math.max(existingIncident.riskScore, evaluation.riskScore),
          confidenceScore: Math.max(existingIncident.confidenceScore, evaluation.confidenceScore),
          severity: evaluation.severity as any,
          lastDetectedAt: new Date(),
        },
      });

      // Attach new signals
      for (const sig of params.signals) {
        await prisma.threatSignal.create({
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

      logger.info(`[IncidentClustering] Clustered ${params.signals.length} signals into existing incident ${existingIncident.incidentCode}`);
      return updatedIncident;
    }

    // Create new incident
    const incidentCode = `INT-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const incident = await prisma.threatIntelligenceIncident.create({
      data: {
        incidentCode,
        title: params.title,
        description: params.description,
        severity: evaluation.severity as any,
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

    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: evaluation.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      theatreId: params.theatreId,
      showId: params.showId,
      activationId: params.activationId,
      actionSummary: `Created Threat Intelligence Incident ${incidentCode}: ${params.title} (Risk: ${evaluation.riskScore}/100)`,
      isThreat: true,
      threatDetails: evaluation.explanations.join("; "),
    });

    logger.info(`[IncidentClustering] Created new Threat Intelligence Incident ${incidentCode}`);
    return incident;
  }

  /**
   * Merge two incidents
   */
  public async mergeIncidents(sourceId: string, targetId: string, actorId?: string) {
    const [source, target] = await Promise.all([
      prisma.threatIntelligenceIncident.findUnique({ where: { id: sourceId } }),
      prisma.threatIntelligenceIncident.findUnique({ where: { id: targetId } }),
    ]);

    if (!source || !target) throw new Error("Incident not found for merge");

    // Move all signals
    await prisma.threatSignal.updateMany({
      where: { incidentId: sourceId },
      data: { incidentId: targetId },
    });

    // Move all correlations
    await prisma.threatCorrelation.updateMany({
      where: { incidentId: sourceId },
      data: { incidentId: targetId },
    });

    // Mark source as CLOSED (MERGED)
    await prisma.threatIntelligenceIncident.update({
      where: { id: sourceId },
      data: {
        status: "CLOSED",
        resolvedAt: new Date(),
        description: `${source.description} (Merged into ${target.incidentCode})`,
      },
    });

    // Update target scores
    const updatedTarget = await prisma.threatIntelligenceIncident.update({
      where: { id: targetId },
      data: {
        riskScore: Math.max(source.riskScore, target.riskScore),
        confidenceScore: Math.max(source.confidenceScore, target.confidenceScore),
        lastDetectedAt: new Date(),
      },
    });

    logger.info(`[IncidentClustering] Merged incident ${source.incidentCode} into ${target.incidentCode}`);
    return updatedTarget;
  }

  /**
   * Resolve an incident
   */
  public async resolveIncident(id: string, resolutionNotes: string, actorUser?: any) {
    const incident = await prisma.threatIntelligenceIncident.update({
      where: { id },
      data: {
        status: "CLOSED",
        resolvedAt: new Date(),
        description: resolutionNotes,
      },
    });

    await SecurityAuditService.logEvent({
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
  public async reopenIncident(id: string, reason: string, actorUser?: any) {
    const incident = await prisma.threatIntelligenceIncident.update({
      where: { id },
      data: {
        status: "INVESTIGATING",
        resolvedAt: null,
      },
    });

    await SecurityAuditService.logEvent({
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

export const incidentClusteringService = new IncidentClusteringService();
