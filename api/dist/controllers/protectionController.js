"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProtectionStats = exports.getProtectionEvents = exports.getProtectionSessions = exports.revokeProtectionSession = exports.recordProtectionEvent = exports.sendSessionHeartbeat = exports.startProtectionSession = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../middleware/errorHandler");
// POST /api/protection/session/start - Initialize a protected viewing session
const startProtectionSession = async (req, res, next) => {
    try {
        const { token, deviceFingerprint } = req.body;
        if (!token) {
            throw new errorHandler_1.AppError("Activation token or Ticket ID is required", 400, "MISSING_TOKEN");
        }
        const cleanToken = String(token).trim();
        const now = new Date();
        // Lookup activation record
        const activation = await database_1.prisma.activation.findFirst({
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
            throw new errorHandler_1.AppError("Invalid or unrecognized activation token", 404, "INVALID_TOKEN");
        }
        const { ticket } = activation;
        const { show } = ticket;
        // Check validity
        if (ticket.status === "CANCELLED" || activation.status === "REVOKED") {
            throw new errorHandler_1.AppError("This activation session has been cancelled or revoked", 403, "SESSION_REVOKED");
        }
        if (activation.status === "EXPIRED" || (activation.expiresAt && now > new Date(activation.expiresAt))) {
            throw new errorHandler_1.AppError("This viewing protection session has expired", 403, "SESSION_EXPIRED");
        }
        // Generate unique session ID (non-PII)
        const sessionId = `SES-${Date.now().toString(36).toUpperCase()}-${crypto_1.default.randomBytes(4).toString("hex").toUpperCase()}`;
        const shortActivationId = `ACT-${activation.id.slice(0, 8).toUpperCase()}`;
        // Extract client headers for audit
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "web-player";
        // Record SESSION_STARTED in ProtectionEvent
        await database_1.prisma.protectionEvent.create({
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
        const watermark = {
            shortActivationId,
            sessionId,
            theatreCode: show.theatre.code,
            theatreName: show.theatre.name,
            screenName: show.screen.name,
            seatNumber: ticket.seatNumber,
            movieTitle: show.movie.title,
            timestamp: now.toISOString(),
        };
        const sessionInfo = {
            sessionId,
            activationId: activation.id,
            ticketNumber: ticket.ticketNumber,
            seatNumber: ticket.seatNumber,
            status: activation.status,
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
    }
    catch (error) {
        next(error);
    }
};
exports.startProtectionSession = startProtectionSession;
// POST /api/protection/heartbeat - Periodic session verification ping
const sendSessionHeartbeat = async (req, res, next) => {
    try {
        const { activationId, sessionId } = req.body;
        if (!activationId) {
            throw new errorHandler_1.AppError("activationId is required for heartbeat", 400, "MISSING_ACTIVATION_ID");
        }
        const now = new Date();
        const activation = await database_1.prisma.activation.findUnique({
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
            await database_1.prisma.activation.update({
                where: { id: activation.id },
                data: { status: "EXPIRED" },
            });
            await database_1.prisma.protectionEvent.create({
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
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        await database_1.prisma.protectionEvent.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.sendSessionHeartbeat = sendSessionHeartbeat;
// POST /api/protection/event - Log player events (fullscreen, screenshot attempt, pause, stop)
const recordProtectionEvent = async (req, res, next) => {
    try {
        const { activationId, eventType, metadata } = req.body;
        if (!activationId || !eventType) {
            throw new errorHandler_1.AppError("activationId and valid eventType are required", 400, "MISSING_PARAMETERS");
        }
        const activation = await database_1.prisma.activation.findUnique({
            where: { id: activationId },
            include: { ticket: { include: { show: true } } },
        });
        if (!activation) {
            throw new errorHandler_1.AppError("Activation record not found", 404, "ACTIVATION_NOT_FOUND");
        }
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "web-player";
        const createdEvent = await database_1.prisma.protectionEvent.create({
            data: {
                activationId,
                theatreId: activation.ticket?.show?.theatreId || null,
                showId: activation.ticket?.showId || null,
                eventType: eventType,
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
    }
    catch (error) {
        next(error);
    }
};
exports.recordProtectionEvent = recordProtectionEvent;
// POST /api/protection/session/revoke - Revoke a session immediately (Admin only)
const revokeProtectionSession = async (req, res, next) => {
    try {
        const { activationId, reason } = req.body;
        if (!activationId) {
            throw new errorHandler_1.AppError("activationId is required to revoke session", 400, "MISSING_ACTIVATION_ID");
        }
        const activation = await database_1.prisma.activation.findUnique({
            where: { id: activationId },
            include: { ticket: { include: { show: true } } },
        });
        if (!activation) {
            throw new errorHandler_1.AppError("Activation session not found", 404, "ACTIVATION_NOT_FOUND");
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.revokeProtectionSession = revokeProtectionSession;
// GET /api/protection/sessions - List viewing protection sessions
const getProtectionSessions = async (req, res, next) => {
    try {
        const { status, theatreId, limit } = req.query;
        const activations = await database_1.prisma.activation.findMany({
            where: {
                status: status ? String(status) : undefined,
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
    }
    catch (error) {
        next(error);
    }
};
exports.getProtectionSessions = getProtectionSessions;
// GET /api/protection/events - List recent protection event logs
const getProtectionEvents = async (req, res, next) => {
    try {
        const { eventType, theatreId, showId, limit } = req.query;
        const events = await database_1.prisma.protectionEvent.findMany({
            where: {
                eventType: eventType ? String(eventType) : undefined,
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
    }
    catch (error) {
        next(error);
    }
};
exports.getProtectionEvents = getProtectionEvents;
// GET /api/protection/stats - Aggregate session & security threat counts
const getProtectionStats = async (_req, res, next) => {
    try {
        const [activeCount, expiredCount, revokedCount, totalEvents, threatsCount] = await Promise.all([
            database_1.prisma.activation.count({ where: { status: "ACTIVE" } }),
            database_1.prisma.activation.count({ where: { status: "EXPIRED" } }),
            database_1.prisma.activation.count({ where: { status: "REVOKED" } }),
            database_1.prisma.protectionEvent.count(),
            database_1.prisma.protectionEvent.count({ where: { eventType: "SCREENSHOT_ATTEMPT_DETECTED" } }),
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
    }
    catch (error) {
        next(error);
    }
};
exports.getProtectionStats = getProtectionStats;
