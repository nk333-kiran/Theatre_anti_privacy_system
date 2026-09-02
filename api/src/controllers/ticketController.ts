import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma, TicketStatus } from "@antipiracy/database";
import { ApiResponse } from "../types";
import { AppError } from "../middleware/errorHandler";

// GET /api/tickets - List tickets with relations and filters
export const getTickets = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { showId, theatreId, status, search } = req.query;

    const tickets = await prisma.ticket.findMany({
      where: {
        showId: showId ? String(showId) : undefined,
        status: status ? (String(status) as TicketStatus) : undefined,
        show: theatreId
          ? { theatreId: String(theatreId) }
          : undefined,
        OR: search
          ? [
              { ticketNumber: { contains: String(search), mode: "insensitive" } },
              { seatNumber: { contains: String(search), mode: "insensitive" } },
              { show: { movie: { title: { contains: String(search), mode: "insensitive" } } } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      include: {
        activation: true,
        show: {
          include: {
            movie: true,
            theatre: true,
            screen: true,
          },
        },
      },
      take: 100,
    });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tickets/:id - Get single ticket details
export const getTicketById = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        activation: true,
        show: {
          include: {
            movie: true,
            theatre: true,
            screen: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new AppError("Ticket not found", 404, "TICKET_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/tickets - Create one or multiple tickets for a show
export const createTickets = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { showId, seats, seatNumber, price } = req.body;

    if (!showId) {
      throw new AppError("showId is required", 400, "VALIDATION_ERROR");
    }

    // Verify Show exists and is not cancelled
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: { screen: true, movie: true, theatre: true },
    });

    if (!show) {
      throw new AppError("Referenced show not found", 404, "SHOW_NOT_FOUND");
    }

    if (show.status === "CANCELLED") {
      throw new AppError("Cannot issue tickets for a cancelled show", 400, "SHOW_CANCELLED");
    }

    // Determine list of seats to generate
    let seatList: string[] = [];
    if (Array.isArray(seats) && seats.length > 0) {
      seatList = seats.map((s: string) => String(s).trim().toUpperCase());
    } else if (seatNumber) {
      seatList = [String(seatNumber).trim().toUpperCase()];
    } else {
      throw new AppError("Please provide at least one seat number", 400, "MISSING_SEAT");
    }

    // Check for duplicate seat inputs in the same request
    const uniqueSeats = new Set(seatList);
    if (uniqueSeats.size !== seatList.length) {
      throw new AppError("Duplicate seats found in request", 400, "DUPLICATE_SEATS_IN_REQUEST");
    }

    // Check existing issued tickets for this show with these seat numbers
    const existingTickets = await prisma.ticket.findMany({
      where: {
        showId,
        seatNumber: { in: seatList },
        status: { not: "CANCELLED" },
      },
    });

    if (existingTickets.length > 0) {
      const taken = existingTickets.map((t) => t.seatNumber).join(", ");
      throw new AppError(
        `Seat(s) already booked or issued for this show: ${taken}`,
        409,
        "SEATS_ALREADY_ISSUED"
      );
    }

    const ticketPrice = price ? Number(price) : 15.0;

    // Create tickets with unique cryptographically random activation tokens
    const createdTickets = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const seat of seatList) {
        // Unique random ticket number
        const randSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
        const ticketNumber = `TCK-${Date.now().toString(36).toUpperCase()}-${randSuffix}`;

        // Cryptographically secure unguessable 256-bit activation token
        const activationToken = crypto.randomBytes(24).toString("hex");

        const ticket = await tx.ticket.create({
          data: {
            showId,
            ticketNumber,
            seatNumber: seat,
            price: ticketPrice,
            status: "ISSUED",
            activation: {
              create: {
                activationCode: activationToken,
                status: "PENDING",
              },
            },
          },
          include: {
            activation: true,
            show: {
              include: { movie: true, theatre: true, screen: true },
            },
          },
        });
        results.push(ticket);
      }
      return results;
    });

    res.status(201).json({
      success: true,
      message: `Successfully issued ${createdTickets.length} ticket(s)`,
      data: createdTickets,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tickets/:id/cancel - Cancel ticket and revoke activation
export const cancelTicket = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.ticket.findUnique({
      where: { id },
      include: { activation: true },
    });

    if (!existing) {
      throw new AppError("Ticket not found", 404, "TICKET_NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.activation) {
        await tx.activation.update({
          where: { id: existing.activation.id },
          data: { status: "REVOKED" },
        });
      }

      return tx.ticket.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { activation: true },
      });
    });

    res.status(200).json({
      success: true,
      message: "Ticket cancelled and activation revoked",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
