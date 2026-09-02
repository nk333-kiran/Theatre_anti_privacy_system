import crypto from "crypto";
import {
  prisma,
  IncidentActionType,
  IncidentSeverity,
  SecurityIncidentStatus,
  IncidentEvidenceType,
} from "@antipiracy/database";
import { realtimeThreatEngine } from "./realtimeThreatEngine";
import { SecurityAuditService } from "./securityAuditService";
import { TokenService } from "./tokenService";
import { logger } from "../logging/logger";

export interface ExecutionResult {
  actionId: string;
  actionType: IncidentActionType;
  result: "SUCCESS" | "FAILED" | "SKIPPED_ALREADY_APPLIED";
  details: string;
  metadata?: any;
}

class IncidentResponseService {
  /**
   * Execute an automated or manual security response action on an incident
   */
  public async executeAction(params: {
    incidentId: string;
    actionType: IncidentActionType;
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    reason?: string;
    metadata?: any;
  }): Promise<ExecutionResult> {
    const incident = await prisma.securityIncident.findUnique({
      where: { id: params.incidentId },
      include: {
        playbackSession: true,
        activation: { include: { ticket: true } },
        theatre: true,
        show: true,
      },
    });

    if (!incident) {
      throw new Error(`SecurityIncident ${params.incidentId} not found`);
    }

    let resultStatus: "SUCCESS" | "FAILED" | "SKIPPED_ALREADY_APPLIED" = "SUCCESS";
    let details = "";

    try {
      switch (params.actionType) {
        case "SESSION_REVOKED": {
          if (!incident.playbackSessionId) {
            resultStatus = "SKIPPED_ALREADY_APPLIED";
            details = "No playback session linked to incident.";
            break;
          }
          await prisma.playbackSession.update({
            where: { id: incident.playbackSessionId },
            data: {
              status: "TERMINATED",
              terminationReason: params.reason || `Automated Incident Response: ${incident.incidentNumber}`,
              terminatedAt: new Date(),
            },
          });
          details = `Playback session ${incident.playbackSessionId.slice(0, 10)}... terminated immediately.`;
          break;
        }

        case "ACTIVATION_REVOKED": {
          if (!incident.activationId) {
            resultStatus = "SKIPPED_ALREADY_APPLIED";
            details = "No QR activation linked to incident.";
            break;
          }
          await prisma.activation.update({
            where: { id: incident.activationId },
            data: { status: "REVOKED" },
          });
          if (incident.activation?.ticketId) {
            await prisma.ticket.update({
              where: { id: incident.activation.ticketId },
              data: { status: "CANCELLED" },
            });
          }
          details = `Mobile QR activation and ticket revoked.`;
          break;
        }

        case "DRM_REVOKED": {
          if (!incident.playbackSessionId && !incident.activationId) {
            resultStatus = "SKIPPED_ALREADY_APPLIED";
            details = "No session or activation linked for DRM revocation.";
            break;
          }
          const updated = await prisma.drmLicense.updateMany({
            where: {
              OR: [
                { playbackSessionId: incident.playbackSessionId || undefined },
                { activationId: incident.activationId || undefined },
              ],
            },
            data: {
              status: "REVOKED",
              revocationReason: params.reason || `Automated Incident Response: ${incident.incidentNumber}`,
              revokedAt: new Date(),
            },
          });
          details = `${updated.count} DRM license key tokens revoked.`;
          break;
        }

        case "TOKEN_BLACKLISTED": {
          if (params.metadata?.token) {
            await TokenService.revokeToken(
              params.metadata.token,
              params.actorId || "system",
              params.reason || `Blacklisted via Incident ${incident.incidentNumber}`
            );
            details = "JWT token blacklisted on security ledger.";
          } else {
            resultStatus = "SKIPPED_ALREADY_APPLIED";
            details = "No raw token string provided for blacklisting.";
          }
          break;
        }

        case "SEVERITY_ESCALATED": {
          await prisma.securityIncident.update({
            where: { id: incident.id },
            data: {
              severity: "CRITICAL",
              status: "ESCALATED",
            },
          });
          details = `Incident severity escalated to CRITICAL. Status: ESCALATED.`;
          break;
        }

        case "INVESTIGATION_CREATED": {
          // Link to Phase 13 Forensic PiracyIncident subsystem
          let validInvestigatorId: string | undefined = undefined;
          if (params.actorId) {
            const userExists = await prisma.user.findUnique({ where: { id: params.actorId } }).catch(() => null);
            if (userExists) validInvestigatorId = userExists.id;
          }

          const piracyIncident = await prisma.piracyIncident.create({
            data: {
              incidentNumber: `FSC-${incident.incidentNumber}`,
              title: `Forensic Deep-Dive: ${incident.title}`,
              description: incident.description,
              severity: incident.severity,
              status: "INVESTIGATING",
              theatreId: incident.theatreId,
              showId: incident.showId,
              movieId: incident.movieId,
              playbackSessionId: incident.playbackSessionId,
              activationId: incident.activationId,
              riskScore: incident.riskScore,
              assignedInvestigatorId: validInvestigatorId,
            },
          });
          details = `Created linked Forensic Investigation ${piracyIncident.incidentNumber}`;
          break;
        }

        case "RESOLVED": {
          await prisma.securityIncident.update({
            where: { id: incident.id },
            data: {
              status: "RESOLVED",
              resolvedAt: new Date(),
              resolutionNotes: params.reason || "Resolved by security operator",
            },
          });
          details = `Security incident marked as RESOLVED.`;
          break;
        }

        default:
          details = `Action ${params.actionType} processed.`;
      }
    } catch (err: any) {
      resultStatus = "FAILED";
      details = `Failed to execute ${params.actionType}: ${err.message}`;
      logger.error(`[IncidentResponseService] Action failure:`, err);
    }

    // Record immutable audit action in IncidentAction table
    const actionRecord = await prisma.incidentAction.create({
      data: {
        incidentId: incident.id,
        actionType: params.actionType,
        actorId: params.actorId,
        targetId: incident.playbackSessionId || incident.activationId || incident.theatreId,
        result: resultStatus,
        metadata: JSON.stringify({
          details,
          reason: params.reason,
          actorEmail: params.actorEmail,
          ...params.metadata,
        }),
      },
    });

    // Security Audit Log entry
    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: resultStatus === "SUCCESS" ? "HIGH" : "CRITICAL",
      userId: params.actorId,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      theatreId: incident.theatreId || undefined,
      showId: incident.showId || undefined,
      activationId: incident.activationId || undefined,
      actionSummary: `Executed Incident Action [${params.actionType}] on ${incident.incidentNumber}: ${details}`,
      isThreat: true,
      threatDetails: `Action Result: ${resultStatus}`,
    });

    // Broadcast action execution via SSE
    realtimeThreatEngine.broadcast("action_executed", {
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      actionType: params.actionType,
      result: resultStatus,
      details,
      timestamp: actionRecord.createdAt.toISOString(),
    });

    return {
      actionId: actionRecord.id,
      actionType: params.actionType,
      result: resultStatus,
      details,
      metadata: params.metadata,
    };
  }

  /**
   * Attach cryptographic tamper-evident evidence to a Security Incident
   */
  public async attachEvidence(params: {
    incidentId: string;
    evidenceType: IncidentEvidenceType;
    referenceId?: string;
    metadata?: any;
    rawPayload?: string;
  }) {
    const raw = params.rawPayload || `${params.incidentId}|${params.evidenceType}|${params.referenceId}|${Date.now()}`;
    const hash = crypto.createHash("sha256").update(raw).digest("hex");

    const evidence = await prisma.incidentEvidence.create({
      data: {
        incidentId: params.incidentId,
        evidenceType: params.evidenceType,
        referenceId: params.referenceId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        hash,
      },
    });

    realtimeThreatEngine.broadcast("evidence_attached", {
      incidentId: params.incidentId,
      evidenceId: evidence.id,
      evidenceType: evidence.evidenceType,
      hash,
      capturedAt: evidence.capturedAt.toISOString(),
    });

    return evidence;
  }
}

export const incidentResponseService = new IncidentResponseService();
