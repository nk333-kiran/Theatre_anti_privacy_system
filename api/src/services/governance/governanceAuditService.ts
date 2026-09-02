import { prisma } from "@antipiracy/database";
import { GovernanceEventType, SecuritySeverity } from "@prisma/client";

export interface LogGovernanceParams {
  eventType: GovernanceEventType;
  severity?: SecuritySeverity;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType: string;
  targetId?: string;
  actionSummary: string;
  changes?: Record<string, any>;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class GovernanceAuditService {
  /**
   * Log an immutable governance audit event.
   */
  public static async logEvent(params: LogGovernanceParams) {
    const correlationId = params.correlationId || `GOV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return prisma.governanceAuditEvent.create({
      data: {
        eventType: params.eventType,
        severity: params.severity || SecuritySeverity.INFO,
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
  public static async listEvents(params?: {
    eventType?: GovernanceEventType;
    targetType?: string;
    actorId?: string;
    correlationId?: string;
    take?: number;
  }) {
    const where: any = {};
    if (params?.eventType) where.eventType = params.eventType;
    if (params?.targetType) where.targetType = params.targetType;
    if (params?.actorId) where.actorId = params.actorId;
    if (params?.correlationId) where.correlationId = params.correlationId;

    return prisma.governanceAuditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params?.take || 100,
    });
  }
}
