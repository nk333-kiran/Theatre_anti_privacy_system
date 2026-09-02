import crypto from "crypto";
import { prisma, IncidentSeverity, SecurityEventType, ProtectionEventType, IncidentSource } from "@antipiracy/database";
import { env } from "../config/envValidator";
import { AppError } from "../middleware/errorHandler";
import { SocIncidentManager } from "./soc/socIncidentManager";
import { AutomatedEvidenceService } from "./evidence/automatedEvidenceService";

export type NormalizedMobileEventType =
  | "CAMERA_ACTIVITY"
  | "SCREEN_CAPTURE_SIGNAL"
  | "SCREEN_VISIBILITY_CHANGE"
  | "FULLSCREEN_EXIT"
  | "SUSPICIOUS_ACTIVITY"
  | "MOBILE_SECURITY_EVENT";

export interface MobileTicketVerificationParams {
  qrPayload: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  userTheatreId?: string | null;
  deviceFingerprint?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface MobileSessionData {
  sessionId: string;
  activationId: string;
  ticketId: string;
  ticketNumber: string;
  seatNumber: string;
  protectionStatus: "ACTIVE" | "EXPIRED" | "REVOKED";
  movie: {
    id: string;
    title: string;
    durationMinutes: number;
    language: string;
    rating: string | null;
  };
  theatre: {
    id: string;
    name: string;
    code: string;
    location: string;
  };
  screen: {
    id: string;
    name: string;
    screenNumber: number;
    capacity: number;
  };
  show: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
  };
  activatedAt: string;
  expiresAt: string | null;
  verifiedAt: string;
  staffName?: string;
}

export interface MobileSecurityEventParams {
  eventType: NormalizedMobileEventType | string;
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sessionId?: string;
  theatreId?: string;
  showId?: string;
  movieId?: string;
  activationId?: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface MobileSecurityEventResult {
  eventId: string;
  correlationId: string;
  status: "INGESTED";
  riskScore: number;
  correlatedIncidentId?: string;
  warningRequired: boolean;
  warningMessage?: string;
  timestamp: string;
}

export class MobileService {
  /**
   * Helper to sanitize & extract token from raw input (supports raw string, token codes, or URL)
   */
  public static extractToken(rawInput: string): string {
    if (!rawInput) return "";
    let input = String(rawInput).trim();

    if (input.includes("code=")) {
      const match = input.match(/[?&]code=([a-zA-Z0-9_.-]+)/);
      if (match && match[1]) return match[1];
    }

    if (input.includes("token=")) {
      const match = input.match(/[?&]token=([a-zA-Z0-9_.-]+)/);
      if (match && match[1]) return match[1];
    }

    if (input.includes("ticket=")) {
      const match = input.match(/[?&]ticket=([a-zA-Z0-9_.-]+)/);
      if (match && match[1]) return match[1];
    }

    if (input.includes("/activate/")) {
      const parts = input.split("/activate/");
      if (parts[1]) return parts[1].split("?")[0].trim();
    }

    if (input.includes("/mobile/")) {
      const parts = input.split("/mobile/");
      if (parts[1]) return parts[1].split("?")[0].trim();
    }

    return input;
  }

  /**
   * Generates a cryptographically signed, zero-PII, zero-secret opaque QR token
   * Format: QRTK.<activationCode>.<HMAC_signature>
   */
  public static generateSecureQrToken(activationCode: string): string {
    const cleanCode = String(activationCode).trim();
    const hmac = crypto
      .createHmac("sha256", env.JWT_SECRET)
      .update(cleanCode)
      .digest("hex")
      .slice(0, 16);
    return `QRTK.${cleanCode}.${hmac}`;
  }

  /**
   * Parses and validates QR token signature integrity
   */
  public static parseAndValidateQrToken(rawPayload: string): {
    activationCode: string;
    isSigned: boolean;
    isValidSignature: boolean;
  } {
    const extracted = this.extractToken(rawPayload);

    if (extracted.startsWith("QRTK.")) {
      const parts = extracted.split(".");
      if (parts.length === 3) {
        const code = parts[1];
        const signature = parts[2];
        const expectedHmac = crypto
          .createHmac("sha256", env.JWT_SECRET)
          .update(code)
          .digest("hex")
          .slice(0, 16);

        return {
          activationCode: code,
          isSigned: true,
          isValidSignature: signature === expectedHmac,
        };
      }
      return {
        activationCode: extracted,
        isSigned: true,
        isValidSignature: false,
      };
    }

    // Direct activation code or ticket number (fallback)
    return {
      activationCode: extracted,
      isSigned: false,
      isValidSignature: true,
    };
  }

