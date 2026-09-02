"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocController = void 0;
const socAggregationService_1 = require("../services/soc/socAggregationService");
const socIncidentManager_1 = require("../services/soc/socIncidentManager");
const incidentLifecycleService_1 = require("../services/soc/incidentLifecycleService");
const incidentEscalationService_1 = require("../services/soc/incidentEscalationService");
const incidentTimelineService_1 = require("../services/soc/incidentTimelineService");
const workflowRuleService_1 = require("../services/soc/workflowRuleService");
const workflowApprovalService_1 = require("../services/soc/workflowApprovalService");
const socNotificationService_1 = require("../services/soc/socNotificationService");
const socMetricsService_1 = require("../services/soc/socMetricsService");
class SocController {
    // ----------------------------------------------------
    // UNIFIED SUMMARY & METRICS
    // ----------------------------------------------------
    static async getSummary(req, res) {
        try {
            const summary = await socAggregationService_1.SocAggregationService.getUnifiedSummary();
            res.json({ success: true, data: summary });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_SUMMARY_ERROR" });
        }
    }
    static async getMetrics(req, res) {
        try {
            const metrics = await socMetricsService_1.SocMetricsService.calculateMetrics();
            res.json({ success: true, data: metrics });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_METRICS_ERROR" });
        }
    }
    // ----------------------------------------------------
    // INCIDENTS & LIFECYCLE
    // ----------------------------------------------------
    static async listIncidents(req, res) {
        try {
            const { severity, status, theatreId, movieId, search, take } = req.query;
            const incidents = await socIncidentManager_1.SocIncidentManager.listIncidents({
                severity: severity,
                status: status,
                theatreId: req.user?.role === "THEATRE_STAFF" ? (req.user?.theatreId || undefined) : theatreId,
                movieId: movieId,
                search: search,
                take: take ? Number(take) : undefined,
            });
            res.json({ success: true, data: incidents });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_INCIDENTS_ERROR" });
        }
    }
    static async createIncident(req, res) {
        try {
            const { title, description, severity, source, theatreId, showId, movieId, playbackSessionId, riskScore, assignedToId } = req.body;
            if (!title) {
                res.status(400).json({ success: false, message: "title is required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const incident = await socIncidentManager_1.SocIncidentManager.createIncident({
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
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_CREATE_INCIDENT_ERROR" });
        }
    }
    static async getIncidentDetails(req, res) {
        try {
            const { id } = req.params;
            const details = await socIncidentManager_1.SocIncidentManager.getIncidentDetails(id);
            if (!details) {
                res.status(404).json({ success: false, message: "Incident not found", errorCode: "NOT_FOUND" });
                return;
            }
            res.json({ success: true, data: details });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_INCIDENT_DETAILS_ERROR" });
        }
    }
    static async getIncidentTimeline(req, res) {
        try {
            const { id } = req.params;
            const timeline = await incidentTimelineService_1.IncidentTimelineService.getIncidentTimeline(id);
            res.json({ success: true, data: timeline });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_TIMELINE_ERROR" });
        }
    }
    static async assignAnalyst(req, res) {
        try {
            const { id } = req.params;
            const { analystId, analystEmail } = req.body;
            if (!analystId) {
                res.status(400).json({ success: false, message: "analystId is required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const updated = await socIncidentManager_1.SocIncidentManager.assignAnalyst({
                incidentId: id,
                analystId,
                analystEmail,
                actorId: req.user?.id,
                actorEmail: req.user?.email,
                actorRole: req.user?.role,
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_ASSIGN_ERROR" });
        }
    }
    static async transitionStatus(req, res) {
        try {
            const { id } = req.params;
            const { newStatus, notes } = req.body;
            if (!newStatus) {
                res.status(400).json({ success: false, message: "newStatus is required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const updated = await incidentLifecycleService_1.IncidentLifecycleService.transitionStatus({
                incidentId: id,
                newStatus,
                actorId: req.user?.id,
                actorEmail: req.user?.email,
                actorRole: req.user?.role,
                notes,
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_TRANSITION_ERROR" });
        }
    }
    static async escalateIncident(req, res) {
        try {
            const { id } = req.params;
            const { riskScore, reason, isEvidenceTampered, repeatIocCount } = req.body;
            if (!reason) {
                res.status(400).json({ success: false, message: "reason is required for escalation", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const result = await incidentEscalationService_1.IncidentEscalationService.escalateIncident(id, {
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
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_ESCALATE_ERROR" });
        }
    }
    // ----------------------------------------------------
    // WORKFLOWS
    // ----------------------------------------------------
    static async listWorkflows(req, res) {
        try {
            const workflows = await workflowRuleService_1.WorkflowRuleService.listWorkflows();
            res.json({ success: true, data: workflows });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_WORKFLOWS_ERROR" });
        }
    }
    static async createWorkflow(req, res) {
        try {
            const { name, description, triggerType, triggerCondition, actionType, actionPayload, isEnabled, priority } = req.body;
            if (!name || !triggerType || !triggerCondition || !actionType) {
                res.status(400).json({ success: false, message: "Missing required workflow fields", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const workflow = await workflowRuleService_1.WorkflowRuleService.createWorkflow({
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
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_CREATE_WORKFLOW_ERROR" });
        }
    }
    static async listWorkflowExecutions(req, res) {
        try {
            const { workflowId, status, take } = req.query;
            const executions = await workflowApprovalService_1.WorkflowExecutionService.listExecutions({
                workflowId: workflowId,
                status: status,
                take: take ? Number(take) : undefined,
            });
            res.json({ success: true, data: executions });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_EXECUTIONS_ERROR" });
        }
    }
    // ----------------------------------------------------
    // NOTIFICATIONS
    // ----------------------------------------------------
    static async listNotifications(req, res) {
        try {
            const { isRead, take } = req.query;
            const notifications = await socNotificationService_1.SocNotificationService.listNotifications({
                role: req.user?.role,
                userId: req.user?.id,
                theatreId: req.user?.theatreId || undefined,
                productionCompanyId: req.user?.productionCompanyId || undefined,
                isRead: isRead !== undefined ? isRead === "true" : undefined,
                take: take ? Number(take) : undefined,
            });
            res.json({ success: true, data: notifications });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_NOTIFICATIONS_ERROR" });
        }
    }
    static async markNotificationRead(req, res) {
        try {
            const { id } = req.params;
            const updated = await socNotificationService_1.SocNotificationService.markAsRead(id);
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "SOC_READ_NOTIF_ERROR" });
        }
    }
}
exports.SocController = SocController;
