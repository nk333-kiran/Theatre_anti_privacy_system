import { Response, NextFunction } from "express";
import { prisma, VerificationResult } from "@antipiracy/database";
import { AuthenticatedRequest, ApiResponse, VerificationItem, VerificationStats } from "../types";
import { AppError } from "../middleware/errorHandler";

// Helper to sanitize & extract token from raw scan (supports raw token or full activation URL)
const extractToken = (rawInput: string): string => {
  if (!rawInput) return "";
  let input = String(rawInput).trim();

  // If scanned content is a URL like "http://.../activate?code=xyz"
  if (input.includes("code=")) {
    const match = input.match(/[?&]code=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
  }

  // If URL path like "/activate/xyz"
  if (input.includes("/activate/")) {
    const parts = input.split("/activate/");
    if (parts[1]) return parts[1].split("?")[0].trim();
  }

  return input;
};

// Ensure staff user exists in database for relational FK integrity
const ensureStaffUser = async (user: { id: string; email: string; name: string; role: any }) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (existing) return existing.id;

    // Create staff user if needed for audit log FK
    const created = await prisma.user.create({
      data: {
        id: user.id.startsWith("staff-") || user.id.startsWith("admin-") ? undefined : user.id,
        email: user.email,
        name: user.name,
        role: user.role || "THEATRE_STAFF",
        passwordHash: "demo-hash-protected",
      },
    });
    return created.id;
  } catch (err) {
    // If DB is offline or mock environment, fallback to staff id
    return user.id;
  }
};

