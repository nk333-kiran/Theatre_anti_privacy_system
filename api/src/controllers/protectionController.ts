import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma, ProtectionEventType, ActivationStatus } from "@antipiracy/database";
import {
  ApiResponse,
  ProtectionSessionInfo,
  ProtectionEventItem,
  ProtectionMonitoringStats,
  WatermarkPayload,
} from "../types";
import { AppError } from "../middleware/errorHandler";

// POST /api/protection/session/start - Initialize a protected viewing session
export const startProtectionSession = async (
  req: Request,
  res: Response<ApiResponse<ProtectionSessionInfo>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, deviceFingerprint } = req.body;

    if (!token) {
      throw new AppError("Activation token or Ticket ID is required", 400, "MISSING_TOKEN");
    }

    const cleanToken = String(token).trim();
    const now = new Date();

    // Lookup activation record
    const activation = await prisma.activation.findFirst({
      where: {
        OR: [
          { activationCode: cleanToken },
          { id: cleanToken },
          { ticket: { ticketNumber: cleanToken.toUpperCase() } },
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
      throw new AppError("Invalid or unrecognized activation token", 404, "INVALID_TOKEN");
    }

    const { ticket } = activation;
    const { show } = ticket;

    // Check validity
    if (ticket.status === "CANCELLED" || activation.status === "REVOKED") {
      throw new AppError("This activation session has been cancelled or revoked", 403, "SESSION_REVOKED");
    }

    if (activation.status === "EXPIRED" || (activation.expiresAt && now > new Date(activation.expiresAt))) {
      throw new AppError("This viewing protection session has expired", 403, "SESSION_EXPIRED");
    }

    // Generate unique session ID (non-PII)
    const sessionId = `SES-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const shortActivationId = `ACT-${activation.id.slice(0, 8).toUpperCase()}`;

    // Extract client headers for audit
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "web-player";

    // Record SESSION_STARTED in ProtectionEvent
    await prisma.protectionEvent.create({
      data: {
        activationId: activation.id,
        theatreId: show.theatreId,
        showId: show.id,
        eventType: "SESSION_STARTED",
        metadata: JSON.stringify({ sessionId, deviceFingerprint: deviceFingerprint || "standard-browser" }),
        ipAddress: clientIp,
        userAgent,
      },
    });

    const watermark: WatermarkPayload = {
      shortActivationId,
      sessionId,
      theatreCode: show.theatre.code,
      theatreName: show.theatre.name,
      screenName: show.screen.name,
      seatNumber: ticket.seatNumber,
      movieTitle: show.movie.title,
      timestamp: now.toISOString(),
    };

    const sessionInfo: ProtectionSessionInfo = {
      sessionId,
      activationId: activation.id,
      ticketNumber: ticket.ticketNumber,
      seatNumber: ticket.seatNumber,
      status: activation.status as "ACTIVE" | "EXPIRED" | "REVOKED",
      theatreName: show.theatre.name,
      theatreCode: show.theatre.code,
      screenName: show.screen.name,
      movieTitle: show.movie.title,
      startTime: show.startTime.toISOString(),
      endTime: show.endTime.toISOString(),
      activatedAt: activation.activatedAt?.toISOString() || null,
      expiresAt: activation.expiresAt?.toISOString() || null,
      watermark,
    };

    res.status(200).json({
      success: true,
      message: "Protection session established successfully",
      data: sessionInfo,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/protection/heartbeat - Periodic session verification ping
export const sendSessionHeartbeat = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { activationId, sessionId } = req.body;

    if (!activationId) {
      throw new AppError("activationId is required for heartbeat", 400, "MISSING_ACTIVATION_ID");
    }

    const now = new Date();
    const activation = await prisma.activation.findUnique({
      where: { id: activationId },
      include: {
        ticket: {
          include: { show: true },
        },
      },
    });

    // Check if activation was revoked or expired
    if (!activation || activation.status !== "ACTIVE" || activation.ticket.status === "CANCELLED") {
      res.status(200).json({
        success: false,
        message: "Protection session is no longer active",
        data: {
          active: false,
          status: activation ? activation.status : "EXPIRED",
          reason: activation?.status === "REVOKED" ? "REVOKED" : "EXPIRED",
        },
      });
      return;
    }

    // Check expiry timestamp
    if (activation.expiresAt && now > new Date(activation.expiresAt)) {
      // Auto-expire
      await prisma.activation.update({
        where: { id: activation.id },
        data: { status: "EXPIRED" },
      });

      await prisma.protectionEvent.create({
        data: {
          activationId: activation.id,
          theatreId: activation.ticket.show.theatreId,
          showId: activation.ticket.showId,
          eventType: "SESSION_EXPIRED",
          metadata: JSON.stringify({ reason: "Expiry timestamp reached during heartbeat" }),
        },
      });

      res.status(200).json({
        success: false,
        message: "Protection session has reached its expiry timestamp",
        data: {
          active: false,
          status: "EXPIRED",
          reason: "EXPIRED",
        },
      });
      return;
    }

    // Log periodic heartbeat (rate-limited log: create event periodically)
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    await prisma.protectionEvent.create({
      data: {
        activationId: activation.id,
        theatreId: activation.ticket.show.theatreId,
        showId: activation.ticket.showId,
        eventType: "SESSION_HEARTBEAT",
        metadata: JSON.stringify({ sessionId: sessionId || "active-stream", timestamp: now.toISOString() }),
        ipAddress: clientIp,
      },
    });

    res.status(200).json({
      success: true,
      message: "Session heartbeat verified",
      data: {
        active: true,
        status: "ACTIVE",
        currentTimestamp: now.toISOString(),
        expiresAt: activation.expiresAt?.toISOString() || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/protection/event - Log player events (fullscreen, screenshot attempt, pause, stop)
export const recordProtectionEvent = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { activationId, eventType, metadata } = req.body;

    if (!activationId || !eventType) {
      throw new AppError("activationId and valid eventType are required", 400, "MISSING_PARAMETERS");
    }

    const activation = await prisma.activation.findUnique({
      where: { id: activationId },
      include: { ticket: { include: { show: true } } },
    });

    if (!activation) {
      throw new AppError("Activation record not found", 404, "ACTIVATION_NOT_FOUND");
    }

    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "web-player";

    const createdEvent = await prisma.protectionEvent.create({
      data: {
        activationId,
        theatreId: activation.ticket?.show?.theatreId || null,
        showId: activation.ticket?.showId || null,
        eventType: eventType as ProtectionEventType,
        metadata: metadata ? String(metadata) : null,
        ipAddress: clientIp,
        userAgent,
      },
    });

    res.status(201).json({
      success: true,
      message: "Protection event logged successfully",
      data: createdEvent,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/protection/session/revoke - Revoke a session immediately (Admin only)
export const revokeProtectionSession = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { activationId, reason } = req.body;

    if (!activationId) {
      throw new AppError("activationId is required to revoke session", 400, "MISSING_ACTIVATION_ID");
    }

    const activation = await prisma.activation.findUnique({
      where: { id: activationId },
      include: { ticket: { include: { show: true } } },
    });

    if (!activation) {
      throw new AppError("Activation session not found", 404, "ACTIVATION_NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activation.update({
        where: { id: activationId },
        data: { status: "REVOKED" },
      });

      await tx.protectionEvent.create({
        data: {
          activationId: act.id,
          theatreId: activation.ticket?.show?.theatreId || null,
          showId: activation.ticket?.showId || null,
          eventType: "SESSION_REVOKED",
          metadata: JSON.stringify({ reason: reason || "Manual admin security intervention" }),
        },
      });

      return act;
    });

    res.status(200).json({
      success: true,
      message: "Session revoked successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/protection/sessions - List viewing protection sessions
export const getProtectionSessions = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, theatreId, limit } = req.query;

    const activations = await prisma.activation.findMany({
      where: {
        status: status ? (String(status) as ActivationStatus) : undefined,
        ticket: theatreId
          ? { show: { theatreId: String(theatreId) } }
          : undefined,
      },
      orderBy: { updatedAt: "desc" },
      take: limit ? Number(limit) : 50,
      include: {
        ticket: {
          include: {
            show: {
              include: {
                movie: { select: { title: true, durationMinutes: true } },
                theatre: { select: { name: true, code: true } },
                screen: { select: { name: true } },
              },
            },
          },
        },
        _count: {
          select: {
            protectionEvents: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: activations,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/protection/events - List recent protection event logs
export const getProtectionEvents = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventType, theatreId, showId, limit } = req.query;

    const events = await prisma.protectionEvent.findMany({
      where: {
        eventType: eventType ? (String(eventType) as ProtectionEventType) : undefined,
        theatreId: theatreId ? String(theatreId) : undefined,
        showId: showId ? String(showId) : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: limit ? Number(limit) : 60,
      include: {
        theatre: {
          select: { name: true, code: true },
        },
        show: {
          include: {
            movie: { select: { title: true } },
            screen: { select: { name: true } },
          },
        },
        activation: {
          include: {
            ticket: {
              select: { ticketNumber: true, seatNumber: true },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/protection/stats - Aggregate session & security threat counts
export const getProtectionStats = async (
  _req: Request,
  res: Response<ApiResponse<ProtectionMonitoringStats>>,
  next: NextFunction
): Promise<void> => {
  try {
    const [activeCount, expiredCount, revokedCount, totalEvents, threatsCount] = await Promise.all([
      prisma.activation.count({ where: { status: "ACTIVE" } }),
      prisma.activation.count({ where: { status: "EXPIRED" } }),
      prisma.activation.count({ where: { status: "REVOKED" } }),
      prisma.protectionEvent.count(),
      prisma.protectionEvent.count({ where: { eventType: "SCREENSHOT_ATTEMPT_DETECTED" } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeSessions: activeCount,
        expiredSessions: expiredCount,
        revokedSessions: revokedCount,
        totalEvents,
        securityThreats: threatsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
