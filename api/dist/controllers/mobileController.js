"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileController = void 0;
const mobileService_1 = require("../services/mobileService");
const mobileWatermarkService_1 = require("../services/mobileWatermarkService");
const errorHandler_1 = require("../middleware/errorHandler");
class MobileController {
    /**
     * POST /api/mobile/verify-ticket
     * Scan & verify movie ticket QR code, activate protection session, prevent duplicate activations, enforce theatre isolation
     */
    static async verifyTicket(req, res, next) {
        try {
            const user = req.user;
            if (!user) {
                throw new errorHandler_1.AppError("Authentication required", 401, "UNAUTHORIZED");
            }
            const { qrPayload, deviceFingerprint } = req.body;
            if (!qrPayload) {
                throw new errorHandler_1.AppError("Ticket QR payload is required", 400, "MISSING_QR_PAYLOAD");
            }
            const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
            const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "mobile-app";
            const sessionData = await mobileService_1.MobileService.verifyTicketQR({
                qrPayload,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                userRole: user.role,
                userTheatreId: user.theatreId,
                deviceFingerprint,
                clientIp,
                userAgent,
            });
            res.status(200).json({
                success: true,
                message: "Ticket verified and screening session active",
                data: sessionData,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/mobile/tickets/:id/qr
     * Get secure signed QR token for existing ticket
     */
    static async getTicketQr(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errorHandler_1.AppError("Ticket ID is required", 400, "MISSING_TICKET_ID");
            }
            const result = await mobileService_1.MobileService.getSecureTicketQr(id);
            res.status(200).json({
                success: true,
                message: "Secure ticket QR generated",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/mobile/session/:sessionId
     * Retrieve active protected screening session details
     */
    static async getSession(req, res, next) {
        try {
            const user = req.user;
            if (!user) {
                throw new errorHandler_1.AppError("Authentication required", 401, "UNAUTHORIZED");
            }
            const { sessionId } = req.params;
            if (!sessionId) {
                throw new errorHandler_1.AppError("sessionId is required", 400, "MISSING_SESSION_ID");
            }
            const sessionData = await mobileService_1.MobileService.getProtectedSession({
                sessionId,
                userId: user.id,
                userRole: user.role,
                userTheatreId: user.theatreId,
            });
            res.status(200).json({
                success: true,
                data: sessionData,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/mobile/session/:sessionId/watermark
     * Generate rotating dynamic session watermark for active screening session
     */
    static async getSessionWatermark(req, res, next) {
        try {
            const user = req.user;
            if (!user) {
                throw new errorHandler_1.AppError("Authentication required", 401, "UNAUTHORIZED");
            }
            const { sessionId } = req.params;
            const { epochSlot } = req.query;
            const sessionData = await mobileService_1.MobileService.getProtectedSession({
                sessionId,
                userId: user.id,
                userRole: user.role,
                userTheatreId: user.theatreId,
            });
            const watermark = mobileWatermarkService_1.MobileWatermarkService.generateSessionWatermark(sessionData, epochSlot ? parseInt(String(epochSlot), 10) : undefined);
            res.status(200).json({
                success: true,
                data: watermark,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/mobile/watermark/attribute
     * Identify which screening session produced a specific watermark identifier
     */
    static async attributeWatermark(req, res, next) {
        try {
            const user = req.user;
            if (!user) {
                throw new errorHandler_1.AppError("Authentication required", 401, "UNAUTHORIZED");
            }
            const { watermarkId } = req.body;
            if (!watermarkId) {
                throw new errorHandler_1.AppError("watermarkId is required", 400, "MISSING_WATERMARK_ID");
            }
            const attribution = await mobileWatermarkService_1.MobileWatermarkService.attributeWatermark({
                watermarkId,
                userId: user.id,
                userRole: user.role,
                userTheatreId: user.theatreId,
            });
            res.status(200).json({
                success: true,
                message: "Watermark successfully attributed to screening session",
                data: attribution,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/mobile/watermark/evidence
     * Create traceable forensic evidence in Evidence Vault
     */
    static async createForensicEvidence(req, res, next) {
        try {
            const user = req.user;
            if (!user) {
                throw new errorHandler_1.AppError("Authentication required", 401, "UNAUTHORIZED");
            }
            const { watermarkId, sessionId, reason, incidentId } = req.body;
            const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
            const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "mobile-app";
            const evidence = await mobileWatermarkService_1.MobileWatermarkService.createForensicEvidence({
                watermarkId,
                sessionId,
                reason,
                incidentId,
                actorId: user.id,
                actorEmail: user.email,
                actorRole: user.role,
                clientIp,
                userAgent,
            });
            res.status(201).json({
                success: true,
                message: "Forensic evidence recorded in Evidence Vault",
                data: evidence,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/mobile/events
     * Dispatch mobile security event to SOC and audit pipelines
     */
    static async submitSecurityEvent(req, res, next) {
        try {
            const user = req.user;
            if (!user) {
                throw new errorHandler_1.AppError("Authentication required", 401, "UNAUTHORIZED");
            }
            const { eventType, severity, sessionId, theatreId, showId, movieId, activationId, payload, metadata } = req.body;
            if (!eventType) {
                throw new errorHandler_1.AppError("eventType is required", 400, "MISSING_EVENT_TYPE");
            }
            const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
            const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "mobile-app";
            const result = await mobileService_1.MobileService.submitMobileSecurityEvent({
                eventType,
                severity,
                sessionId,
                theatreId: theatreId || user.theatreId || undefined,
                showId,
                movieId,
                activationId,
                payload,
                metadata,
                actorId: user.id,
                actorEmail: user.email,
                actorRole: user.role,
                clientIp,
                userAgent,
            });
            res.status(201).json({
                success: true,
                message: "Mobile security event ingested into SOC",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MobileController = MobileController;
