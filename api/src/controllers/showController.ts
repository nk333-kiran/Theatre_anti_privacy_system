import { Request, Response, NextFunction } from "express";
import { prisma, ShowStatus } from "@antipiracy/database";
import { ApiResponse } from "../types";
import { AppError } from "../middleware/errorHandler";

// Helper function to check schedule conflicts on a screen
async function findScheduleConflict(
  screenId: string,
  startTime: Date,
  endTime: Date,
  excludeShowId?: string
) {
  return prisma.show.findFirst({
    where: {
      screenId,
      status: { in: ["SCHEDULED", "ACTIVE"] },
      id: excludeShowId ? { not: excludeShowId } : undefined,
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
    include: {
      movie: { select: { title: true } },
      screen: { select: { name: true } },
    },
  });
}

// GET /api/shows - List shows with relations and optional filters
export const getShows = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { theatreId, screenId, movieId, status } = req.query;

    const shows = await prisma.show.findMany({
      where: {
        theatreId: theatreId ? String(theatreId) : undefined,
        screenId: screenId ? String(screenId) : undefined,
        movieId: movieId ? String(movieId) : undefined,
        status: status ? (String(status) as ShowStatus) : undefined,
      },
      orderBy: { startTime: "desc" },
      include: {
        movie: true,
        theatre: true,
        screen: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: shows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/shows/:id - Get single show details
export const getShowById = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const show = await prisma.show.findUnique({
      where: { id },
      include: {
        movie: true,
        theatre: true,
        screen: true,
        tickets: {
          include: { activation: true },
          take: 50,
        },
        _count: { select: { tickets: true } },
      },
    });

    if (!show) {
      throw new AppError("Show not found", 404, "SHOW_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: show,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/shows - Create show with validation & schedule conflict prevention
export const createShow = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { theatreId, screenId, movieId, startTime, endTime, status } = req.body;

    if (!theatreId || !screenId || !movieId || !startTime) {
      throw new AppError("theatreId, screenId, movieId, and startTime are required", 400, "VALIDATION_ERROR");
    }

    // 1. Verify Theatre exists
    const theatre = await prisma.theatre.findUnique({ where: { id: theatreId } });
    if (!theatre) {
      throw new AppError("Referenced theatre does not exist", 404, "THEATRE_NOT_FOUND");
    }

    // 2. Verify Screen exists and belongs to Theatre
    const screen = await prisma.screen.findUnique({ where: { id: screenId } });
    if (!screen) {
      throw new AppError("Referenced screen does not exist", 404, "SCREEN_NOT_FOUND");
    }
    if (screen.theatreId !== theatreId) {
      throw new AppError(
        `Screen '${screen.name}' does not belong to theatre '${theatre.name}'`,
        400,
        "SCREEN_THEATRE_MISMATCH"
      );
    }

    // 3. Verify Movie exists
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      throw new AppError("Referenced movie does not exist", 404, "MOVIE_NOT_FOUND");
    }

    // Calculate dates
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new AppError("Invalid startTime date/time format", 400, "INVALID_DATETIME");
    }

    let end: Date;
    if (endTime) {
      end = new Date(endTime);
      if (isNaN(end.getTime())) {
        throw new AppError("Invalid endTime date/time format", 400, "INVALID_DATETIME");
      }
      if (end <= start) {
        throw new AppError("endTime must be after startTime", 400, "INVALID_TIME_RANGE");
      }
    } else {
      // Auto compute end time based on movie duration + 15 minute cleaning/trailer buffer
      end = new Date(start.getTime() + (movie.durationMinutes + 15) * 60000);
    }

    // 4. Check for conflicting shows on this screen
    const conflict = await findScheduleConflict(screenId, start, end);
    if (conflict) {
      throw new AppError(
        `Schedule conflict on screen '${screen.name}': Overlaps with '${conflict.movie.title}' (${conflict.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${conflict.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        409,
        "SCHEDULE_CONFLICT"
      );
    }

    const show = await prisma.show.create({
      data: {
        theatreId,
        screenId,
        movieId,
        startTime: start,
        endTime: end,
        status: status || "SCHEDULED",
      },
      include: {
        movie: true,
        theatre: true,
        screen: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Show scheduled successfully",
      data: show,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/shows/:id - Edit show
export const updateShow = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { theatreId, screenId, movieId, startTime, endTime, status } = req.body;

    const existing = await prisma.show.findUnique({
      where: { id },
      include: { movie: true },
    });
    if (!existing) {
      throw new AppError("Show not found", 404, "SHOW_NOT_FOUND");
    }

    const effectiveTheatreId = theatreId || existing.theatreId;
    const effectiveScreenId = screenId || existing.screenId;
    const effectiveMovieId = movieId || existing.movieId;

    // Verify screen belongs to theatre if either is updated
    if (theatreId || screenId) {
      const screen = await prisma.screen.findUnique({ where: { id: effectiveScreenId } });
      if (!screen) {
        throw new AppError("Referenced screen does not exist", 404, "SCREEN_NOT_FOUND");
      }
      if (screen.theatreId !== effectiveTheatreId) {
        throw new AppError("Screen does not belong to selected theatre", 400, "SCREEN_THEATRE_MISMATCH");
      }
    }

    let start = existing.startTime;
    if (startTime) {
      start = new Date(startTime);
      if (isNaN(start.getTime())) throw new AppError("Invalid startTime format", 400, "INVALID_DATETIME");
    }

    let end = existing.endTime;
    if (endTime) {
      end = new Date(endTime);
      if (isNaN(end.getTime())) throw new AppError("Invalid endTime format", 400, "INVALID_DATETIME");
      if (end <= start) throw new AppError("endTime must be after startTime", 400, "INVALID_TIME_RANGE");
    }

    // Check conflict if time or screen changed
    const targetStatus = status || existing.status;
    if (targetStatus !== "CANCELLED") {
      const conflict = await findScheduleConflict(effectiveScreenId, start, end, id);
      if (conflict) {
        throw new AppError(
          `Schedule conflict: Overlaps with '${conflict.movie.title}' (${conflict.startTime.toLocaleTimeString()} - ${conflict.endTime.toLocaleTimeString()})`,
          409,
          "SCHEDULE_CONFLICT"
        );
      }
    }

    const updated = await prisma.show.update({
      where: { id },
      data: {
        theatreId: theatreId || undefined,
        screenId: screenId || undefined,
        movieId: movieId || undefined,
        startTime: startTime ? start : undefined,
        endTime: endTime ? end : undefined,
        status: status ? (status as ShowStatus) : undefined,
      },
      include: {
        movie: true,
        theatre: true,
        screen: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Show updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/shows/:id/cancel - Cancel show
export const cancelShow = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.show.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Show not found", 404, "SHOW_NOT_FOUND");
    }

    const updated = await prisma.show.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    res.status(200).json({
      success: true,
      message: "Show has been cancelled",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/shows/:id - Delete show
export const deleteShow = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.show.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true } } },
    });

    if (!existing) {
      throw new AppError("Show not found", 404, "SHOW_NOT_FOUND");
    }

    if (existing._count.tickets > 0) {
      throw new AppError(
        `Cannot delete show with ${existing._count.tickets} issued tickets. Cancel the show instead.`,
        400,
        "SHOW_HAS_TICKETS"
      );
    }

    await prisma.show.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Show deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
