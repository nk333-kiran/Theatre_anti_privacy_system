import { Request, Response, NextFunction } from "express";
import { prisma } from "@antipiracy/database";
import { ApiResponse } from "../types";
import { AppError } from "../middleware/errorHandler";

// GET /api/movies - List all movies
export const getMovies = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            shows: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/movies/:id - Get movie by ID
export const getMovieById = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        shows: {
          include: { theatre: true, screen: true },
          orderBy: { startTime: "desc" },
        },
      },
    });

    if (!movie) {
      throw new AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/movies - Add a new movie
export const createMovie = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, durationMinutes, language, rating, posterUrl } = req.body;

    if (!title || !durationMinutes || !language) {
      throw new AppError("Title, duration (minutes), and language are required", 400, "VALIDATION_ERROR");
    }

    const duration = Number(durationMinutes);
    if (isNaN(duration) || duration <= 0) {
      throw new AppError("Duration must be a positive integer in minutes", 400, "INVALID_DURATION");
    }

    const movie = await prisma.movie.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        durationMinutes: duration,
        language: language.trim(),
        rating: rating?.trim() || "PG-13",
        posterUrl: posterUrl?.trim() || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Movie created successfully",
      data: movie,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/movies/:id - Edit movie
export const updateMovie = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, durationMinutes, language, rating, posterUrl } = req.body;

    const existing = await prisma.movie.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
    }

    const duration = durationMinutes !== undefined ? Number(durationMinutes) : undefined;
    if (duration !== undefined && (isNaN(duration) || duration <= 0)) {
      throw new AppError("Duration must be a positive integer in minutes", 400, "INVALID_DURATION");
    }

    const updated = await prisma.movie.update({
      where: { id },
      data: {
        title: title ? title.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        durationMinutes: duration,
        language: language ? language.trim() : undefined,
        rating: rating !== undefined ? rating?.trim() : undefined,
        posterUrl: posterUrl !== undefined ? posterUrl?.trim() : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: "Movie updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/movies/:id - Delete movie
export const deleteMovie = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.movie.findUnique({
      where: { id },
      include: { _count: { select: { shows: true } } },
    });

    if (!existing) {
      throw new AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
    }

    if (existing._count.shows > 0) {
      throw new AppError(
        `Cannot delete movie with ${existing._count.shows} scheduled/active shows. Cancel or remove shows first.`,
        400,
        "MOVIE_HAS_SHOWS"
      );
    }

    await prisma.movie.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
