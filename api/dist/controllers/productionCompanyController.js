"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductionCompanyStats = exports.getMovieAudits = exports.rejectMovieRelease = exports.approveMovieRelease = exports.createMovieRelease = exports.getMovieReleases = exports.deleteContentAsset = exports.addContentAsset = exports.updateProductionMovie = exports.createProductionMovie = exports.getProductionMovies = exports.updateProductionCompany = exports.createProductionCompany = exports.getProductionCompanies = void 0;
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../middleware/errorHandler");
// ---------------- PRODUCTION COMPANY MANAGEMENT ----------------
// GET /api/production-companies - List all production companies
const getProductionCompanies = async (req, res, next) => {
    try {
        const { status, search } = req.query;
        const companies = await database_1.prisma.productionCompany.findMany({
            where: {
                status: status ? String(status) : undefined,
                name: search ? { contains: String(search), mode: "insensitive" } : undefined,
            },
            include: {
                _count: {
                    select: {
                        movies: true,
                        releases: true,
                        users: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        res.status(200).json({
            success: true,
            data: companies,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductionCompanies = getProductionCompanies;
// POST /api/production-companies - Register new production company (Admin only)
const createProductionCompany = async (req, res, next) => {
    try {
        const { name, code, contactEmail, contactPhone } = req.body;
        if (!name || !code || !contactEmail) {
            throw new errorHandler_1.AppError("Name, Code, and Contact Email are required", 400, "MISSING_REQUIRED_FIELDS");
        }
        const existing = await database_1.prisma.productionCompany.findUnique({
            where: { code: String(code).trim().toUpperCase() },
        });
        if (existing) {
            throw new errorHandler_1.AppError(`Production company with code "${code}" already exists`, 409, "CODE_EXISTS");
        }
        const company = await database_1.prisma.productionCompany.create({
            data: {
                name: String(name).trim(),
                code: String(code).trim().toUpperCase(),
                contactEmail: String(contactEmail).trim(),
                contactPhone: contactPhone ? String(contactPhone).trim() : null,
            },
            include: {
                _count: {
                    select: {
                        movies: true,
                        releases: true,
                        users: true,
                    },
                },
            },
        });
        res.status(201).json({
            success: true,
            message: "Production company registered successfully",
            data: company,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createProductionCompany = createProductionCompany;
// PUT /api/production-companies/:id - Update production company details
const updateProductionCompany = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, contactEmail, contactPhone, status } = req.body;
        // Check authorization: Admin or associated company user
        if (req.user?.role !== "ADMIN" &&
            req.user?.productionCompanyId !== id) {
            throw new errorHandler_1.AppError("You are not authorized to modify this production company", 403, "FORBIDDEN");
        }
        const updated = await database_1.prisma.productionCompany.update({
            where: { id },
            data: {
                name: name ? String(name).trim() : undefined,
                contactEmail: contactEmail ? String(contactEmail).trim() : undefined,
                contactPhone: contactPhone !== undefined ? contactPhone : undefined,
                status: status && req.user?.role === "ADMIN" ? String(status) : undefined,
            },
            include: {
                _count: {
                    select: {
                        movies: true,
                        releases: true,
                        users: true,
                    },
                },
            },
        });
        res.status(200).json({
            success: true,
            message: "Production company updated successfully",
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProductionCompany = updateProductionCompany;
// ---------------- MOVIE & CONTENT LIFECYCLE MANAGEMENT ----------------
// GET /api/production/movies - List movies for production company
const getProductionMovies = async (req, res, next) => {
    try {
        const { contentStatus, search } = req.query;
        let companyFilter;
        if (req.user?.role === "PRODUCTION_COMPANY") {
            if (!req.user.productionCompanyId) {
                throw new errorHandler_1.AppError("Production company account is not bound to a company ID", 403, "NO_COMPANY_BOUND");
            }
            companyFilter = req.user.productionCompanyId;
        }
        else if (req.query.productionCompanyId) {
            companyFilter = String(req.query.productionCompanyId);
        }
        const movies = await database_1.prisma.movie.findMany({
            where: {
                productionCompanyId: companyFilter,
                contentStatus: contentStatus ? String(contentStatus) : undefined,
                title: search ? { contains: String(search), mode: "insensitive" } : undefined,
            },
            include: {
                productionCompany: {
                    select: { id: true, name: true, code: true },
                },
                assets: true,
                releases: {
                    include: {
                        theatre: { select: { id: true, name: true, code: true } },
                    },
                },
                _count: {
                    select: {
                        shows: true,
                        releases: true,
                        assets: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
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
exports.getProductionMovies = getProductionMovies;
// POST /api/production/movies - Create a new movie with content lifecycle state
const createProductionMovie = async (req, res, next) => {
    try {
        const { title, description, synopsis, durationMinutes, language, rating, posterUrl, releaseDate, contentStatus, productionCompanyId, } = req.body;
        if (!title || !durationMinutes || !language) {
            throw new errorHandler_1.AppError("Title, duration, and language are required", 400, "MISSING_FIELDS");
        }
        // Role check & Company ID binding
        let targetCompanyId = productionCompanyId;
        if (req.user?.role === "PRODUCTION_COMPANY") {
            targetCompanyId = req.user.productionCompanyId;
        }
        const createdMovie = await database_1.prisma.$transaction(async (tx) => {
            const movie = await tx.movie.create({
                data: {
                    title: String(title).trim(),
                    description: description ? String(description).trim() : null,
                    synopsis: synopsis ? String(synopsis).trim() : null,
                    durationMinutes: Number(durationMinutes),
                    language: String(language).trim(),
                    rating: rating ? String(rating).trim() : "PG-13",
                    posterUrl: posterUrl ? String(posterUrl).trim() : null,
                    releaseDate: releaseDate ? new Date(releaseDate) : null,
                    contentStatus: contentStatus || "DRAFT",
                    productionCompanyId: targetCompanyId || null,
                },
                include: {
                    productionCompany: true,
                    assets: true,
                },
            });
            // Audit event
            await tx.movieAuditEvent.create({
                data: {
                    movieId: movie.id,
                    userId: req.user?.id,
                    action: "MOVIE_CREATED",
                    details: `Movie "${movie.title}" registered with status ${movie.contentStatus}`,
                },
            });
            return movie;
        });
        res.status(201).json({
            success: true,
            message: "Movie created and content lifecycle initialized",
            data: createdMovie,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createProductionMovie = createProductionMovie;
// PUT /api/production/movies/:id - Update movie and content status
const updateProductionMovie = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, synopsis, durationMinutes, language, rating, posterUrl, releaseDate, contentStatus, productionCompanyId, } = req.body;
        const existingMovie = await database_1.prisma.movie.findUnique({
            where: { id },
        });
        if (!existingMovie) {
            throw new errorHandler_1.AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
        }
        // Boundary check: Production companies can ONLY modify their own movies
        if (req.user?.role === "PRODUCTION_COMPANY" &&
            existingMovie.productionCompanyId !== req.user.productionCompanyId) {
            throw new errorHandler_1.AppError("You do not have permission to modify movies owned by other companies", 403, "FORBIDDEN");
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const movie = await tx.movie.update({
                where: { id },
                data: {
                    title: title ? String(title).trim() : undefined,
                    description: description !== undefined ? description : undefined,
                    synopsis: synopsis !== undefined ? synopsis : undefined,
                    durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
                    language: language ? String(language).trim() : undefined,
                    rating: rating !== undefined ? rating : undefined,
                    posterUrl: posterUrl !== undefined ? posterUrl : undefined,
                    releaseDate: releaseDate ? new Date(releaseDate) : undefined,
                    contentStatus: contentStatus ? contentStatus : undefined,
                    productionCompanyId: req.user?.role === "ADMIN" && productionCompanyId !== undefined
                        ? productionCompanyId
                        : undefined,
                },
                include: {
                    productionCompany: true,
                    assets: true,
                },
            });
            await tx.movieAuditEvent.create({
                data: {
                    movieId: movie.id,
                    userId: req.user?.id,
                    action: "MOVIE_UPDATED",
                    details: `Movie details updated. Content status: ${movie.contentStatus}`,
                },
            });
            return movie;
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
exports.updateProductionMovie = updateProductionMovie;
// POST /api/production/movies/:id/assets - Register content asset metadata (Vault Placeholder)
const addContentAsset = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { assetType, resolution, durationMinutes, fileReference, fileSizeMb } = req.body;
        if (!assetType || !fileReference) {
            throw new errorHandler_1.AppError("Asset type and file/storage reference placeholder are required", 400, "MISSING_FIELDS");
        }
        const movie = await database_1.prisma.movie.findUnique({ where: { id } });
        if (!movie) {
            throw new errorHandler_1.AppError("Movie not found", 404, "NOT_FOUND");
        }
        if (req.user?.role === "PRODUCTION_COMPANY" &&
            movie.productionCompanyId !== req.user.productionCompanyId) {
            throw new errorHandler_1.AppError("You do not have permission to attach assets to this movie", 403, "FORBIDDEN");
        }
        const asset = await database_1.prisma.contentAsset.create({
            data: {
                movieId: id,
                assetType: String(assetType).trim(),
                resolution: resolution ? String(resolution).trim() : "4K DCI",
                durationMinutes: durationMinutes ? Number(durationMinutes) : movie.durationMinutes,
                fileReference: String(fileReference).trim(),
                fileSizeMb: fileSizeMb ? Number(fileSizeMb) : 24500,
                processingStatus: "READY",
            },
        });
        res.status(201).json({
            success: true,
            message: "Content asset metadata registered successfully",
            data: asset,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addContentAsset = addContentAsset;
// DELETE /api/production/movies/assets/:assetId - Delete content asset metadata
const deleteContentAsset = async (req, res, next) => {
    try {
        const { assetId } = req.params;
        const asset = await database_1.prisma.contentAsset.findUnique({
            where: { id: assetId },
            include: { movie: true },
        });
        if (!asset) {
            throw new errorHandler_1.AppError("Content asset not found", 404, "NOT_FOUND");
        }
        if (req.user?.role === "PRODUCTION_COMPANY" &&
            asset.movie.productionCompanyId !== req.user.productionCompanyId) {
            throw new errorHandler_1.AppError("You do not have permission to delete assets from this movie", 403, "FORBIDDEN");
        }
        await database_1.prisma.contentAsset.delete({ where: { id: assetId } });
        res.status(200).json({
            success: true,
            message: "Content asset metadata removed",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContentAsset = deleteContentAsset;
// ---------------- THEATRE RELEASE & DISTRIBUTION MANAGEMENT ----------------
// GET /api/releases - List movie releases & distribution authorizations
const getMovieReleases = async (req, res, next) => {
    try {
        const { status, theatreId, movieId } = req.query;
        let companyFilter;
        let theatreFilter = theatreId ? String(theatreId) : undefined;
        if (req.user?.role === "PRODUCTION_COMPANY") {
            companyFilter = req.user.productionCompanyId || undefined;
        }
        else if (req.user?.role === "THEATRE_ADMIN" || req.user?.role === "THEATRE_STAFF") {
            theatreFilter = req.user.theatreId || undefined;
        }
        const releases = await database_1.prisma.movieRelease.findMany({
            where: {
                productionCompanyId: companyFilter,
                theatreId: theatreFilter,
                movieId: movieId ? String(movieId) : undefined,
                status: status ? String(status) : undefined,
            },
            include: {
                movie: {
                    select: { title: true, durationMinutes: true, rating: true, language: true },
                },
                productionCompany: {
                    select: { name: true, code: true },
                },
                theatre: {
                    select: { name: true, code: true, location: true },
                },
                screen: {
                    select: { name: true, screenNumber: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({
            success: true,
            data: releases,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMovieReleases = getMovieReleases;
// POST /api/releases - Create theatre distribution release request
const createMovieRelease = async (req, res, next) => {
    try {
        const { movieId, theatreId, screenId, startDate, endDate } = req.body;
        if (!movieId || !theatreId || !startDate || !endDate) {
            throw new errorHandler_1.AppError("Movie, Theatre, Start Date, and End Date are required", 400, "MISSING_REQUIRED_FIELDS");
        }
        const movie = await database_1.prisma.movie.findUnique({
            where: { id: movieId },
            include: { productionCompany: true },
        });
        if (!movie) {
            throw new errorHandler_1.AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
        }
        let companyId = movie.productionCompanyId;
        if (req.user?.role === "PRODUCTION_COMPANY") {
            if (movie.productionCompanyId !== req.user.productionCompanyId) {
                throw new errorHandler_1.AppError("You can only create releases for movies owned by your production company", 403, "FORBIDDEN");
            }
            companyId = req.user.productionCompanyId;
        }
        if (!companyId) {
            throw new errorHandler_1.AppError("Movie must be assigned to a production company before creating releases", 400, "NO_COMPANY");
        }
        const release = await database_1.prisma.$transaction(async (tx) => {
            const rel = await tx.movieRelease.create({
                data: {
                    movieId,
                    productionCompanyId: companyId,
                    theatreId,
                    screenId: screenId || null,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    status: "PENDING_APPROVAL",
                },
                include: {
                    movie: true,
                    theatre: true,
                    productionCompany: true,
                },
            });
            await tx.movieAuditEvent.create({
                data: {
                    movieId,
                    releaseId: rel.id,
                    userId: req.user?.id,
                    action: "RELEASE_CREATED",
                    details: `Release submitted for "${rel.movie.title}" at "${rel.theatre.name}" (Pending Approval)`,
                },
            });
            return rel;
        });
        res.status(201).json({
            success: true,
            message: "Movie release authorization requested successfully",
            data: release,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createMovieRelease = createMovieRelease;
// POST /api/releases/:id/approve - Approve a release authorization (Admin only)
const approveMovieRelease = async (req, res, next) => {
    try {
        const { id } = req.params;
        const release = await database_1.prisma.movieRelease.findUnique({
            where: { id },
            include: { movie: true, theatre: true },
        });
        if (!release) {
            throw new errorHandler_1.AppError("Release request not found", 404, "NOT_FOUND");
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const rel = await tx.movieRelease.update({
                where: { id },
                data: {
                    status: "APPROVED",
                    approvedByAdminId: req.user?.id,
                    approvedAt: new Date(),
                    rejectionReason: null,
                },
            });
            await tx.movieAuditEvent.create({
                data: {
                    movieId: release.movieId,
                    releaseId: rel.id,
                    userId: req.user?.id,
                    action: "RELEASE_APPROVED",
                    details: `Release approved by Admin ${req.user?.name || req.user?.email}`,
                },
            });
            return rel;
        });
        res.status(200).json({
            success: true,
            message: "Movie release authorization approved",
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.approveMovieRelease = approveMovieRelease;
// POST /api/releases/:id/reject - Reject a release authorization (Admin only)
const rejectMovieRelease = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const release = await database_1.prisma.movieRelease.findUnique({
            where: { id },
            include: { movie: true, theatre: true },
        });
        if (!release) {
            throw new errorHandler_1.AppError("Release request not found", 404, "NOT_FOUND");
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const rel = await tx.movieRelease.update({
                where: { id },
                data: {
                    status: "REJECTED",
                    rejectionReason: reason ? String(reason).trim() : "Distribution authorization denied by platform administration",
                },
            });
            await tx.movieAuditEvent.create({
                data: {
                    movieId: release.movieId,
                    releaseId: rel.id,
                    userId: req.user?.id,
                    action: "RELEASE_REJECTED",
                    details: `Release rejected: ${rel.rejectionReason}`,
                },
            });
            return rel;
        });
        res.status(200).json({
            success: true,
            message: "Movie release authorization rejected",
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectMovieRelease = rejectMovieRelease;
// GET /api/production/audits - List movie and release audit events
const getMovieAudits = async (req, res, next) => {
    try {
        const { movieId, releaseId, limit } = req.query;
        const audits = await database_1.prisma.movieAuditEvent.findMany({
            where: {
                movieId: movieId ? String(movieId) : undefined,
                releaseId: releaseId ? String(releaseId) : undefined,
            },
            include: {
                movie: { select: { title: true } },
                release: {
                    select: {
                        id: true,
                        status: true,
                        theatre: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: limit ? Number(limit) : 50,
        });
        res.status(200).json({
            success: true,
            data: audits,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMovieAudits = getMovieAudits;
// GET /api/production/stats - Production Company Dashboard Stats
const getProductionCompanyStats = async (req, res, next) => {
    try {
        let companyId;
        if (req.user?.role === "PRODUCTION_COMPANY") {
            companyId = req.user.productionCompanyId || undefined;
        }
        else if (req.query.productionCompanyId) {
            companyId = String(req.query.productionCompanyId);
        }
        const [totalMovies, activeReleases, theatresCount, activeActivations, protectionEventsCount] = await Promise.all([
            database_1.prisma.movie.count({
                where: companyId ? { productionCompanyId: companyId } : undefined,
            }),
            database_1.prisma.movieRelease.count({
                where: {
                    productionCompanyId: companyId,
                    status: { in: ["APPROVED", "ACTIVE"] },
                },
            }),
            database_1.prisma.theatre.count({
                where: companyId
                    ? {
                        movieReleases: {
                            some: { productionCompanyId: companyId, status: { in: ["APPROVED", "ACTIVE"] } },
                        },
                    }
                    : undefined,
            }),
            database_1.prisma.activation.count({
                where: {
                    status: "ACTIVE",
                    ticket: companyId ? { show: { movie: { productionCompanyId: companyId } } } : undefined,
                },
            }),
            database_1.prisma.protectionEvent.count({
                where: companyId ? { show: { movie: { productionCompanyId: companyId } } } : undefined,
            }),
        ]);
        res.status(200).json({
            success: true,
            data: {
                totalMovies,
                activeReleases,
                assignedTheatres: theatresCount,
                activeProtectionSessions: activeActivations,
                protectionEvents: protectionEventsCount,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductionCompanyStats = getProductionCompanyStats;
