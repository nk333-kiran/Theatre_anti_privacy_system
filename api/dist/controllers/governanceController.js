"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceController = void 0;
const database_1 = require("@antipiracy/database");
const policyOrchestrator_1 = require("../services/governance/policyOrchestrator");
const zeroTrustPolicyEngine_1 = require("../services/governance/zeroTrustPolicyEngine");
const privilegedActionService_1 = require("../services/governance/privilegedActionService");
const deviceTrustService_1 = require("../services/governance/deviceTrustService");
const breakGlassService_1 = require("../services/governance/breakGlassService");
const governanceAuditService_1 = require("../services/governance/governanceAuditService");
const client_1 = require("@prisma/client");
class GovernanceController {
    // ----------------------------------------------------
    // POLICIES
    // ----------------------------------------------------
    static async listPolicies(req, res) {
        try {
            const { policyType, isEnabled } = req.query;
            const policies = await policyOrchestrator_1.PolicyOrchestrator.listPolicies({
                policyType: policyType,
                isEnabled: isEnabled !== undefined ? isEnabled === "true" : undefined,
            });
            res.json({ success: true, data: policies });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_LIST_ERROR" });
        }
    }
    static async getPolicy(req, res) {
        try {
            const { id } = req.params;
            const policy = await database_1.prisma.securityPolicy.findUnique({
                where: { id },
                include: { versions: { orderBy: { version: "desc" } } },
            });
            if (!policy) {
                res.status(404).json({ success: false, message: "Policy not found", errorCode: "NOT_FOUND" });
                return;
            }
            res.json({ success: true, data: policy });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_GET_ERROR" });
        }
    }
    static async createPolicy(req, res) {
        try {
            const { name, description, policyType, priority, rules, tenantType, tenantId } = req.body;
            if (!name || !rules) {
                res.status(400).json({ success: false, message: "name and rules are required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const policy = await policyOrchestrator_1.PolicyOrchestrator.createPolicy({
                name,
                description,
                policyType: policyType || "ACCESS_CONTROL",
                priority: priority !== undefined ? Number(priority) : 100,
                rules: typeof rules === "string" ? JSON.parse(rules) : rules,
                tenantType: req.user?.role === "ADMIN" ? tenantType : req.user?.role === "PRODUCTION_COMPANY" ? "PRODUCTION_COMPANY" : "THEATRE",
                tenantId: req.user?.role === "ADMIN" ? tenantId : req.user?.productionCompanyId || req.user?.theatreId || undefined,
                createdBy: req.user?.email || req.user?.id,
            });
            res.status(201).json({ success: true, data: policy });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_CREATE_ERROR" });
        }
    }
    static async updatePolicy(req, res) {
        try {
            const { id } = req.params;
            const { name, description, priority, rules, isEnabled, changeReason } = req.body;
            const updated = await policyOrchestrator_1.PolicyOrchestrator.updatePolicy({
                policyId: id,
                name,
                description,
                priority: priority !== undefined ? Number(priority) : undefined,
                rules: rules ? (typeof rules === "string" ? JSON.parse(rules) : rules) : undefined,
                isEnabled,
                changeReason: changeReason || "Updated by administrator",
                updatedBy: req.user?.email || req.user?.id,
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_UPDATE_ERROR" });
        }
    }
    static async rollbackPolicy(req, res) {
        try {
            const { id } = req.params;
            const { targetVersion, reason } = req.body;
            if (!targetVersion) {
                res.status(400).json({ success: false, message: "targetVersion is required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const rolled = await policyOrchestrator_1.PolicyOrchestrator.rollbackPolicy({
                policyId: id,
                targetVersion: Number(targetVersion),
                reason: reason || "Rollback initiated by administrator",
                actorId: req.user?.email || req.user?.id,
            });
            res.json({ success: true, data: rolled });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_ROLLBACK_ERROR" });
        }
    }
    // ----------------------------------------------------
    // DECISIONS & TRUST
    // ----------------------------------------------------
    static async listDecisions(req, res) {
        try {
            const { decision, actorRole, resourceType, correlationId } = req.query;
            const decisions = await zeroTrustPolicyEngine_1.ZeroTrustPolicyEngine.listDecisions({
                decision: decision,
                actorRole: actorRole,
                resourceType: resourceType,
                correlationId: correlationId,
            });
            res.json({ success: true, data: decisions });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "DECISIONS_LIST_ERROR" });
        }
    }
    static async evaluateTrust(req, res) {
        try {
            const { rawDeviceFingerprint, resourceType, action } = req.body;
            const result = await zeroTrustPolicyEngine_1.ZeroTrustPolicyEngine.evaluateAccess({
                actorId: req.user?.id,
                actorEmail: req.user?.email,
                actorRole: req.user?.role,
                actorTenantType: req.user?.theatreId ? "THEATRE" : req.user?.productionCompanyId ? "PRODUCTION_COMPANY" : "ADMIN",
                actorTenantId: req.user?.theatreId || req.user?.productionCompanyId || undefined,
                rawDeviceFingerprint,
                ipAddress: req.ip,
                resourceType: resourceType || "SYSTEM",
                action: action || "READ",
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "TRUST_EVAL_ERROR" });
        }
    }
    // ----------------------------------------------------
    // DEVICES
    // ----------------------------------------------------
    static async listDevices(req, res) {
        try {
            const { status, search } = req.query;
            const devices = await deviceTrustService_1.DeviceTrustService.listDevices({
                status: status,
                search: search,
            });
            res.json({ success: true, data: devices });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "DEVICE_LIST_ERROR" });
        }
    }
    static async updateDeviceTrust(req, res) {
        try {
            const { id } = req.params;
            const { trustStatus, reason } = req.body;
            if (!trustStatus) {
                res.status(400).json({ success: false, message: "trustStatus is required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const updated = await deviceTrustService_1.DeviceTrustService.setDeviceTrustStatus({
                deviceId: id,
                trustStatus,
                reason: reason || "Manual administrator trust status change",
                adminId: req.user?.id || "ADMIN",
                adminEmail: req.user?.email,
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "DEVICE_UPDATE_ERROR" });
        }
    }
    // ----------------------------------------------------
    // PRIVILEGED ACTIONS
    // ----------------------------------------------------
    static async listPrivilegedActions(req, res) {
        try {
            const { status, actionType } = req.query;
            const actions = await privilegedActionService_1.PrivilegedActionService.listRequests({
                status: status,
                actionType: actionType,
            });
            res.json({ success: true, data: actions });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_LIST_ERROR" });
        }
    }
    static async requestPrivilegedAction(req, res) {
        try {
            const { actionType, targetResource, targetResourceId, reason, riskLevel, durationMinutes } = req.body;
            if (!actionType || !targetResource || !reason) {
                res.status(400).json({ success: false, message: "actionType, targetResource, and reason are required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const action = await privilegedActionService_1.PrivilegedActionService.requestAction({
                actionType,
                targetResource,
                targetResourceId,
                reason,
                riskLevel,
                durationMinutes: durationMinutes ? Number(durationMinutes) : 15,
                requestedBy: req.user?.id || "UNKNOWN",
                requesterEmail: req.user?.email,
                requesterRole: req.user?.role,
            });
            res.status(201).json({ success: true, data: action });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_REQUEST_ERROR" });
        }
    }
    static async approvePrivilegedAction(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const approved = await privilegedActionService_1.PrivilegedActionService.approveAction({
                requestId: id,
                approverId: req.user?.id || "ADMIN",
                approverEmail: req.user?.email,
                approverRole: req.user?.role,
                notes,
            });
            res.json({ success: true, data: approved });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_APPROVE_ERROR" });
        }
    }
    static async rejectPrivilegedAction(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const rejected = await privilegedActionService_1.PrivilegedActionService.rejectAction({
                requestId: id,
                rejectorId: req.user?.id || "ADMIN",
                rejectorEmail: req.user?.email,
                rejectorRole: req.user?.role,
                reason: reason || "Rejected by administrator",
            });
            res.json({ success: true, data: rejected });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_REJECT_ERROR" });
        }
    }
    static async executePrivilegedAction(req, res) {
        try {
            const { id } = req.params;
            const { executionToken, executionResult } = req.body;
            if (!executionToken) {
                res.status(400).json({ success: false, message: "executionToken is required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const executed = await privilegedActionService_1.PrivilegedActionService.executeAction({
                requestId: id,
                executionToken,
                executorId: req.user?.id || "ADMIN",
                executorEmail: req.user?.email,
                executionResult,
            });
            res.json({ success: true, data: executed });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_EXECUTE_ERROR" });
        }
    }
    // ----------------------------------------------------
    // BREAK-GLASS
    // ----------------------------------------------------
    static async startBreakGlass(req, res) {
        try {
            const { reason, durationMinutes } = req.body;
            const session = await breakGlassService_1.BreakGlassService.startSession({
                activatedBy: req.user?.id || "ADMIN",
                activatorEmail: req.user?.email,
                reason,
                durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });
            res.status(201).json({ success: true, data: session });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_START_ERROR" });
        }
    }
    static async closeBreakGlass(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const closed = await breakGlassService_1.BreakGlassService.closeSession({
                sessionId: id,
                closedBy: req.user?.id || "ADMIN",
                closedByEmail: req.user?.email,
                notes,
            });
            res.json({ success: true, data: closed });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_CLOSE_ERROR" });
        }
    }
    static async reviewBreakGlass(req, res) {
        try {
            const { id } = req.params;
            const { reviewNotes } = req.body;
            if (!reviewNotes) {
                res.status(400).json({ success: false, message: "reviewNotes are required", errorCode: "VALIDATION_ERROR" });
                return;
            }
            const reviewed = await breakGlassService_1.BreakGlassService.submitPostReview({
                sessionId: id,
                reviewerId: req.user?.id || "ADMIN",
                reviewerEmail: req.user?.email,
                reviewNotes,
            });
            res.json({ success: true, data: reviewed });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_REVIEW_ERROR" });
        }
    }
    static async listBreakGlassSessions(req, res) {
        try {
            const { isActive } = req.query;
            const sessions = await breakGlassService_1.BreakGlassService.listSessions({
                isActive: isActive !== undefined ? isActive === "true" : undefined,
            });
            res.json({ success: true, data: sessions });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_LIST_ERROR" });
        }
    }
    // ----------------------------------------------------
    // STATS & AUDIT
    // ----------------------------------------------------
    static async getStats(req, res) {
        try {
            const [totalPolicies, activePolicies, totalDecisions, deniedDecisions, pendingApprovals, activeBreakGlassCount, trustedDevicesCount, suspiciousDevicesCount,] = await Promise.all([
                database_1.prisma.securityPolicy.count(),
                database_1.prisma.securityPolicy.count({ where: { isEnabled: true } }),
                database_1.prisma.accessDecision.count(),
                database_1.prisma.accessDecision.count({ where: { decision: "DENY" } }),
                database_1.prisma.privilegedActionRequest.count({ where: { approvalStatus: "PENDING_APPROVAL" } }),
                database_1.prisma.breakGlassSession.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
                database_1.prisma.deviceTrustRecord.count({ where: { trustStatus: client_1.DeviceTrustStatus.TRUSTED } }),
                database_1.prisma.deviceTrustRecord.count({ where: { trustStatus: client_1.DeviceTrustStatus.SUSPICIOUS } }),
            ]);
            res.json({
                success: true,
                data: {
                    totalPolicies,
                    activePolicies,
                    totalDecisions,
                    deniedDecisions,
                    pendingApprovals,
                    activeBreakGlassCount,
                    trustedDevicesCount,
                    suspiciousDevicesCount,
                    overallTrustPosture: suspiciousDevicesCount > 0 || pendingApprovals > 0 ? "GUARDED" : "OPTIMAL",
                },
            });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "GOV_STATS_ERROR" });
        }
    }
    static async listAuditEvents(req, res) {
        try {
            const { eventType, targetType, correlationId } = req.query;
            const events = await governanceAuditService_1.GovernanceAuditService.listEvents({
                eventType: eventType,
                targetType: targetType,
                correlationId: correlationId,
            });
            res.json({ success: true, data: events });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message, errorCode: "GOV_AUDIT_ERROR" });
        }
    }
}
exports.GovernanceController = GovernanceController;
