"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.associateAndActivateTicket = exports.getTheatreByQrCode = exports.regenerateTheatreQr = exports.deleteScreen = exports.updateScreen = exports.addScreen = exports.deleteTheatre = exports.updateTheatre = exports.createTheatre = exports.getTheatreById = exports.getTheatres = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../middleware/errorHandler");
// Helper to generate a cryptographically random theatre QR token
const generateTheatreQrCode = () => {
    return `THTR-${Date.now().toString(36).toUpperCase()}-${crypto_1.default.randomBytes(8).toString("hex")}`;
};
// GET /api/theatres - List all theatres with screens and show count
const getTheatres = async (_req, res, next) => {
    try {
        const theatres = await database_1.prisma.theatre.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                screens: {
                    orderBy: { screenNumber: "asc" },
                },
                _count: {
                    select: {
                        shows: true,
                        screens: true,
                    },
                },
            },
        });
        res.status(200).json({
            success: true,
            data: theatres,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTheatres = getTheatres;
// GET /api/theatres/:id - Get single theatre
const getTheatreById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const theatre = await database_1.prisma.theatre.findUnique({
            where: { id },
            include: {
                screens: {
                    orderBy: { screenNumber: "asc" },
                },
                shows: {
                    include: { movie: true, screen: true },
                    orderBy: { startTime: "desc" },
                    take: 10,
                },
            },
        });
        if (!theatre) {
            throw new errorHandler_1.AppError("Theatre not found", 404, "THEATRE_NOT_FOUND");
        }
        res.status(200).json({
            success: true,
            data: theatre,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTheatreById = getTheatreById;
// POST /api/theatres - Create a new theatre
const createTheatre = async (req, res, next) => {
    try {
        const { name, code, location, address, contactEmail, contactPhone, initialScreensCount } = req.body;
        if (!name || !code || !location) {
            throw new errorHandler_1.AppError("Name, unique code, and location are required", 400, "VALIDATION_ERROR");
        }
        // Check unique code
        const existing = await database_1.prisma.theatre.findUnique({
            where: { code: code.trim().toUpperCase() },
        });
        if (existing) {
            throw new errorHandler_1.AppError(`Theatre code '${code}' is already in use`, 409, "DUPLICATE_CODE");
        }
        // Create theatre with optional initial screens
        const screensToCreate = [];
        const count = Number(initialScreensCount) || 0;
        for (let i = 1; i <= count; i++) {
            screensToCreate.push({
                screenNumber: i,
                name: `Screen ${i}`,
                capacity: 150,
            });
        }
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                permanentQrCode: generateTheatreQrCode(),
                location: location.trim(),
                address: address?.trim() || null,
                contactEmail: contactEmail?.trim() || null,
                contactPhone: contactPhone?.trim() || null,
                screens: screensToCreate.length > 0 ? { create: screensToCreate } : undefined,
            },
            include: {
                screens: true,
            },
        });
        res.status(201).json({
            success: true,
            message: "Theatre created successfully",
            data: theatre,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createTheatre = createTheatre;
// PUT /api/theatres/:id - Update theatre
const updateTheatre = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, code, location, address, contactEmail, contactPhone } = req.body;
        const existing = await database_1.prisma.theatre.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError("Theatre not found", 404, "THEATRE_NOT_FOUND");
        }
        if (code && code.trim().toUpperCase() !== existing.code) {
            const duplicate = await database_1.prisma.theatre.findUnique({
                where: { code: code.trim().toUpperCase() },
            });
            if (duplicate) {
                throw new errorHandler_1.AppError(`Theatre code '${code}' is already in use`, 409, "DUPLICATE_CODE");
            }
        }
        const updated = await database_1.prisma.theatre.update({
            where: { id },
            data: {
                name: name ? name.trim() : undefined,
                code: code ? code.trim().toUpperCase() : undefined,
                location: location ? location.trim() : undefined,
                address: address !== undefined ? address?.trim() : undefined,
                contactEmail: contactEmail !== undefined ? contactEmail?.trim() : undefined,
                contactPhone: contactPhone !== undefined ? contactPhone?.trim() : undefined,
            },
            include: {
                screens: true,
            },
        });
        res.status(200).json({
            success: true,
            message: "Theatre updated successfully",
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTheatre = updateTheatre;
// DELETE /api/theatres/:id - Delete theatre
const deleteTheatre = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await database_1.prisma.theatre.findUnique({
            where: { id },
            include: { _count: { select: { shows: true } } },
        });
        if (!existing) {
            throw new errorHandler_1.AppError("Theatre not found", 404, "THEATRE_NOT_FOUND");
        }
        if (existing._count.shows > 0) {
            throw new errorHandler_1.AppError(`Cannot delete theatre with ${existing._count.shows} associated shows. Cancel or remove shows first.`, 400, "THEATRE_HAS_SHOWS");
        }
        await database_1.prisma.theatre.delete({
            where: { id },
        });
        res.status(200).json({
            success: true,
            message: "Theatre deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTheatre = deleteTheatre;
// POST /api/theatres/:id/screens - Add screen to theatre
const addScreen = async (req, res, next) => {
    try {
        const { id: theatreId } = req.params;
        const { screenNumber, name, capacity } = req.body;
        if (!screenNumber || !name || !capacity) {
            throw new errorHandler_1.AppError("screenNumber, name, and capacity are required", 400, "VALIDATION_ERROR");
        }
        const theatre = await database_1.prisma.theatre.findUnique({ where: { id: theatreId } });
        if (!theatre) {
            throw new errorHandler_1.AppError("Theatre not found", 404, "THEATRE_NOT_FOUND");
        }
        const num = Number(screenNumber);
        const cap = Number(capacity);
        if (isNaN(num) || num <= 0) {
            throw new errorHandler_1.AppError("Screen number must be a positive integer", 400, "INVALID_SCREEN_NUMBER");
        }
        if (isNaN(cap) || cap <= 0) {
            throw new errorHandler_1.AppError("Capacity must be a positive integer", 400, "INVALID_CAPACITY");
        }
        // Check duplicate screen number in this theatre
        const duplicate = await database_1.prisma.screen.findUnique({
            where: {
                theatreId_screenNumber: {
                    theatreId,
                    screenNumber: num,
                },
            },
        });
        if (duplicate) {
            throw new errorHandler_1.AppError(`Screen #${num} already exists in this theatre`, 409, "DUPLICATE_SCREEN_NUMBER");
        }
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId,
                screenNumber: num,
                name: name.trim(),
                capacity: cap,
            },
        });
        res.status(201).json({
            success: true,
            message: "Screen added successfully",
            data: screen,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addScreen = addScreen;
// PUT /api/theatres/screens/:screenId - Update screen
const updateScreen = async (req, res, next) => {
    try {
        const { screenId } = req.params;
        const { name, capacity, screenNumber } = req.body;
        const existing = await database_1.prisma.screen.findUnique({ where: { id: screenId } });
        if (!existing) {
            throw new errorHandler_1.AppError("Screen not found", 404, "SCREEN_NOT_FOUND");
        }
        if (screenNumber && Number(screenNumber) !== existing.screenNumber) {
            const duplicate = await database_1.prisma.screen.findUnique({
                where: {
                    theatreId_screenNumber: {
                        theatreId: existing.theatreId,
                        screenNumber: Number(screenNumber),
                    },
                },
            });
            if (duplicate) {
                throw new errorHandler_1.AppError(`Screen #${screenNumber} already exists in this theatre`, 409, "DUPLICATE_SCREEN_NUMBER");
            }
        }
        const updated = await database_1.prisma.screen.update({
            where: { id: screenId },
            data: {
                name: name ? name.trim() : undefined,
                capacity: capacity ? Number(capacity) : undefined,
                screenNumber: screenNumber ? Number(screenNumber) : undefined,
            },
        });
        res.status(200).json({
            success: true,
            message: "Screen updated successfully",
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateScreen = updateScreen;
// DELETE /api/theatres/screens/:screenId - Delete screen
const deleteScreen = async (req, res, next) => {
    try {
        const { screenId } = req.params;
        const existing = await database_1.prisma.screen.findUnique({
            where: { id: screenId },
            include: { _count: { select: { shows: true } } },
        });
        if (!existing) {
            throw new errorHandler_1.AppError("Screen not found", 404, "SCREEN_NOT_FOUND");
        }
        if (existing._count.shows > 0) {
            throw new errorHandler_1.AppError(`Cannot delete screen with ${existing._count.shows} scheduled/active shows`, 400, "SCREEN_HAS_SHOWS");
        }
        await database_1.prisma.screen.delete({
            where: { id: screenId },
        });
        res.status(200).json({
            success: true,
            message: "Screen deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteScreen = deleteScreen;
// POST /api/theatres/:id/regenerate-qr - Regenerate permanent Theatre QR (Admin only)
const regenerateTheatreQr = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await database_1.prisma.theatre.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError("Theatre not found", 404, "THEATRE_NOT_FOUND");
        }
        const newQrCode = generateTheatreQrCode();
        const updated = await database_1.prisma.theatre.update({
            where: { id },
            data: { permanentQrCode: newQrCode },
            include: { screens: true },
        });
        res.status(200).json({
            success: true,
            message: "Permanent Theatre QR regenerated successfully",
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.regenerateTheatreQr = regenerateTheatreQr;
// GET /api/theatres/public/qr/:code - Public scan endpoint for permanent Theatre QR
const getTheatreByQrCode = async (req, res, next) => {
    try {
        const { code } = req.params;
        if (!code) {
            throw new errorHandler_1.AppError("Theatre identifier code is required", 400, "MISSING_CODE");
        }
        const cleanCode = String(code).trim();
        // Lookup by permanentQrCode or code
        let theatre = await database_1.prisma.theatre.findFirst({
            where: {
                OR: [
                    { permanentQrCode: cleanCode },
                    { code: cleanCode.toUpperCase() },
                    { id: cleanCode },
                ],
            },
            include: {
                screens: {
                    orderBy: { screenNumber: "asc" },
                },
            },
        });
        if (!theatre) {
            throw new errorHandler_1.AppError("Unrecognized or invalid permanent Theatre QR code", 404, "THEATRE_NOT_FOUND");
        }
        // Ensure permanentQrCode exists on theatre
        if (!theatre.permanentQrCode) {
            theatre = await database_1.prisma.theatre.update({
                where: { id: theatre.id },
                data: { permanentQrCode: generateTheatreQrCode() },
                include: { screens: { orderBy: { screenNumber: "asc" } } },
            });
        }
        const now = new Date();
        // Show active and upcoming scheduled shows (excluding shows ended > 45 mins ago)
        const activeCutoff = new Date(now.getTime() - 45 * 60000);
        const availableShows = await database_1.prisma.show.findMany({
            where: {
                theatreId: theatre.id,
                status: { in: ["SCHEDULED", "ACTIVE"] },
                endTime: { gte: activeCutoff },
            },
            orderBy: { startTime: "asc" },
            include: {
                movie: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        durationMinutes: true,
                        language: true,
                        rating: true,
                        posterUrl: true,
                    },
                },
                screen: {
                    select: {
                        id: true,
                        name: true,
                        screenNumber: true,
                        capacity: true,
                    },
                },
            },
        });
        res.status(200).json({
            success: true,
            message: "Theatre screening directory retrieved",
            data: {
                theatre: {
                    id: theatre.id,
                    name: theatre.name,
                    code: theatre.code,
                    permanentQrCode: theatre.permanentQrCode,
                    location: theatre.location,
                    address: theatre.address,
                },
                shows: availableShows,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTheatreByQrCode = getTheatreByQrCode;
// POST /api/theatres/public/associate-ticket - Connect Ticket ID & activate protection via Theatre QR
const associateAndActivateTicket = async (req, res, next) => {
    try {
        const { theatreQrCode, showId, ticketIdentifier, deviceFingerprint } = req.body;
        if (!theatreQrCode || !showId || !ticketIdentifier) {
            throw new errorHandler_1.AppError("theatreQrCode, showId, and ticketIdentifier (Ticket ID or Token) are required", 400, "VALIDATION_ERROR");
        }
        const cleanTheatreCode = String(theatreQrCode).trim();
        const cleanTicketId = String(ticketIdentifier).trim().toUpperCase();
        const now = new Date();
        // 1. Verify Theatre
        const theatre = await database_1.prisma.theatre.findFirst({
            where: {
                OR: [
                    { permanentQrCode: cleanTheatreCode },
                    { code: cleanTheatreCode.toUpperCase() },
                    { id: cleanTheatreCode },
                ],
            },
        });
        if (!theatre) {
            throw new errorHandler_1.AppError("Invalid or unrecognized Theatre QR", 404, "THEATRE_NOT_FOUND");
        }
        // 2. Verify Show belongs to this Theatre
        const show = await database_1.prisma.show.findUnique({
            where: { id: showId },
            include: { movie: true, screen: true, theatre: true },
        });
        if (!show || show.theatreId !== theatre.id) {
            throw new errorHandler_1.AppError("Selected show does not belong to this theatre", 400, "SHOW_THEATRE_MISMATCH");
        }
        if (show.status === "CANCELLED") {
            throw new errorHandler_1.AppError("This screening session has been cancelled", 400, "SHOW_CANCELLED");
        }
        if (new Date(show.endTime).getTime() + 60 * 60000 < now.getTime()) {
            throw new errorHandler_1.AppError("This screening session has concluded", 400, "SHOW_EXPIRED");
        }
        // 3. Find Ticket by Ticket Number or Activation Code
        const ticket = await database_1.prisma.ticket.findFirst({
            where: {
                showId: show.id,
                OR: [
                    { ticketNumber: cleanTicketId },
                    { id: cleanTicketId.toLowerCase() },
                    { activation: { activationCode: cleanTicketId.toLowerCase() } },
                ],
            },
            include: {
                activation: true,
                show: {
                    include: { movie: true, theatre: true, screen: true },
                },
            },
        });
        if (!ticket) {
            throw new errorHandler_1.AppError(`Ticket "${cleanTicketId}" was not found for this show in ${theatre.name}. Check your Ticket ID.`, 404, "TICKET_NOT_FOUND");
        }
        // 4. Check Ticket cancellation
        if (ticket.status === "CANCELLED") {
            throw new errorHandler_1.AppError("This ticket has been cancelled or revoked", 400, "TICKET_CANCELLED");
        }
        // 5. Handle duplicate activation / existing active session
        if (ticket.activation && ticket.activation.status === "ACTIVE") {
            res.status(200).json({
                success: true,
                message: "THEATRE PROTECTION ACTIVE",
                data: {
                    alreadyActivated: true,
                    activationId: ticket.activation.id,
                    activationCode: ticket.activation.activationCode,
                    status: "ACTIVE",
                    activatedAt: ticket.activation.activatedAt,
                    expiresAt: ticket.activation.expiresAt,
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
        // 6. Create or Activate Unique Activation Session
        const expiresAt = new Date(new Date(show.endTime).getTime() + 30 * 60000);
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const fingerprint = deviceFingerprint || (req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 100) : "theatre-qr-client");
        const updatedActivation = await database_1.prisma.$transaction(async (tx) => {
            let act = ticket.activation;
            if (act) {
                act = await tx.activation.update({
                    where: { id: act.id },
                    data: {
                        status: "ACTIVE",
                        activatedAt: now,
                        expiresAt,
                        deviceFingerprint: fingerprint,
                        ipAddress: clientIp,
                    },
                });
            }
            else {
                // Create new unique activation token and record
                const newToken = crypto_1.default.randomBytes(24).toString("hex");
                act = await tx.activation.create({
                    data: {
                        ticketId: ticket.id,
                        activationCode: newToken,
                        status: "ACTIVE",
                        activatedAt: now,
                        expiresAt,
                        deviceFingerprint: fingerprint,
                        ipAddress: clientIp,
                    },
                });
            }
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
                activationId: updatedActivation.id,
                activationCode: updatedActivation.activationCode,
                status: "ACTIVE",
                activatedAt: updatedActivation.activatedAt,
                expiresAt: updatedActivation.expiresAt,
                ticketNumber: ticket.ticketNumber,
                seatNumber: ticket.seatNumber,
                movieTitle: show.movie.title,
                theatreName: show.theatre.name,
                screenName: show.screen.name,
                startTime: show.startTime,
                endTime: show.endTime,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.associateAndActivateTicket = associateAndActivateTicket;
