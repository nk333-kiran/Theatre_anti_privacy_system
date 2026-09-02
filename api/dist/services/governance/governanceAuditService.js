"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceAuditService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
class GovernanceAuditService {
    /**
     * Log an immutable governance audit event.
     */
    static async logEvent(params) {
        const correlationId = params.correlationId || `GOV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        return database_1.prisma.governanceAuditEvent.create({
            data: {
                eventType: params.eventType,
                severity: params.severity || client_1.SecuritySeverity.INFO,
                actorId: params.actorId,
                actorEmail: params.actorEmail,
                actorRole: params.actorRole,
                targetType: params.targetType,
                targetId: params.targetId,
                actionSummary: params.actionSummary,
                changes: params.changes ? JSON.stringify(params.changes) : null,
                correlationId,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            },
        });
    }
    /**
     * Query governance audit events.
     */
    static async listEvents(params) {
        const where = {};
        if (params?.eventType)
            where.eventType = params.eventType;
        if (params?.targetType)
            where.targetType = params.targetType;
        if (params?.actorId)
            where.actorId = params.actorId;
        if (params?.correlationId)
            where.correlationId = params.correlationId;
        return database_1.prisma.governanceAuditEvent.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: params?.take || 100,
        });
    }
}
exports.GovernanceAuditService = GovernanceAuditService;
