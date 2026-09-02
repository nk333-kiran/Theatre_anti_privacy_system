import { EventEmitter } from "events";
import { prisma } from "@antipiracy/database";
import { logger } from "../logging/logger";
import crypto from "crypto";

export type SecurityRealtimeEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "QR_ACTIVATION"
  | "QR_ACTIVATION_DENIED"
  | "STAFF_VERIFICATION"
  | "PLAYBACK_AUTHORIZED"
  | "PLAYBACK_DENIED"
  | "PLAYBACK_TERMINATED"
  | "DRM_LICENSE_AUTHORIZED"
  | "DRM_LICENSE_DENIED"
  | "DRM_LICENSE_REVOKED"
  | "SCREENSHOT_ATTEMPT_DETECTED"
  | "TOKEN_REPLAY"
  | "SUSPICIOUS_ACTIVITY"
  | "RATE_LIMIT_EXCEEDED"
  | "FORENSIC_WATERMARK_MATCH"
  | "INCIDENT_CREATED"
  | "INCIDENT_ESCALATED"
  | "THREAT_CORRELATION_ALERT"
  | "BREAK_GLASS_EMERGENCY_ACTIVE"
  | "ZERO_TRUST_DECISION";

export interface RealtimeEventPayload {
  eventId?: string;
  correlationId?: string;
  eventType: SecurityRealtimeEventType;
  source: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  theatreId?: string;
  showId?: string;
  movieId?: string;
  activationId?: string;
  playbackSessionId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface SanitizedRealtimeEvent {
  eventId: string;
  correlationId: string;
  eventType: SecurityRealtimeEventType;
  source: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  theatreId?: string;
  showId?: string;
  movieId?: string;
  activationId?: string;
  playbackSessionId?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

class RealtimeEventBus extends EventEmitter {
  private static instance: RealtimeEventBus;

  constructor() {
    super();
    this.setMaxListeners(200);
  }

  public static getInstance(): RealtimeEventBus {
    if (!RealtimeEventBus.instance) {
      RealtimeEventBus.instance = new RealtimeEventBus();
    }
    return RealtimeEventBus.instance;
  }

  /**
   * Sanitizes metadata to ensure zero-secret and zero-PII exposure
   */
  public sanitizeMetadata(raw?: Record<string, any>): Record<string, any> {
    if (!raw) return {};
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = [
      "password",
      "passwordHash",
      "jwtSecret",
      "jwt_secret",
      "masterKey",
      "privateKey",
      "drmKey",
      "secret",
      "token",
      "authorization",
      "creditCard",
      "phone",
      "email",
    ];

    for (const [key, value] of Object.entries(raw)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((s) => lowerKey.includes(s.toLowerCase()))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Ingests a new security event, sanitizes it, stores in database, and broadcasts to listeners
   */
  public async publish(payload: RealtimeEventPayload): Promise<SanitizedRealtimeEvent> {
    const eventId = payload.eventId || `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const correlationId = payload.correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = payload.timestamp || new Date().toISOString();
    const sanitizedMeta = this.sanitizeMetadata(payload.metadata);

    const event: SanitizedRealtimeEvent = {
      eventId,
      correlationId,
      eventType: payload.eventType,
      source: payload.source || "INTERNAL_EVENT_BUS",
      severity: payload.severity || "LOW",
      theatreId: payload.theatreId,
      showId: payload.showId,
      movieId: payload.movieId,
      activationId: payload.activationId,
      playbackSessionId: payload.playbackSessionId,
      metadata: sanitizedMeta,
      timestamp,
    };

    // Asynchronously persist to database
    prisma.realtimeThreatEvent
      .create({
        data: {
          eventId: event.eventId,
          correlationId: event.correlationId,
          eventType: event.eventType,
          source: event.source,
          severity: event.severity,
          theatreId: event.theatreId,
          showId: event.showId,
          movieId: event.movieId,
          activationId: event.activationId,
          playbackSessionId: event.playbackSessionId,
          metadata: JSON.stringify(event.metadata),
        },
      })
      .catch((err) => {
        logger.warn(`[RealtimeEventBus] Failed to persist event ${eventId}: ${err.message}`);
      });

    // Broadcast across event bus
    this.emit("security_event", event);
    this.emit(`event:${event.eventType}`, event);

    return event;
  }
}

export const realtimeEventBus = RealtimeEventBus.getInstance();
