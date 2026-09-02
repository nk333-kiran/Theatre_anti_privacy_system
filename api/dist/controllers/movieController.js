"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMovie = exports.updateMovie = exports.createMovie = exports.getMovieById = exports.getMovies = void 0;
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../middleware/errorHandler");
// GET /api/movies - List all movies
const getMovies = async (_req, res, next) => {
    try {
        const movies = await database_1.prisma.movie.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getMovies = getMovies;
// GET /api/movies/:id - Get movie by ID
const getMovieById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const movie = await database_1.prisma.movie.findUnique({
            where: { id },
            include: {
                shows: {
                    include: { theatre: true, screen: true },
                    orderBy: { startTime: "desc" },
                },
            },
        });
        if (!movie) {
            throw new errorHandler_1.AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
        }
        res.status(200).json({
            success: true,
            data: movie,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMovieById = getMovieById;
// POST /api/movies - Add a new movie
const createMovie = async (req, res, next) => {
    try {
        const { title, description, durationMinutes, language, rating, posterUrl } = req.body;
        if (!title || !durationMinutes || !language) {
            throw new errorHandler_1.AppError("Title, duration (minutes), and language are required", 400, "VALIDATION_ERROR");
        }
        const duration = Number(durationMinutes);
        if (isNaN(duration) || duration <= 0) {
            throw new errorHandler_1.AppError("Duration must be a positive integer in minutes", 400, "INVALID_DURATION");
        }
        const movie = await database_1.prisma.movie.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.createMovie = createMovie;
// PUT /api/movies/:id - Edit movie
const updateMovie = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, durationMinutes, language, rating, posterUrl } = req.body;
        const existing = await database_1.prisma.movie.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
        }
        const duration = durationMinutes !== undefined ? Number(durationMinutes) : undefined;
        if (duration !== undefined && (isNaN(duration) || duration <= 0)) {
            throw new errorHandler_1.AppError("Duration must be a positive integer in minutes", 400, "INVALID_DURATION");
        }
        const updated = await database_1.prisma.movie.update({
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateMovie = updateMovie;
// DELETE /api/movies/:id - Delete movie
const deleteMovie = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await database_1.prisma.movie.findUnique({
            where: { id },
            include: { _count: { select: { shows: true } } },
        });
        if (!existing) {
            throw new errorHandler_1.AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
        }
        if (existing._count.shows > 0) {
            throw new errorHandler_1.AppError(`Cannot delete movie with ${existing._count.shows} scheduled/active shows. Cancel or remove shows first.`, 400, "MOVIE_HAS_SHOWS");
        }
        await database_1.prisma.movie.delete({
            where: { id },
        });
        res.status(200).json({
            success: true,
            message: "Movie deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMovie = deleteMovie;