  /**
   * Verify Ticket QR, activate session if valid, reject duplicates, enforce theatre isolation, and return protected screening session
   */
  public static async verifyTicketQR(params: MobileTicketVerificationParams): Promise<MobileSessionData> {
    const { qrPayload, userId, userRole, userTheatreId, deviceFingerprint, clientIp, userAgent, userName } = params;

    if (!qrPayload || !String(qrPayload).trim()) {
      throw new AppError("QR token payload is required", 400, "MISSING_QR_PAYLOAD");
    }

    // 1. Parse and validate cryptographic signature if signed token
    const tokenInfo = this.parseAndValidateQrToken(qrPayload);
    if (tokenInfo.isSigned && !tokenInfo.isValidSignature) {
      try {
        await prisma.securityAuditLog.create({
          data: {
            eventType: "QR_ACTIVATION_DENIED",
            severity: "HIGH",
            userId: userId || null,
            actorEmail: params.userEmail || null,
            actorRole: userRole || null,
            theatreId: userTheatreId || null,
            ipAddress: clientIp || null,
            userAgent: userAgent || null,
            actionSummary: "Tampered QR token rejected: HMAC signature verification failed",
            isThreat: true,
          },
        });
      } catch (logErr) {
        // Non-fatal
      }
      throw new AppError("QR code signature verification failed. Possible counterfeit or tampered ticket.", 400, "INVALID_QR");
    }

    const token = tokenInfo.activationCode;
    const now = new Date();

    // 2. Locate activation / ticket record with complete show and venue relations
    const activation = await prisma.activation.findFirst({
      where: {
        OR: [
          { activationCode: token },
          { id: token },
          { ticket: { ticketNumber: token.toUpperCase() } },
        ],
      },
      include: {
        ticket: {
          include: {
            show: {
              include: {
                movie: true,
                theatre: true,
                screen: true,
              },
            },
          },
        },
      },
    });

    if (!activation || !activation.ticket) {
      try {
        await prisma.securityAuditLog.create({
          data: {
            eventType: "QR_ACTIVATION_DENIED",
            severity: "LOW",
            userId: userId || null,
            actorEmail: params.userEmail || null,
            actorRole: userRole || null,
            theatreId: userTheatreId || null,
            ipAddress: clientIp || null,
            userAgent: userAgent || null,
            actionSummary: `Mobile QR verification denied: unknown ticket token "${token.slice(0, 8)}..."`,
            isThreat: false,
          },
        });
      } catch (logErr) {
        // Non-fatal
      }

      throw new AppError("Invalid or unrecognized ticket QR code", 404, "INVALID_QR");
    }

    const { ticket } = activation;
    const { show } = ticket;

    // 3. Status checks: Cancelled & Revoked
    if (ticket.status === "CANCELLED" || activation.status === "REVOKED") {
      throw new AppError("This ticket has been cancelled or revoked", 400, "CANCELLED_TICKET");
    }

    if (show.status === "CANCELLED") {
      throw new AppError("This movie screening session was cancelled", 400, "CANCELLED_TICKET");
    }

    // 4. Duplicate Activation Prevention (Ticket cannot be activated twice)
    if (ticket.status === "USED" || activation.status === "ACTIVE" || ticket.status === "ACTIVATED") {
      try {
        await prisma.securityAuditLog.create({
          data: {
            eventType: "QR_ACTIVATION_DENIED",
            severity: "MEDIUM",
            userId: userId || null,
            actorEmail: params.userEmail || null,
            actorRole: userRole || null,
            theatreId: show.theatreId,
            showId: show.id,
            activationId: activation.id,
            ticketId: ticket.id,
            ipAddress: clientIp || null,
            userAgent: userAgent || null,
            actionSummary: `Duplicate ticket activation rejected for ticket ${ticket.ticketNumber}`,
            isThreat: false,
          },
        });
      } catch (logErr) {
        // Non-fatal
      }
      throw new AppError(
        "This ticket has already been activated/admitted and cannot be activated twice.",
        409,
        "ALREADY_ACTIVATED"
      );
    }

    // 5. Expiration check
    const showEnded = new Date(show.endTime).getTime() + 60 * 60000 < now.getTime();
    const activationExpired = activation.status === "EXPIRED" || (activation.expiresAt && now.getTime() > new Date(activation.expiresAt).getTime());
    if (showEnded || activationExpired) {
      if (activation.status !== "EXPIRED") {
        await prisma.activation.update({
          where: { id: activation.id },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }
      throw new AppError("This screening session and ticket have expired", 400, "EXPIRED_TICKET");
    }

    // 6. Tenant / Theatre Isolation Enforcement
    if (userTheatreId && userRole !== "ADMIN" && show.theatreId !== userTheatreId) {
      try {
        await prisma.securityAuditLog.create({
          data: {
            eventType: "ROLE_ACCESS_DENIED",
            severity: "HIGH",
            userId: userId || null,
            actorEmail: params.userEmail || null,
            actorRole: userRole || null,
            theatreId: userTheatreId,
            ipAddress: clientIp || null,
            userAgent: userAgent || null,
            actionSummary: `Cross-theatre ticket verification denied: Ticket belongs to theatre "${show.theatre.name}" (${show.theatre.id})`,
            isThreat: true,
          },
        });
      } catch (logErr) {
        // Non-fatal
      }

      throw new AppError(
        `Unauthorized theatre access: Ticket is registered for "${show.theatre.name}", not your authorized venue.`,
        403,
        "UNAUTHORIZED_THEATRE"
      );
    }

    // 7. Atomic Transition to ACTIVE with session generation
    const expiresAt = activation.expiresAt || new Date(new Date(show.endTime).getTime() + 30 * 60000);
    const updatedActivation = await prisma.$transaction(async (tx) => {
      const act = await tx.activation.update({
        where: { id: activation.id },
        data: {
          status: "ACTIVE",
          activatedAt: now,
          expiresAt,
          deviceFingerprint: deviceFingerprint || activation.deviceFingerprint || "mobile-client",
          ipAddress: clientIp || activation.ipAddress,
        },
        include: {
          ticket: {
            include: {
              show: {
                include: {
                  movie: true,
                  theatre: true,
                  screen: true,
                },
              },
            },
          },
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "ACTIVATED" },
      });

      return act;
    });

    // 8. Generate Unique Protected Session Identifier
    const sessionId = `SES-MOB-${show.theatre.code}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // 9. Record Verification & Audit Logs
    try {
      if (userId) {
        await prisma.verification.create({
          data: {
            activationId: updatedActivation.id,
            theatreId: show.theatreId,
            showId: show.id,
            staffId: userId,
            result: "VERIFIED",
            reason: "Real QR Ticket Admission Verified",
            scannedCode: token.slice(0, 32),
          },
        });
      }

      await prisma.protectionEvent.create({
        data: {
          activationId: updatedActivation.id,
          theatreId: show.theatreId,
          showId: show.id,
          eventType: "SESSION_STARTED",
          metadata: JSON.stringify({
            sessionId,
            source: "MOBILE_APP",
            deviceFingerprint: deviceFingerprint || "mobile-client",
          }),
          ipAddress: clientIp,
          userAgent,
        },
      });

      await prisma.securityAuditLog.create({
        data: {
          eventType: "STAFF_VERIFICATION",
          severity: "INFO",
          userId: userId || null,
          actorEmail: params.userEmail || null,
          actorRole: userRole || null,
          theatreId: show.theatreId,
          showId: show.id,
          activationId: updatedActivation.id,
          ticketId: ticket.id,
          ipAddress: clientIp || null,
          userAgent: userAgent || null,
          actionSummary: `Real ticket QR verified for ${show.movie.title} at ${show.theatre.name}`,
          isThreat: false,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log non-fatal error:", auditErr);
    }

    return {
      sessionId,
      activationId: updatedActivation.id,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      seatNumber: ticket.seatNumber,
      protectionStatus: "ACTIVE",
      movie: {
        id: show.movie.id,
        title: show.movie.title,
        durationMinutes: show.movie.durationMinutes,
        language: show.movie.language,
        rating: show.movie.rating,
      },
      theatre: {
        id: show.theatre.id,
        name: show.theatre.name,
        code: show.theatre.code,
        location: show.theatre.location,
      },
      screen: {
        id: show.screen.id,
        name: show.screen.name,
        screenNumber: show.screen.screenNumber,
        capacity: show.screen.capacity,
      },
      show: {
        id: show.id,
        startTime: show.startTime.toISOString(),
        endTime: show.endTime.toISOString(),
        status: show.status,
      },
      activatedAt: (updatedActivation.activatedAt || now).toISOString(),
      expiresAt: updatedActivation.expiresAt ? updatedActivation.expiresAt.toISOString() : null,
      verifiedAt: now.toISOString(),
      staffName: userName || "Mobile Operator",
    };
  }

  /**
   * Generates or fetches secure QR token for an existing ticket
   */
  public static async getSecureTicketQr(ticketIdOrNumber: string): Promise<{
    ticketId: string;
    ticketNumber: string;
    seatNumber: string;
    qrToken: string;
    movieTitle: string;
    theatreName: string;
  }> {
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [{ id: ticketIdOrNumber }, { ticketNumber: ticketIdOrNumber }],
      },
      include: {
        activation: true,
        show: {
          include: { movie: true, theatre: true },
        },
      },
    });

    if (!ticket) {
      throw new AppError("Ticket not found", 404, "TICKET_NOT_FOUND");
    }

    let activationCode = ticket.activation?.activationCode;
    if (!activationCode) {
      const newActivation = await prisma.activation.create({
        data: {
          ticketId: ticket.id,
          activationCode: crypto.randomBytes(24).toString("hex"),
          status: "PENDING",
        },
      });
      activationCode = newActivation.activationCode;
    }

    const qrToken = this.generateSecureQrToken(activationCode);

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      seatNumber: ticket.seatNumber,
      qrToken,
      movieTitle: ticket.show.movie.title,
      theatreName: ticket.show.theatre.name,
    };
  }

  /**
   * Retrieve Protected Screening Session by session ID / activation ID with tenant isolation
   */
  public static async getProtectedSession(params: {
    sessionId: string;
    userId: string;
    userRole?: string;
    userTheatreId?: string | null;
  }): Promise<MobileSessionData> {
    const { sessionId, userRole, userTheatreId } = params;

    if (!sessionId) {
      throw new AppError("sessionId is required", 400, "MISSING_SESSION_ID");
    }

    const event = await prisma.protectionEvent.findFirst({
      where: {
        OR: [
          { metadata: { contains: sessionId } },
          { activationId: sessionId },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        activation: {
          include: {
            ticket: {
              include: {
                show: {
                  include: {
                    movie: true,
                    theatre: true,
                    screen: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let activation: any = event?.activation;
    if (!activation) {
      activation = await prisma.activation.findFirst({
        where: {
          OR: [{ id: sessionId }, { activationCode: sessionId }],
        },
        include: {
          ticket: {
            include: {
              show: {
                include: {
                  movie: true,
                  theatre: true,
                  screen: true,
                },
              },
            },
          },
        },
      });
    }

    if (!activation || !activation.ticket) {
      throw new AppError("Protected screening session not found", 404, "SESSION_NOT_FOUND");
    }

    const { ticket } = activation;
    const { show } = ticket;

    // Tenant / Theatre Isolation Check
    if (userTheatreId && userRole !== "ADMIN" && show.theatreId !== userTheatreId) {
      throw new AppError("Unauthorized access to foreign theatre session", 403, "UNAUTHORIZED_THEATRE");
    }

    const now = new Date();
    const isExpired = activation.expiresAt && now > new Date(activation.expiresAt);
    if (isExpired && activation.status !== "EXPIRED") {
      await prisma.activation.update({
        where: { id: activation.id },
        data: { status: "EXPIRED" },
      }).catch(() => {});
    }

    const status: "ACTIVE" | "EXPIRED" | "REVOKED" =
      activation.status === "REVOKED" ? "REVOKED" : isExpired ? "EXPIRED" : "ACTIVE";

    return {
      sessionId,
      activationId: activation.id,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      seatNumber: ticket.seatNumber,
      protectionStatus: status,
      movie: {
        id: show.movie.id,
        title: show.movie.title,
        durationMinutes: show.movie.durationMinutes,
        language: show.movie.language,
        rating: show.movie.rating,
      },
      theatre: {
        id: show.theatre.id,
        name: show.theatre.name,
        code: show.theatre.code,
        location: show.theatre.location,
      },
      screen: {
        id: show.screen.id,
        name: show.screen.name,
        screenNumber: show.screen.screenNumber,
        capacity: show.screen.capacity,
      },
      show: {
        id: show.id,
        startTime: show.startTime.toISOString(),
        endTime: show.endTime.toISOString(),
        status: show.status,
      },
      activatedAt: (activation.activatedAt || activation.createdAt).toISOString(),
      expiresAt: activation.expiresAt ? activation.expiresAt.toISOString() : null,
      verifiedAt: activation.updatedAt.toISOString(),
    };
  }

  /**
   * Submit Mobile Security Event to SOC, SecurityAuditLog, RealtimeThreats & Correlate with SOC Incidents
   */
  public static async submitMobileSecurityEvent(params: MobileSecurityEventParams): Promise<MobileSecurityEventResult> {
    const {
      eventType,
      severity = "MEDIUM",
      sessionId,
      theatreId,
      showId,
      movieId,
      activationId,
      payload = {},
      metadata = {},
      actorId,
      actorEmail,
      actorRole,
      clientIp,
      userAgent,
    } = params;

    if (!eventType || typeof eventType !== "string") {
      throw new AppError("Valid eventType string is required", 400, "MISSING_EVENT_TYPE");
    }

    const normalizedType = eventType.trim().toUpperCase();
    const eventId = `EVT-MOB-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const correlationId = `CORR-MOB-${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date();

    // Calculate baseline risk delta by signal type
    let baseRiskScore = 30;
    let warningRequired = true;
    let warningMessage = "⚠️ Recording or photography is not permitted during this screening.";

    if (normalizedType === "SCREEN_CAPTURE_SIGNAL") {
      baseRiskScore = 75;
      warningMessage = "⚠️ Screen recording or capture key combination detected. Recording is strictly prohibited.";
    } else if (normalizedType === "CAMERA_ACTIVITY") {
      baseRiskScore = 65;
      warningMessage = "⚠️ Camera state change detected. Video recording is forbidden during screening.";
    } else if (normalizedType === "FULLSCREEN_EXIT") {
      baseRiskScore = 40;
      warningMessage = "⚠️ Fullscreen viewing mode was exited during protected screening.";
    } else if (normalizedType === "SCREEN_VISIBILITY_CHANGE") {
      baseRiskScore = 35;
      warningMessage = "⚠️ Screen focus was lost or app sent to background.";
    } else if (normalizedType === "SUSPICIOUS_ACTIVITY") {
      baseRiskScore = 50;
      warningMessage = "⚠️ Suspicious application switching detected.";
    } else {
      baseRiskScore = 25;
      warningRequired = false;
    }

    // Map severity to Prisma enum
    const mappedSeverity: IncidentSeverity =
      severity === "CRITICAL"
        ? IncidentSeverity.CRITICAL
        : severity === "HIGH"
        ? IncidentSeverity.HIGH
        : severity === "LOW"
        ? IncidentSeverity.LOW
        : baseRiskScore >= 70
        ? IncidentSeverity.HIGH
        : IncidentSeverity.MEDIUM;

    // Filter and sanitize payload (ensure zero secrets / tokens in logs)
    const sanitizedData = {
      ...metadata,
      ...payload,
      sessionId: sessionId || "UNKNOWN",
      source: "MOBILE_APP",
      signalType: normalizedType,
      riskScore: baseRiskScore,
      submittedAt: now.toISOString(),
    };
    delete (sanitizedData as any).password;
    delete (sanitizedData as any).token;
    delete (sanitizedData as any).secret;

    const metadataStr = JSON.stringify(sanitizedData);

    // 1. Ingest into RealtimeThreatEvent
    try {
      await prisma.realtimeThreatEvent.create({
        data: {
          eventId,
          correlationId,
          eventType: normalizedType,
          source: "MOBILE_SECURITY_AGENT",
          severity: mappedSeverity,
          theatreId: theatreId || null,
          showId: showId || null,
          movieId: movieId || null,
          activationId: activationId || null,
          metadata: metadataStr,
        },
      });
    } catch (realtimeErr) {
      console.warn("RealtimeThreatEvent ingestion warning:", realtimeErr);
    }

    // 2. Ingest into SecurityAuditLog
    try {
      await prisma.securityAuditLog.create({
        data: {
          eventType: (SecurityEventType as any)[normalizedType] || SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: mappedSeverity as any,
          userId: actorId || null,
          actorEmail: actorEmail || null,
          actorRole: actorRole || null,
          theatreId: theatreId || null,
          showId: showId || null,
          activationId: activationId || null,
          ipAddress: clientIp || null,
          userAgent: userAgent || null,
          actionSummary: `Mobile security signal [${normalizedType}] detected from session ${sessionId || "N/A"}`,
          metadata: metadataStr,
          isThreat: mappedSeverity === "HIGH" || mappedSeverity === "CRITICAL",
        },
      });
    } catch (auditErr) {
      console.warn("SecurityAuditLog ingestion warning:", auditErr);
    }

    // 3. Ingest ProtectionEvent
    if (activationId) {
      try {
        const protEventType: ProtectionEventType =
          normalizedType === "SCREEN_CAPTURE_SIGNAL"
            ? "SCREENSHOT_ATTEMPT_DETECTED"
            : normalizedType === "FULLSCREEN_EXIT"
            ? "FULLSCREEN_EXITED"
            : "SESSION_HEARTBEAT";

        await prisma.protectionEvent.create({
          data: {
            activationId,
            theatreId: theatreId || null,
            showId: showId || null,
            eventType: protEventType,
            metadata: metadataStr,
            ipAddress: clientIp || null,
            userAgent: userAgent || null,
          },
        });
      } catch (protErr) {
        // Non-fatal
      }
    }

    // 4. Correlate with Unified SOC Incident Management & Automated Case/Evidence Generation
    let correlatedIncidentId: string | undefined = undefined;
    if (baseRiskScore >= 60 || mappedSeverity === "HIGH" || mappedSeverity === "CRITICAL") {
      try {
        const incident = await SocIncidentManager.createIncident({
          title: `Mobile Anomaly Signal: ${normalizedType}`,
          description: `Detected mobile anti-piracy security signal [${normalizedType}] during screening session ${sessionId || "unbound"}.`,
          severity: mappedSeverity,
          source: IncidentSource.THREAT_ENGINE,
          theatreId,
          showId,
          movieId,
          riskScore: baseRiskScore,
          actorId,
          actorEmail,
          actorRole,
        });
        correlatedIncidentId = incident.id;

        // Auto-generate evidence package and correlate with InvestigationCase if high risk
        if (sessionId) {
          await AutomatedEvidenceService.processSuspiciousEvent({
            incidentId: incident.id,
            sessionId,
            theatreId,
            showId,
            movieId,
            activationId,
            signalType: normalizedType,
            riskScore: baseRiskScore,
            severity: mappedSeverity,
            correlationId,
            clientIp,
            userAgent,
            actorId,
            actorEmail,
            actorRole,
          }).catch((autoErr) => {
            console.warn("Automated evidence non-fatal notice:", autoErr);
          });
        }
      } catch (socErr) {
        console.warn("SOC correlation non-fatal notice:", socErr);
      }
    }

      return {
        eventId,
        correlationId,
        status: "INGESTED",
        riskScore: baseRiskScore,
        correlatedIncidentId,
        warningRequired,
        warningMessage,
        timestamp: now.toISOString(),
      };
    }
  }

export const mobileService = {
  startProtectedSession(deviceId: string, theatreId: string, userId?: string) {
    return {
      sessionId: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      deviceId,
      theatreId,
      userId,
      screenProtected: true,
      createdAt: new Date().toISOString(),
    };
  },
  recordTelemetry(params: { deviceId: string; theatreId: string; eventType: string; metadata?: any }) {
    return {
      recorded: true,
      eventId: `tel-${Date.now()}`,
      theatreId: params.theatreId,
      eventType: params.eventType,
      timestamp: new Date().toISOString(),
    };
  },
  MobileService,
};
