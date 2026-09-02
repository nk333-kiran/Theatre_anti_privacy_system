import { Response } from "express";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { SocAggregationService } from "../services/soc/socAggregationService";
import { SocIncidentManager } from "../services/soc/socIncidentManager";
import { IncidentLifecycleService } from "../services/soc/incidentLifecycleService";
import { IncidentEscalationService } from "../services/soc/incidentEscalationService";
import { IncidentTimelineService } from "../services/soc/incidentTimelineService";
import { WorkflowRuleService } from "../services/soc/workflowRuleService";
import { WorkflowExecutionService } from "../services/soc/workflowApprovalService";
import { SocNotificationService } from "../services/soc/socNotificationService";
import { SocMetricsService } from "../services/soc/socMetricsService";

export class SocController {
  // ----------------------------------------------------
  // UNIFIED SUMMARY & METRICS
  // ----------------------------------------------------
  public static async getSummary(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const summary = await SocAggregationService.getUnifiedSummary();
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_SUMMARY_ERROR" });
    }
  }

  public static async getMetrics(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const metrics = await SocMetricsService.calculateMetrics();
      res.json({ success: true, data: metrics });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_METRICS_ERROR" });
    }
  }

  // ----------------------------------------------------
  // INCIDENTS & LIFECYCLE
  // ----------------------------------------------------
  public static async listIncidents(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { severity, status, theatreId, movieId, search, take } = req.query;
      const incidents = await SocIncidentManager.listIncidents({
        severity: severity as any,
        status: status as any,
        theatreId: req.user?.role === "THEATRE_STAFF" ? (req.user?.theatreId || undefined) : (theatreId as string | undefined),
        movieId: movieId as string,
        search: search as string,
        take: take ? Number(take) : undefined,
      });
      res.json({ success: true, data: incidents });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_INCIDENTS_ERROR" });
    }
  }

  public static async createIncident(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { title, description, severity, source, theatreId, showId, movieId, playbackSessionId, riskScore, assignedToId } = req.body;
      if (!title) {
        res.status(400).json({ success: false, message: "title is required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const incident = await SocIncidentManager.createIncident({
        title,
        description,
        severity,
        source,
        theatreId: req.user?.role === "THEATRE_STAFF" ? (req.user?.theatreId || undefined) : theatreId,
        showId,
        movieId,
        playbackSessionId,
        riskScore: riskScore ? Number(riskScore) : undefined,
        assignedToId,
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
      });

      res.status(201).json({ success: true, data: incident });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_CREATE_INCIDENT_ERROR" });
    }
  }

  public static async getIncidentDetails(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const details = await SocIncidentManager.getIncidentDetails(id);
      if (!details) {
        res.status(404).json({ success: false, message: "Incident not found", errorCode: "NOT_FOUND" });
        return;
      }
      res.json({ success: true, data: details });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_INCIDENT_DETAILS_ERROR" });
    }
  }

  public static async getIncidentTimeline(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const timeline = await IncidentTimelineService.getIncidentTimeline(id);
      res.json({ success: true, data: timeline });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_TIMELINE_ERROR" });
    }
  }

  public static async assignAnalyst(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { analystId, analystEmail } = req.body;
      if (!analystId) {
        res.status(400).json({ success: false, message: "analystId is required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const updated = await SocIncidentManager.assignAnalyst({
        incidentId: id,
        analystId,
        analystEmail,
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_ASSIGN_ERROR" });
    }
  }

  public static async transitionStatus(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { newStatus, notes } = req.body;
      if (!newStatus) {
        res.status(400).json({ success: false, message: "newStatus is required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const updated = await IncidentLifecycleService.transitionStatus({
        incidentId: id,
        newStatus,
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        notes,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_TRANSITION_ERROR" });
    }
  }

  public static async escalateIncident(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { riskScore, reason, isEvidenceTampered, repeatIocCount } = req.body;
      if (!reason) {
        res.status(400).json({ success: false, message: "reason is required for escalation", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const result = await IncidentEscalationService.escalateIncident(id, {
        riskScore: riskScore ? Number(riskScore) : undefined,
        reason,
        isEvidenceTampered,
        repeatIocCount: repeatIocCount ? Number(repeatIocCount) : undefined,
        triggeredBy: "ANALYST_ACTION",
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_ESCALATE_ERROR" });
    }
  }

  // ----------------------------------------------------
  // WORKFLOWS
  // ----------------------------------------------------
  public static async listWorkflows(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const workflows = await WorkflowRuleService.listWorkflows();
      res.json({ success: true, data: workflows });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_WORKFLOWS_ERROR" });
    }
  }

  public static async createWorkflow(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { name, description, triggerType, triggerCondition, actionType, actionPayload, isEnabled, priority } = req.body;
      if (!name || !triggerType || !triggerCondition || !actionType) {
        res.status(400).json({ success: false, message: "Missing required workflow fields", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const workflow = await WorkflowRuleService.createWorkflow({
        name,
        description,
        triggerType,
        triggerCondition: typeof triggerCondition === "string" ? JSON.parse(triggerCondition) : triggerCondition,
        actionType,
        actionPayload: actionPayload ? (typeof actionPayload === "string" ? JSON.parse(actionPayload) : actionPayload) : undefined,
        isEnabled,
        priority: priority ? Number(priority) : 100,
        tenantType: req.user?.role === "ADMIN" ? "GLOBAL" : "THEATRE",
        tenantId: req.user?.theatreId || undefined,
        createdBy: req.user?.email || req.user?.id,
      });

      res.status(201).json({ success: true, data: workflow });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_CREATE_WORKFLOW_ERROR" });
    }
  }

  public static async listWorkflowExecutions(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { workflowId, status, take } = req.query;
      const executions = await WorkflowExecutionService.listExecutions({
        workflowId: workflowId as string,
        status: status as string,
        take: take ? Number(take) : undefined,
      });
      res.json({ success: true, data: executions });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_EXECUTIONS_ERROR" });
    }
  }

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------
  public static async listNotifications(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { isRead, take } = req.query;
      const notifications = await SocNotificationService.listNotifications({
        role: req.user?.role,
        userId: req.user?.id,
        theatreId: req.user?.theatreId || undefined,
        productionCompanyId: req.user?.productionCompanyId || undefined,
        isRead: isRead !== undefined ? isRead === "true" : undefined,
        take: take ? Number(take) : undefined,
      });
      res.json({ success: true, data: notifications });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_NOTIFICATIONS_ERROR" });
    }
  }

  public static async markNotificationRead(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const updated = await SocNotificationService.markAsRead(id);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "SOC_READ_NOTIF_ERROR" });
    }
  }
}
