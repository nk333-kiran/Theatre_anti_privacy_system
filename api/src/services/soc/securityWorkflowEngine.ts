import { prisma } from "@antipiracy/database";
import { WorkflowRuleService } from "./workflowRuleService";
import { WorkflowExecutionService, WorkflowApprovalService } from "./workflowApprovalService";
import { IncidentEscalationService } from "./incidentEscalationService";
import { SocNotificationService } from "./socNotificationService";
import { investigationService } from "../evidence/investigationService";
import { realtimeEventBus } from "../realtime/realtimeEventBus";
import crypto from "crypto";

export interface WorkflowTriggerEvent {
  triggerType: string;
  incidentId?: string;
  theatreId?: string;
  movieId?: string;
  playbackSessionId?: string;
  riskScore?: number;
  repeatIocCount?: number;
  isEvidenceTampered?: boolean;
  affectedTheatresCount?: number;
  reason: string;
  actorId?: string;
  actorEmail?: string;
  correlationId?: string;
}

export class SecurityWorkflowEngine {
  /**
   * Evaluate active workflows for a trigger event.
   */
  public static async processEvent(event: WorkflowTriggerEvent) {
    const correlationId = event.correlationId || `WF-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const rules = await WorkflowRuleService.getActiveRules(event.triggerType);
    const results: Array<{ workflowId: string; decision: string; actionTaken: string }> = [];

    for (const rule of rules) {
      let conditionMet = true;
      let parsedCondition: any = {};

      try {
        parsedCondition = JSON.parse(rule.triggerCondition);
      } catch {
        parsedCondition = {};
      }

      // 1. Evaluate Condition Parameters
      if (parsedCondition.minRiskScore !== undefined) {
        if (!event.riskScore || event.riskScore < parsedCondition.minRiskScore) {
          conditionMet = false;
        }
      }

      if (parsedCondition.minIocCount !== undefined) {
        if (!event.repeatIocCount || event.repeatIocCount < parsedCondition.minIocCount) {
          conditionMet = false;
        }
      }

      if (parsedCondition.requireEvidenceTampered && !event.isEvidenceTampered) {
        conditionMet = false;
      }

      if (parsedCondition.minAffectedTheatres !== undefined) {
        if (!event.affectedTheatresCount || event.affectedTheatresCount < parsedCondition.minAffectedTheatres) {
          conditionMet = false;
        }
      }

      if (!conditionMet) {
        await WorkflowExecutionService.recordExecution({
          workflowId: rule.id,
          triggerEvent: event.triggerType,
          decision: "SKIPPED",
          actionTaken: "Condition criteria not satisfied",
          status: "SUCCESS",
          actorId: event.actorId,
          actorEmail: event.actorEmail,
          correlationId,
        });
        results.push({ workflowId: rule.id, decision: "SKIPPED", actionTaken: "NONE" });
        continue;
      }

      // 2. Execute Configured Action (Advisory & Safe)
      let actionResult: any = {};

      switch (rule.actionType) {
        case "ESCALATE_INCIDENT":
          if (event.incidentId) {
            const esc = await IncidentEscalationService.escalateIncident(event.incidentId, {
              riskScore: event.riskScore,
              reason: `Automated Workflow '${rule.name}': ${event.reason}`,
              triggeredBy: "AUTOMATED_POLICY",
              policyId: rule.id,
              actorId: event.actorId,
              actorEmail: event.actorEmail,
            });
            actionResult = esc;
          }
          break;

        case "CREATE_INVESTIGATION":
          if (event.theatreId) {
            const investigationCase = await investigationService.createCase({
              title: `Automated Investigation: ${rule.name}`,
              description: `Triggered by workflow '${rule.name}'. Reason: ${event.reason}`,
              theatreId: event.theatreId,
              severity: (event.riskScore && event.riskScore >= 80) ? "CRITICAL" : "HIGH",
              creator: {
                id: event.actorId || "SYSTEM",
                email: event.actorEmail || "system@theatre-antipiracy.internal",
                role: "ADMIN",
              },
            });
            actionResult = investigationCase;
          }
          break;

        case "NOTIFY_SOC":
        case "CREATE_CRITICAL_ALERT":
          actionResult = await SocNotificationService.sendNotification({
            category: event.isEvidenceTampered
              ? "EVIDENCE_TAMPERING"
              : event.riskScore && event.riskScore >= 80
              ? "CRITICAL_SECURITY_EVENT"
              : "HIGH_RISK_INCIDENT",
            severity: "CRITICAL",
            title: `SOC Alert: ${rule.name}`,
            message: event.reason,
            theatreId: event.theatreId,
            correlationId,
          });
          break;

        case "REQUIRE_APPROVAL":
          actionResult = await WorkflowApprovalService.queueForApproval({
            actionType: "AUTOMATED_INCIDENT_CONTAINMENT",
            targetResource: event.incidentId || "THEATRE_SYSTEM",
            targetResourceId: event.incidentId,
            reason: `Workflow '${rule.name}' requested containment for: ${event.reason}`,
          });
          break;

        default:
          actionResult = { executed: true, note: "Advisory event recorded" };
          break;
      }

      await WorkflowExecutionService.recordExecution({
        workflowId: rule.id,
        triggerEvent: event.triggerType,
        decision: rule.actionType === "REQUIRE_APPROVAL" ? "REQUIRES_APPROVAL" : "EXECUTED",
        actionTaken: rule.actionType,
        status: "SUCCESS",
        result: actionResult,
        actorId: event.actorId,
        actorEmail: event.actorEmail,
        correlationId,
      });

      results.push({
        workflowId: rule.id,
        decision: rule.actionType === "REQUIRE_APPROVAL" ? "REQUIRES_APPROVAL" : "EXECUTED",
        actionTaken: rule.actionType,
      });
    }

    return { processedRulesCount: rules.length, results, correlationId };
  }
}
