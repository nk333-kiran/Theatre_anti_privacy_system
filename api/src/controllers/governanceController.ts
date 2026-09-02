import { Response } from "express";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { prisma } from "@antipiracy/database";
import { PolicyOrchestrator } from "../services/governance/policyOrchestrator";
import { ZeroTrustPolicyEngine } from "../services/governance/zeroTrustPolicyEngine";
import { PrivilegedActionService } from "../services/governance/privilegedActionService";
import { DeviceTrustService } from "../services/governance/deviceTrustService";
import { BreakGlassService } from "../services/governance/breakGlassService";
import { GovernanceAuditService } from "../services/governance/governanceAuditService";
import { TrustScoringEngine } from "../services/governance/trustScoringEngine";
import { DeviceTrustStatus } from "@prisma/client";

export class GovernanceController {
  // ----------------------------------------------------
  // POLICIES
  // ----------------------------------------------------
  public static async listPolicies(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { policyType, isEnabled } = req.query;
      const policies = await PolicyOrchestrator.listPolicies({
        policyType: policyType as any,
        isEnabled: isEnabled !== undefined ? isEnabled === "true" : undefined,
      });
      res.json({ success: true, data: policies });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_LIST_ERROR" });
    }
  }

  public static async getPolicy(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const policy = await prisma.securityPolicy.findUnique({
        where: { id },
        include: { versions: { orderBy: { version: "desc" } } },
      });
      if (!policy) {
        res.status(404).json({ success: false, message: "Policy not found", errorCode: "NOT_FOUND" });
        return;
      }
      res.json({ success: true, data: policy });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_GET_ERROR" });
    }
  }

  public static async createPolicy(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { name, description, policyType, priority, rules, tenantType, tenantId } = req.body;
      if (!name || !rules) {
        res.status(400).json({ success: false, message: "name and rules are required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const policy = await PolicyOrchestrator.createPolicy({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_CREATE_ERROR" });
    }
  }

  public static async updatePolicy(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { name, description, priority, rules, isEnabled, changeReason } = req.body;

      const updated = await PolicyOrchestrator.updatePolicy({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_UPDATE_ERROR" });
    }
  }

  public static async rollbackPolicy(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { targetVersion, reason } = req.body;
      if (!targetVersion) {
        res.status(400).json({ success: false, message: "targetVersion is required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const rolled = await PolicyOrchestrator.rollbackPolicy({
        policyId: id,
        targetVersion: Number(targetVersion),
        reason: reason || "Rollback initiated by administrator",
        actorId: req.user?.email || req.user?.id,
      });

      res.json({ success: true, data: rolled });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "POLICY_ROLLBACK_ERROR" });
    }
  }

  // ----------------------------------------------------
  // DECISIONS & TRUST
  // ----------------------------------------------------
  public static async listDecisions(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { decision, actorRole, resourceType, correlationId } = req.query;
      const decisions = await ZeroTrustPolicyEngine.listDecisions({
        decision: decision as any,
        actorRole: actorRole as string,
        resourceType: resourceType as string,
        correlationId: correlationId as string,
      });
      res.json({ success: true, data: decisions });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "DECISIONS_LIST_ERROR" });
    }
  }

  public static async evaluateTrust(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { rawDeviceFingerprint, resourceType, action } = req.body;
      const result = await ZeroTrustPolicyEngine.evaluateAccess({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "TRUST_EVAL_ERROR" });
    }
  }

  // ----------------------------------------------------
  // DEVICES
  // ----------------------------------------------------
  public static async listDevices(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { status, search } = req.query;
      const devices = await DeviceTrustService.listDevices({
        status: status as any,
        search: search as string,
      });
      res.json({ success: true, data: devices });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "DEVICE_LIST_ERROR" });
    }
  }

  public static async updateDeviceTrust(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { trustStatus, reason } = req.body;
      if (!trustStatus) {
        res.status(400).json({ success: false, message: "trustStatus is required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const updated = await DeviceTrustService.setDeviceTrustStatus({
        deviceId: id,
        trustStatus,
        reason: reason || "Manual administrator trust status change",
        adminId: req.user?.id || "ADMIN",
        adminEmail: req.user?.email,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "DEVICE_UPDATE_ERROR" });
    }
  }

  // ----------------------------------------------------
  // PRIVILEGED ACTIONS
  // ----------------------------------------------------
  public static async listPrivilegedActions(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { status, actionType } = req.query;
      const actions = await PrivilegedActionService.listRequests({
        status: status as any,
        actionType: actionType as string,
      });
      res.json({ success: true, data: actions });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_LIST_ERROR" });
    }
  }

  public static async requestPrivilegedAction(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { actionType, targetResource, targetResourceId, reason, riskLevel, durationMinutes } = req.body;
      if (!actionType || !targetResource || !reason) {
        res.status(400).json({ success: false, message: "actionType, targetResource, and reason are required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const action = await PrivilegedActionService.requestAction({
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_REQUEST_ERROR" });
    }
  }

  public static async approvePrivilegedAction(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const approved = await PrivilegedActionService.approveAction({
        requestId: id,
        approverId: req.user?.id || "ADMIN",
        approverEmail: req.user?.email,
        approverRole: req.user?.role,
        notes,
      });

      res.json({ success: true, data: approved });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_APPROVE_ERROR" });
    }
  }

  public static async rejectPrivilegedAction(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const rejected = await PrivilegedActionService.rejectAction({
        requestId: id,
        rejectorId: req.user?.id || "ADMIN",
        rejectorEmail: req.user?.email,
        rejectorRole: req.user?.role,
        reason: reason || "Rejected by administrator",
      });

      res.json({ success: true, data: rejected });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_REJECT_ERROR" });
    }
  }

  public static async executePrivilegedAction(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { executionToken, executionResult } = req.body;
      if (!executionToken) {
        res.status(400).json({ success: false, message: "executionToken is required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const executed = await PrivilegedActionService.executeAction({
        requestId: id,
        executionToken,
        executorId: req.user?.id || "ADMIN",
        executorEmail: req.user?.email,
        executionResult,
      });

      res.json({ success: true, data: executed });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "PRIVILEGED_EXECUTE_ERROR" });
    }
  }

  // ----------------------------------------------------
  // BREAK-GLASS
  // ----------------------------------------------------
  public static async startBreakGlass(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { reason, durationMinutes } = req.body;
      const session = await BreakGlassService.startSession({
        activatedBy: req.user?.id || "ADMIN",
        activatorEmail: req.user?.email,
        reason,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_START_ERROR" });
    }
  }

  public static async closeBreakGlass(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const closed = await BreakGlassService.closeSession({
        sessionId: id,
        closedBy: req.user?.id || "ADMIN",
        closedByEmail: req.user?.email,
        notes,
      });

      res.json({ success: true, data: closed });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_CLOSE_ERROR" });
    }
  }

  public static async reviewBreakGlass(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      if (!reviewNotes) {
        res.status(400).json({ success: false, message: "reviewNotes are required", errorCode: "VALIDATION_ERROR" });
        return;
      }

      const reviewed = await BreakGlassService.submitPostReview({
        sessionId: id,
        reviewerId: req.user?.id || "ADMIN",
        reviewerEmail: req.user?.email,
        reviewNotes,
      });

      res.json({ success: true, data: reviewed });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_REVIEW_ERROR" });
    }
  }

  public static async listBreakGlassSessions(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { isActive } = req.query;
      const sessions = await BreakGlassService.listSessions({
        isActive: isActive !== undefined ? isActive === "true" : undefined,
      });
      res.json({ success: true, data: sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "BREAK_GLASS_LIST_ERROR" });
    }
  }

  // ----------------------------------------------------
  // STATS & AUDIT
  // ----------------------------------------------------
  public static async getStats(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const [
        totalPolicies,
        activePolicies,
        totalDecisions,
        deniedDecisions,
        pendingApprovals,
        activeBreakGlassCount,
        trustedDevicesCount,
        suspiciousDevicesCount,
      ] = await Promise.all([
        prisma.securityPolicy.count(),
        prisma.securityPolicy.count({ where: { isEnabled: true } }),
        prisma.accessDecision.count(),
        prisma.accessDecision.count({ where: { decision: "DENY" } }),
        prisma.privilegedActionRequest.count({ where: { approvalStatus: "PENDING_APPROVAL" } }),
        prisma.breakGlassSession.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
        prisma.deviceTrustRecord.count({ where: { trustStatus: DeviceTrustStatus.TRUSTED } }),
        prisma.deviceTrustRecord.count({ where: { trustStatus: DeviceTrustStatus.SUSPICIOUS } }),
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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "GOV_STATS_ERROR" });
    }
  }

  public static async listAuditEvents(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { eventType, targetType, correlationId } = req.query;
      const events = await GovernanceAuditService.listEvents({
        eventType: eventType as any,
        targetType: targetType as string,
        correlationId: correlationId as string,
      });
      res.json({ success: true, data: events });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errorCode: "GOV_AUDIT_ERROR" });
    }
  }
}
