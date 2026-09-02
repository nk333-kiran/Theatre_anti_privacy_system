"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImportTemplates = exports.commitImportData = exports.validateImportData = void 0;
const dataImportService_1 = require("../services/database/dataImportService");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * POST /api/data-import/validate - Dry-run validate batch records before inserting
 */
const validateImportData = async (req, res, next) => {
    try {
        const { entityType, data, format, skipDuplicates } = req.body;
        if (!entityType) {
            throw new errorHandler_1.AppError("entityType is required", 400, "MISSING_ENTITY_TYPE");
        }
        if (!data) {
            throw new errorHandler_1.AppError("data payload is required (JSON array or CSV string)", 400, "MISSING_DATA");
        }
        const report = await dataImportService_1.dataImportService.importData(entityType, data, {
            dryRun: true,
            skipDuplicates: skipDuplicates ?? true,
            actorUserId: req.user?.id,
            actorEmail: req.user?.email,
        });
        res.status(200).json({
            success: report.failed === 0,
            message: `Validation completed: ${report.inserted} valid, ${report.skipped} duplicates, ${report.failed} errors`,
            data: report,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.validateImportData = validateImportData;
/**
 * POST /api/data-import/commit - Transactional commit of batch data into PostgreSQL
 */
const commitImportData = async (req, res, next) => {
    try {
        const { entityType, data, format, skipDuplicates } = req.body;
        if (!entityType) {
            throw new errorHandler_1.AppError("entityType is required", 400, "MISSING_ENTITY_TYPE");
        }
        if (!data) {
            throw new errorHandler_1.AppError("data payload is required (JSON array or CSV string)", 400, "MISSING_DATA");
        }
        const report = await dataImportService_1.dataImportService.importData(entityType, data, {
            dryRun: false,
            skipDuplicates: skipDuplicates ?? true,
            actorUserId: req.user?.id,
            actorEmail: req.user?.email,
        });
        res.status(report.failed === 0 ? 201 : 400).json({
            success: report.failed === 0,
            message: report.summary,
            data: report,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.commitImportData = commitImportData;
/**
 * GET /api/data-import/templates - Get template documentation and supported schema definitions
 */
const getImportTemplates = async (req, res, next) => {
    try {
        const schemas = {
            "production-companies": {
                description: "Studio / Movie Production Company registry",
                requiredFields: ["name", "code", "contactEmail"],
                optionalFields: ["contactPhone", "status"],
                example: {
                    name: "Warner Bros. Discovery",
                    code: "WBD",
                    contactEmail: "security@wbd.com",
                    contactPhone: "+1-818-954-6000",
                    status: "ACTIVE",
                },
            },
            theatres: {
                description: "Cinema / Multiplex Theatre entity",
                requiredFields: ["name", "code", "location"],
                optionalFields: ["address", "contactEmail", "contactPhone", "permanentQrCode"],
                example: {
                    name: "Grand Palace Cinema",
                    code: "GPC-01",
                    location: "Downtown Los Angeles, CA",
                    address: "700 W 7th St, Los Angeles, CA 90017",
                    contactEmail: "ops@grandpalace.cinema",
                },
            },
            screens: {
                description: "Auditorium / Screen room inside a Theatre",
                requiredFields: ["theatreCode (or theatreId)", "screenNumber", "capacity"],
                optionalFields: ["name"],
                example: {
                    theatreCode: "GPC-01",
                    screenNumber: 1,
                    name: "IMAX Laser Auditorium 1",
                    capacity: 350,
                },
            },
            users: {
                description: "System Staff, Theatre Admins, Studio reps, CSO users",
                requiredFields: ["email", "name", "role"],
                optionalFields: ["theatreCode", "productionCompanyCode", "password"],
                allowedRoles: ["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"],
                example: {
                    email: "gate.lead@grandpalace.cinema",
                    name: "Alex Gate Supervisor",
                    role: "THEATRE_STAFF",
                    theatreCode: "GPC-01",
                },
            },
            movies: {
                description: "Feature Film or Media Content metadata",
                requiredFields: ["title", "durationMinutes"],
                optionalFields: ["language", "rating", "synopsis", "description", "releaseDate", "contentStatus", "productionCompanyCode"],
                example: {
                    title: "Inception 2: Deep Dreams",
                    durationMinutes: 148,
                    language: "English",
                    rating: "PG-13",
                    productionCompanyCode: "WBD",
                },
            },
            "movie-releases": {
                description: "Authorized Theatre Exhibition Window for a Movie",
                requiredFields: ["movieTitle (or movieId)", "theatreCode (or theatreId)", "startDate", "endDate"],
                optionalFields: ["productionCompanyCode", "status"],
                example: {
                    movieTitle: "Inception 2: Deep Dreams",
                    theatreCode: "GPC-01",
                    startDate: "2026-09-01T00:00:00Z",
                    endDate: "2026-10-01T23:59:59Z",
                    status: "ACTIVE",
                },
            },
            shows: {
                description: "Individual Movie Screening Showtime Session",
                requiredFields: ["theatreCode", "screenNumber", "movieTitle", "startTime", "endTime"],
                optionalFields: ["status"],
                example: {
                    theatreCode: "GPC-01",
                    screenNumber: 1,
                    movieTitle: "Inception 2: Deep Dreams",
                    startTime: "2026-09-02T18:00:00Z",
                    endTime: "2026-09-02T20:30:00Z",
                    status: "SCHEDULED",
                },
            },
            tickets: {
                description: "Issued Admission Tickets with Activation Token generation",
                requiredFields: ["showId", "seatNumber"],
                optionalFields: ["price", "ticketNumber", "createActivation"],
                example: {
                    showId: "uuid-of-the-show",
                    seatNumber: "F12",
                    price: 18.5,
                    createActivation: true,
                },
            },
        };
        res.status(200).json({
            success: true,
            message: "Data Import Schema Templates & Guidance",
            data: schemas,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getImportTemplates = getImportTemplates;
