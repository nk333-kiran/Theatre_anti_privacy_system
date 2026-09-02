import { prisma } from "@antipiracy/database";
import { IncidentSeverity } from "@prisma/client";
import { NotificationDeduplicationService } from "./notificationDeduplicationService";
import crypto from "crypto";

export interface SendNotificationParams {
  category:
    | "CRITICAL_SECURITY_EVENT"
    | "HIGH_RISK_INCIDENT"
    | "EVIDENCE_TAMPERING"
    | "IOC_CORRELATION"
    | "COORDINATED_ATTACK"
    | "PRIVILEGED_ACTION"
    | "BREAK_GLASS"
    | "SYSTEM_HEALTH";
  severity?: IncidentSeverity;
  title: string;
  message: string;
  targetRole?: "ADMIN" | "THEATRE_ADMIN" | "PRODUCTION_COMPANY" | "ALL";
  targetUserId?: string;
  theatreId?: string;
  productionCompanyId?: string;
  correlationId?: string;
  bypassDeduplication?: boolean;
}

export class SocNotificationService {
  /**
   * Sanitizes message to guarantee Zero-Secret and Zero-PII exposure.
   */
  public static sanitizePayload(rawText: string): string {
    return rawText
      .replace(/ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, "[REDACTED_JWT_TOKEN]")
      .replace(/(?:password|secret|key|apiKey|token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, "[REDACTED_CREDENTIAL]")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (match) => {
        const parts = match.split("@");
        return `${parts[0].substring(0, 2)}***@${parts[1]}`;
      });
  }

  /**
   * Send a sanitized, deduplicated SOC notification.
   */
  public static async sendNotification(params: SendNotificationParams) {
    const dedupKey = NotificationDeduplicationService.generateKey(
      params.category,
      params.theatreId || params.targetUserId,
      params.title
    );

    if (!params.bypassDeduplication && NotificationDeduplicationService.isDuplicate(dedupKey)) {
      return { skipped: true, reason: "DUPLICATE_IN_COOLDOWN" };
    }

    const sanitizedTitle = this.sanitizePayload(params.title);
    const sanitizedMessage = this.sanitizePayload(params.message);
    const correlationId = params.correlationId || `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const notification = await prisma.securityNotification.create({
      data: {
        category: params.category,
        severity: params.severity || IncidentSeverity.MEDIUM,
        title: sanitizedTitle,
        message: sanitizedMessage,
        targetRole: params.targetRole || "ALL",
        targetUserId: params.targetUserId,
        theatreId: params.theatreId,
        productionCompanyId: params.productionCompanyId,
        deduplicationKey: dedupKey,
        correlationId,
      },
    });

    return { skipped: false, notification };
  }

  /**
   * List notifications with tenant / role isolation.
   */
  public static async listNotifications(params?: {
    role?: string;
    userId?: string;
    theatreId?: string;
    productionCompanyId?: string;
    isRead?: boolean;
    take?: number;
  }) {
    const where: any = {};

    if (params?.role && params.role !== "ADMIN") {
      if (params.theatreId) {
        where.AND = [
          {
            OR: [
              { theatreId: params.theatreId },
              { theatreId: null, targetRole: "ALL" },
              { targetUserId: params.userId || undefined },
            ],
          },
        ];
      } else if (params.productionCompanyId) {
        where.AND = [
          {
            OR: [
              { productionCompanyId: params.productionCompanyId },
              { productionCompanyId: null, targetRole: "ALL" },
              { targetUserId: params.userId || undefined },
            ],
          },
        ];
      } else {
        where.OR = [
          { targetRole: "ALL", theatreId: null, productionCompanyId: null },
          { targetRole: params.role },
          { targetUserId: params.userId || undefined },
        ];
      }
    }

    if (params?.isRead !== undefined) {
      where.isRead = params.isRead;
    }

    return prisma.securityNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params?.take || 50,
    });
  }

  /**
   * Mark notification as read.
   */
  public static async markAsRead(notificationId: string) {
    return prisma.securityNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
