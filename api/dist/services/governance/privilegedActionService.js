"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivilegedActionService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const governanceAuditService_1 = require("./governanceAuditService");
class PrivilegedActionService {
    /**
     * Submit a new privileged action request requiring administrator approval.
     */
    static async requestAction(params) {
        const duration = params.durationMinutes || 15;
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);
        const correlationId = params.correlationId || `PRIV-${Date.now()}-${crypto_1.default.randomBytes(3).toString("hex")}`;
        const record = await database_1.prisma.privilegedActionRequest.create({
            data: {
                actionType: params.actionType,
                requestedBy: params.requestedBy,
                requesterEmail: params.requesterEmail,
                requesterRole: params.requesterRole,
                targetResource: params.targetResource,
                targetResourceId: params.targetResourceId,
                reason: params.reason,
                riskLevel: params.riskLevel || client_1.PrivilegedRiskLevel.HIGH,
                approvalStatus: client_1.PrivilegedActionStatus.PENDING_APPROVAL,
                expiresAt,
                correlationId,
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.PRIVILEGED_ACTION_REQUESTED,
            severity: client_1.SecuritySeverity.MEDIUM,
            actorId: params.requestedBy,
            actorEmail: params.requesterEmail,
            actorRole: params.requesterRole,
            targetType: "PRIVILEGED_ACTION",
            targetId: record.id,
            actionSummary: `Privileged action requested: ${params.actionType} on ${params.targetResource} (${params.reason})`,
            correlationId,
        });
        return record;
    }
    /**
     * Approve a privileged action request and generate a short-lived cryptographic execution token.
     */
    static async approveAction(params) {
        const existing = await database_1.prisma.privilegedActionRequest.findUnique({
            where: { id: params.requestId },
        });
        if (!existing) {
            throw new Error("Privileged action request not found");
        }
        if (existing.approvalStatus !== client_1.PrivilegedActionStatus.PENDING_APPROVAL) {
            throw new Error(`Cannot approve request in ${existing.approvalStatus} status`);
        }
        if (existing.expiresAt < new Date()) {
            await database_1.prisma.privilegedActionRequest.update({
                where: { id: existing.id },
                data: { approvalStatus: client_1.PrivilegedActionStatus.EXPIRED },
            });
            throw new Error("Privileged action request has expired");
        }
        // Cryptographically random 64-character one-time execution token
        const executionToken = crypto_1.default.randomBytes(32).toString("hex");
        const updated = await database_1.prisma.privilegedActionRequest.update({
            where: { id: existing.id },
            data: {
                approvalStatus: client_1.PrivilegedActionStatus.APPROVED,
                approverId: params.approverId,
                approverEmail: params.approverEmail,
                approvalNotes: params.notes,
                approvedAt: new Date(),
                executionToken,
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.PRIVILEGED_ACTION_APPROVED,
            severity: client_1.SecuritySeverity.HIGH,
            actorId: params.approverId,
            actorEmail: params.approverEmail,
            actorRole: params.approverRole,
            targetType: "PRIVILEGED_ACTION",
            targetId: existing.id,
            actionSummary: `Privileged action ${existing.actionType} APPROVED by ${params.approverEmail || params.approverId}`,
            correlationId: existing.correlationId,
        });
        return updated;
    }
    /**
     * Reject a privileged action request.
     */
    static async rejectAction(params) {
        const existing = await database_1.prisma.privilegedActionRequest.findUnique({
            where: { id: params.requestId },
        });
        if (!existing) {
            throw new Error("Privileged action request not found");
        }
        const updated = await database_1.prisma.privilegedActionRequest.update({
            where: { id: existing.id },
            data: {
                approvalStatus: client_1.PrivilegedActionStatus.REJECTED,
                approverId: params.rejectorId,
                approverEmail: params.rejectorEmail,
                approvalNotes: params.reason,
                approvedAt: new Date(),
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.PRIVILEGED_ACTION_REJECTED,
            severity: client_1.SecuritySeverity.MEDIUM,
            actorId: params.rejectorId,
            actorEmail: params.rejectorEmail,
            actorRole: params.rejectorRole,
            targetType: "PRIVILEGED_ACTION",
            targetId: existing.id,
            actionSummary: `Privileged action ${existing.actionType} REJECTED: ${params.reason}`,
            correlationId: existing.correlationId,
        });
        return updated;
    }
    /**
     * Validate one-time execution token and mark action as EXECUTED.
     */
    static async executeAction(params) {
        const existing = await database_1.prisma.privilegedActionRequest.findUnique({
            where: { id: params.requestId },
        });
        if (!existing) {
            throw new Error("Privileged action request not found");
        }
        if (existing.approvalStatus !== client_1.PrivilegedActionStatus.APPROVED) {
            throw new Error(`Action is not approved (status: ${existing.approvalStatus})`);
        }
        if (existing.expiresAt < new Date()) {
            await database_1.prisma.privilegedActionRequest.update({
                where: { id: existing.id },
                data: { approvalStatus: client_1.PrivilegedActionStatus.EXPIRED },
            });
            throw new Error("Privileged execution window expired");
        }
        // Timing-safe cryptographic comparison
        const tokenBuffer = Buffer.from(params.executionToken.trim());
        const expectedBuffer = Buffer.from((existing.executionToken || "").trim());
        if (tokenBuffer.length !== expectedBuffer.length ||
            !crypto_1.default.timingSafeEqual(tokenBuffer, expectedBuffer)) {
            throw new Error("Invalid execution authorization token");
        }
        const updated = await database_1.prisma.privilegedActionRequest.update({
            where: { id: existing.id },
            data: {
                approvalStatus: client_1.PrivilegedActionStatus.EXECUTED,
                executedAt: new Date(),
                executionResult: params.executionResult || "SUCCESS",
                executionToken: null, // Zero-token: burn token immediately upon execution
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.PRIVILEGED_ACTION_EXECUTED,
            severity: client_1.SecuritySeverity.CRITICAL,
            actorId: params.executorId,
            actorEmail: params.executorEmail,
            targetType: "PRIVILEGED_ACTION",
            targetId: existing.id,
            actionSummary: `Privileged action ${existing.actionType} EXECUTED with valid token`,
            correlationId: existing.correlationId,
        });
        return updated;
    }
    /**
     * List privileged action requests.
     */
    static async listRequests(params) {
        const where = {};
        if (params?.status)
            where.approvalStatus = params.status;
        if (params?.actionType)
            where.actionType = params.actionType;
        return database_1.prisma.privilegedActionRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
        });
    }
}
exports.PrivilegedActionService = PrivilegedActionService;