// POST /api/verifications/verify - Security Staff QR Scan Verification
export const verifySecurityEntry = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, theatreId: requestedTheatreId } = req.body;
    const staffUser = req.user;

    if (!staffUser) {
      throw new AppError("Security staff authorization required", 401, "UNAUTHORIZED");
    }

    if (!code) {
      throw new AppError("QR token payload is required", 400, "MISSING_TOKEN");
    }

    const token = extractToken(code);
    const dbStaffId = await ensureStaffUser(staffUser);
    const now = new Date();

    // 1. Find activation record with complete relationship hierarchy
    const activation = await prisma.activation.findUnique({
      where: { activationCode: token },
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

    // Case 1: Invalid / Unrecognized activation token
    if (!activation || !activation.ticket) {
      try {
        await prisma.verification.create({
          data: {
            staffId: dbStaffId,
            result: "DENIED",
            reason: "Invalid activation",
            scannedCode: token.slice(0, 32),
          },
        });
      } catch (logErr) {
        console.warn("Could not log invalid verification attempt:", logErr);
      }

      res.status(200).json({
        success: false,
        message: "ENTRY DENIED ✕",
        data: {
          result: "DENIED",
          reason: "Invalid activation",
          description: "Unrecognized QR code or cryptographic token signature mismatch.",
          scannedToken: token.slice(0, 8) + "...",
          timestamp: now.toISOString(),
          staffName: staffUser.name,
        },
      });
      return;
    }

    const { ticket } = activation;
    const { show } = ticket;

    // Case 2: Ticket was cancelled
    if (ticket.status === "CANCELLED") {
      await prisma.verification.create({
        data: {
          activationId: activation.id,
          theatreId: show.theatreId,
          showId: show.id,
          staffId: dbStaffId,
          result: "DENIED",
          reason: "Cancelled",
          scannedCode: token.slice(0, 32),
        },
      });

      res.status(200).json({
        success: false,
        message: "ENTRY DENIED ✕",
        data: {
          result: "DENIED",
          reason: "Cancelled",
          description: "This ticket has been cancelled by administration.",
          activationId: activation.id,
          ticketNumber: ticket.ticketNumber,
          movieTitle: show.movie.title,
          theatreName: show.theatre.name,
          seatNumber: ticket.seatNumber,
          timestamp: now.toISOString(),
          staffName: staffUser.name,
        },
      });
      return;
    }

    // Case 3: Activation revoked
    if (activation.status === "REVOKED") {
      await prisma.verification.create({
        data: {
          activationId: activation.id,
          theatreId: show.theatreId,
          showId: show.id,
          staffId: dbStaffId,
          result: "DENIED",
          reason: "Already revoked",
          scannedCode: token.slice(0, 32),
        },
      });

      res.status(200).json({
        success: false,
        message: "ENTRY DENIED ✕",
        data: {
          result: "DENIED",
          reason: "Already revoked",
          description: "This security activation token has been revoked.",
          activationId: activation.id,
          ticketNumber: ticket.ticketNumber,
          movieTitle: show.movie.title,
          theatreName: show.theatre.name,
          seatNumber: ticket.seatNumber,
          timestamp: now.toISOString(),
          staffName: staffUser.name,
        },
      });
      return;
    }

    // Case 4: Activation is not ACTIVE yet (e.g. attendee has not opened /activate portal)
    if (activation.status !== "ACTIVE") {
      await prisma.verification.create({
        data: {
          activationId: activation.id,
          theatreId: show.theatreId,
          showId: show.id,
          staffId: dbStaffId,
          result: "DENIED",
          reason: "Invalid activation",
          scannedCode: token.slice(0, 32),
        },
      });

      res.status(200).json({
        success: false,
        message: "ENTRY DENIED ✕",
        data: {
          result: "DENIED",
          reason: "Invalid activation",
          description: "Ticket protection is PENDING. Attendee must activate protection before checkpoint verification.",
          activationId: activation.id,
          ticketNumber: ticket.ticketNumber,
          movieTitle: show.movie.title,
          theatreName: show.theatre.name,
          seatNumber: ticket.seatNumber,
          timestamp: now.toISOString(),
          staffName: staffUser.name,
        },
      });
      return;
    }

    // Case 5: Activation has expired (now > expiresAt)
    if (activation.expiresAt && now.getTime() > new Date(activation.expiresAt).getTime()) {
      await prisma.$transaction([
        prisma.activation.update({
          where: { id: activation.id },
          data: { status: "EXPIRED" },
        }),
        prisma.verification.create({
          data: {
            activationId: activation.id,
            theatreId: show.theatreId,
            showId: show.id,
            staffId: dbStaffId,
            result: "DENIED",
            reason: "Expired",
            scannedCode: token.slice(0, 32),
          },
        }),
      ]);

      res.status(200).json({
        success: false,
        message: "ENTRY DENIED ✕",
        data: {
          result: "DENIED",
          reason: "Expired",
          description: "The security activation window for this screening session has expired.",
          activationId: activation.id,
          ticketNumber: ticket.ticketNumber,
          movieTitle: show.movie.title,
          theatreName: show.theatre.name,
          seatNumber: ticket.seatNumber,
          timestamp: now.toISOString(),
          staffName: staffUser.name,
        },
      });
      return;
    }

    // Case 6: Show cancelled
    if (show.status === "CANCELLED") {
      await prisma.verification.create({
        data: {
          activationId: activation.id,
          theatreId: show.theatreId,
          showId: show.id,
          staffId: dbStaffId,
          result: "DENIED",
          reason: "Cancelled",
          scannedCode: token.slice(0, 32),
        },
      });

      res.status(200).json({
        success: false,
        message: "ENTRY DENIED ✕",
        data: {
          result: "DENIED",
          reason: "Cancelled",
          description: "The scheduled movie screening session has been cancelled.",
          activationId: activation.id,
          ticketNumber: ticket.ticketNumber,
          movieTitle: show.movie.title,
          theatreName: show.theatre.name,
          seatNumber: ticket.seatNumber,
          timestamp: now.toISOString(),
          staffName: staffUser.name,
        },
      });
      return;
    }

    // Case 7: Theatre checkpoint mismatch (if staff or scanner is locked to a specific venue)
    const effectiveTheatreId = requestedTheatreId || staffUser.theatreId;
    if (effectiveTheatreId && effectiveTheatreId !== show.theatreId) {
      await prisma.verification.create({
        data: {
          activationId: activation.id,
          theatreId: show.theatreId,
          showId: show.id,
          staffId: dbStaffId,
          result: "DENIED",
          reason: "Invalid activation",
          scannedCode: token.slice(0, 32),
        },
      });

      res.status(200).json({
        success: false,
        message: "ENTRY DENIED ✕",
        data: {
          result: "DENIED",
          reason: "Invalid activation",
          description: `Ticket is assigned to "${show.theatre.name}", not this checkpoint location.`,
          activationId: activation.id,
          ticketNumber: ticket.ticketNumber,
          movieTitle: show.movie.title,
          theatreName: show.theatre.name,
          seatNumber: ticket.seatNumber,
          timestamp: now.toISOString(),
          staffName: staffUser.name,
        },
      });
      return;
    }

    // SUCCESS: Record successful verification attempt in PostgreSQL
    const verificationRecord = await prisma.$transaction(async (tx) => {
      const v = await tx.verification.create({
        data: {
          activationId: activation.id,
          theatreId: show.theatreId,
          showId: show.id,
          staffId: dbStaffId,
          result: "VERIFIED",
          reason: "Valid active admission",
          scannedCode: token.slice(0, 32),
        },
      });

      // Optionally mark ticket as USED
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "USED" },
      });

      return v;
    });

    res.status(200).json({
      success: true,
      message: "ENTRY VERIFIED ✓",
      data: {
        result: "VERIFIED",
        verificationId: verificationRecord.id,
        activationId: activation.id,
        ticketNumber: ticket.ticketNumber,
        seatNumber: ticket.seatNumber,
        movieTitle: show.movie.title,
        theatreName: show.theatre.name,
        screenName: show.screen.name,
        startTime: show.startTime,
        endTime: show.endTime,
        activatedAt: activation.activatedAt,
        expiresAt: activation.expiresAt,
        verifiedAt: verificationRecord.createdAt,
        staffName: staffUser.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/verifications - Get recent verification audit log
export const getVerifications = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { theatreId, showId, result, search, limit } = req.query;

    const verifications = await prisma.verification.findMany({
      where: {
        theatreId: theatreId ? String(theatreId) : undefined,
        showId: showId ? String(showId) : undefined,
        result: result ? (String(result) as VerificationResult) : undefined,
        OR: search
          ? [
              { activation: { ticket: { ticketNumber: { contains: String(search), mode: "insensitive" } } } },
              { activation: { ticket: { seatNumber: { contains: String(search), mode: "insensitive" } } } },
              { show: { movie: { title: { contains: String(search), mode: "insensitive" } } } },
              { reason: { contains: String(search), mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: limit ? Number(limit) : 50,
      include: {
        staff: {
          select: { id: true, name: true, email: true, role: true },
        },
        theatre: {
          select: { id: true, name: true, code: true, location: true },
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
              select: { ticketNumber: true, seatNumber: true, status: true },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: verifications,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/verifications/stats - Aggregate verification metrics
export const getVerificationStats = async (
  _req: AuthenticatedRequest,
  res: Response<ApiResponse<VerificationStats>>,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalScans, verifiedCount, deniedCount, activeTheatres] = await Promise.all([
      prisma.verification.count(),
      prisma.verification.count({ where: { result: "VERIFIED" } }),
      prisma.verification.count({ where: { result: "DENIED" } }),
      prisma.theatre.count(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalScans,
        verifiedCount,
        deniedCount,
        activeTheatres,
      },
    });
  } catch (error) {
    next(error);
  }
};
