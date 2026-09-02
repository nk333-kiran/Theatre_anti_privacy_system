import { prisma, SecurityEventType, SecuritySeverity } from "@antipiracy/database";
import { threatDetector } from "./threatDetector";

export interface SecurityEventParams {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  userId?: string;
  actorEmail?: string;
  actorRole?: string;
  theatreId?: string;
  showId?: string;
  activationId?: string;
  ticketId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  endpoint?: string;
  actionSummary: string;
  metadata?: Record<string, any>;
  isThreat?: boolean;
  threatDetails?: string;
}

export class SecurityAuditService {
  /**
   * Determine default severity based on event type
   */
  private static getDefaultSeverity(eventType: SecurityEventType): SecuritySeverity {
    switch (eventType) {
      case "SUSPICIOUS_ACTIVITY":
        return "HIGH";
      case "LOGIN_FAILED":
      case "ROLE_ACCESS_DENIED":
      case "RATE_LIMIT_EXCEEDED":
      case "QR_ACTIVATION_DENIED":
      case "PLAYBACK_DENIED":
      case "DRM_LICENSE_DENIED":
        return "MEDIUM";
      case "DRM_LICENSE_REVOKED":
      case "TICKET_CANCELLED":
      case "PLAYBACK_TERMINATED":
        return "LOW";
      case "LOGIN_SUCCESS":
      case "LOGOUT":
      case "TICKET_CREATED":
      case "QR_ACTIVATION":
      case "STAFF_VERIFICATION":
      case "PLAYBACK_AUTHORIZED":
      case "DRM_LICENSE_AUTHORIZED":
      default:
        return "INFO";
    }
  }

  /**
   * Log a security event into PostgreSQL with zero-PII and threat analysis.
   */
  public static async logEvent(params: SecurityEventParams): Promise<void> {
    try {
      const severity = params.severity || this.getDefaultSeverity(params.eventType);
      const safeMetadata = params.metadata ? JSON.stringify(params.metadata) : undefined;

      // Check Threat Detection Engine
      const threatCheck = await threatDetector.analyzeEvent(params);

      await prisma.securityAuditLog.create({
        data: {
          eventType: params.eventType,
          severity: threatCheck.isThreat ? "HIGH" : severity,
          userId: params.userId,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          theatreId: params.theatreId,
          showId: params.showId,
          activationId: params.activationId,
          ticketId: params.ticketId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent ? params.userAgent.slice(0, 255) : undefined,
          deviceFingerprint: params.deviceFingerprint,
          endpoint: params.endpoint,
          actionSummary: params.actionSummary,
          metadata: safeMetadata,
          isThreat: params.isThreat !== undefined ? params.isThreat : threatCheck.isThreat,
          threatDetails: params.threatDetails || threatCheck.threatDetails,
        },
      });
    } catch (err) {
      // Non-blocking logger error fallback
      console.warn("⚠️ [SecurityAuditService] Failed to persist security audit event:", err);
    }
  }
}
