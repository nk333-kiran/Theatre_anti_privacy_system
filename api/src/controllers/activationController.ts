import { Request, Response, NextFunction } from "express";
import { prisma } from "@antipiracy/database";
import { ApiResponse } from "../types";
import { AppError } from "../middleware/errorHandler";

// GET /api/activations/verify/:code - Validate token and fetch ticket overview
export const verifyActivationToken = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.params;

    if (!code) {
      throw new AppError("Activation code is required", 400, "MISSING_TOKEN");
    }

    const activation = await prisma.activation.findUnique({
      where: { activationCode: code },
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
      throw new AppError("Invalid or unrecognized QR activation code", 404, "INVALID_TOKEN");
    }

    const { ticket } = activation;
    const { show } = ticket;
    const now = new Date();

    // Check if ticket was cancelled
    if (ticket.status === "CANCELLED" || activation.status === "REVOKED") {
      throw new AppError("This ticket has been cancelled or revoked", 400, "TICKET_CANCELLED");
    }

    // Check if show was cancelled
    if (show.status === "CANCELLED") {
      throw new AppError("This screening session was cancelled", 400, "SHOW_CANCELLED");
    }

    // Check if show has already ended
    const showEnded = new Date(show.endTime).getTime() + 60 * 60000 < now.getTime();
    if (showEnded) {
      throw new AppError("This screening has concluded and the ticket is expired", 400, "SHOW_EXPIRED");
    }

    res.status(200).json({
      success: true,
      message: "Ticket token verified successfully",
      data: {
        activationId: activation.id,
        activationStatus: activation.status,
        activatedAt: activation.activatedAt,
        expiresAt: activation.expiresAt,
        ticketId: ticket.ticketNumber,
        seatNumber: ticket.seatNumber,
        ticketStatus: ticket.status,
        movie: {
          title: show.movie.title,
          durationMinutes: show.movie.durationMinutes,
          rating: show.movie.rating,
          language: show.movie.language,
        },
        theatre: {
          name: show.theatre.name,
          location: show.theatre.location,
          code: show.theatre.code,
        },
        screen: {
          name: show.screen.name,
          screenNumber: show.screen.screenNumber,
        },
        show: {
          startTime: show.startTime,
          endTime: show.endTime,
          status: show.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/activations/activate - Execute ticket activation with duplicate protection
export const activateTicket = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, deviceFingerprint } = req.body;

    if (!code) {
      throw new AppError("Activation code is required", 400, "MISSING_TOKEN");
    }

    const activation = await prisma.activation.findUnique({
      where: { activationCode: code },
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
      throw new AppError("Invalid or unrecognized QR activation code", 404, "INVALID_TOKEN");
    }

    const { ticket } = activation;
    const { show } = ticket;
    const now = new Date();

    // 1. Check ticket & show cancellation
    if (ticket.status === "CANCELLED" || activation.status === "REVOKED") {
      throw new AppError("This ticket has been cancelled or revoked", 400, "TICKET_CANCELLED");
    }
    if (show.status === "CANCELLED") {
      throw new AppError("This screening was cancelled", 400, "SHOW_CANCELLED");
    }

    // 2. Check if show is already in the past
    if (new Date(show.endTime).getTime() + 60 * 60000 < now.getTime()) {
      throw new AppError("Cannot activate ticket for an expired screening", 400, "SHOW_EXPIRED");
    }

    // 3. Duplicate Activation Prevention
    if (activation.status === "ACTIVE") {
      res.status(200).json({
        success: true,
        message: "THEATRE PROTECTION ACTIVE",
        data: {
          alreadyActivated: true,
          activationId: activation.id,
          status: "ACTIVE",
          activatedAt: activation.activatedAt,
          expiresAt: activation.expiresAt,
          ticketNumber: ticket.ticketNumber,
          seatNumber: ticket.seatNumber,
          movieTitle: show.movie.title,
          theatreName: show.theatre.name,
          screenName: show.screen.name,
          startTime: show.startTime,
          endTime: show.endTime,
        },
      });
      return;
    }

    // 4. Calculate appropriate expiry time (show.endTime + 30 mins)
    const expiresAt = new Date(new Date(show.endTime).getTime() + 30 * 60000);
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const fingerprint = deviceFingerprint || (req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 100) : "mobile-web-client");

    // 5. Atomic activation in PostgreSQL
    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activation.update({
        where: { id: activation.id },
        data: {
          status: "ACTIVE",
          activatedAt: now,
          expiresAt,
          deviceFingerprint: fingerprint,
          ipAddress: clientIp,
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "ACTIVATED" },
      });

      return act;
    });

    res.status(200).json({
      success: true,
      message: "THEATRE PROTECTION ACTIVE",
      data: {
        alreadyActivated: false,
        activationId: updated.id,
        status: "ACTIVE",
        activatedAt: updated.activatedAt,
        expiresAt: updated.expiresAt,
        ticketNumber: ticket.ticketNumber,
        seatNumber: ticket.seatNumber,
        movieTitle: show.movie.title,
        theatreName: show.theatre.name,
        screenName: show.screen.name,
        startTime: show.startTime,
        endTime: show.endTime,
      },
    });
  } catch (error) {
    next(error);
  }
};
