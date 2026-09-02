import { Response, NextFunction } from "express";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { MobileService, MobileSessionData } from "../services/mobileService";
import { MobileWatermarkService, DynamicWatermarkPayload, WatermarkAttributionResult, ForensicEvidenceResult } from "../services/mobileWatermarkService";
import { AppError } from "../middleware/errorHandler";

export class MobileController {
  /**
   * POST /api/mobile/verify-ticket
   * Scan & verify movie ticket QR code, activate protection session, prevent duplicate activations, enforce theatre isolation
   */
  public static async verifyTicket(
    req: AuthenticatedRequest,
    res: Response<ApiResponse<MobileSessionData>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }

      const { qrPayload, deviceFingerprint } = req.body;
      if (!qrPayload) {
        throw new AppError("Ticket QR payload is required", 400, "MISSING_QR_PAYLOAD");
      }

      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "mobile-app";

      const sessionData = await MobileService.verifyTicketQR({
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mobile/tickets/:id/qr
   * Get secure signed QR token for existing ticket
   */
  public static async getTicketQr(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError("Ticket ID is required", 400, "MISSING_TICKET_ID");
      }

      const result = await MobileService.getSecureTicketQr(id);
      res.status(200).json({
        success: true,
        message: "Secure ticket QR generated",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mobile/session/:sessionId
   * Retrieve active protected screening session details
   */
  public static async getSession(
    req: AuthenticatedRequest,
    res: Response<ApiResponse<MobileSessionData>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }

      const { sessionId } = req.params;
      if (!sessionId) {
        throw new AppError("sessionId is required", 400, "MISSING_SESSION_ID");
      }

      const sessionData = await MobileService.getProtectedSession({
        sessionId,
        userId: user.id,
        userRole: user.role,
        userTheatreId: user.theatreId,
      });

      res.status(200).json({
        success: true,
        data: sessionData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mobile/session/:sessionId/watermark
   * Generate rotating dynamic session watermark for active screening session
   */
  public static async getSessionWatermark(
    req: AuthenticatedRequest,
    res: Response<ApiResponse<DynamicWatermarkPayload>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }

      const { sessionId } = req.params;
      const { epochSlot } = req.query;

      const sessionData = await MobileService.getProtectedSession({
        sessionId,
        userId: user.id,
        userRole: user.role,
        userTheatreId: user.theatreId,
      });

      const watermark = MobileWatermarkService.generateSessionWatermark(
        sessionData,
        epochSlot ? parseInt(String(epochSlot), 10) : undefined
      );

      res.status(200).json({
        success: true,
        data: watermark,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/mobile/watermark/attribute
   * Identify which screening session produced a specific watermark identifier
   */
  public static async attributeWatermark(
    req: AuthenticatedRequest,
    res: Response<ApiResponse<WatermarkAttributionResult>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }

      const { watermarkId } = req.body;
      if (!watermarkId) {
        throw new AppError("watermarkId is required", 400, "MISSING_WATERMARK_ID");
      }

      const attribution = await MobileWatermarkService.attributeWatermark({
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/mobile/watermark/evidence
   * Create traceable forensic evidence in Evidence Vault
   */
  public static async createForensicEvidence(
    req: AuthenticatedRequest,
    res: Response<ApiResponse<ForensicEvidenceResult>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }

      const { watermarkId, sessionId, reason, incidentId } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "mobile-app";

      const evidence = await MobileWatermarkService.createForensicEvidence({
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/mobile/events
   * Dispatch mobile security event to SOC and audit pipelines
   */
  public static async submitSecurityEvent(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }

      const { eventType, severity, sessionId, theatreId, showId, movieId, activationId, payload, metadata } = req.body;

      if (!eventType) {
        throw new AppError("eventType is required", 400, "MISSING_EVENT_TYPE");
      }

      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "mobile-app";

      const result = await MobileService.submitMobileSecurityEvent({
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
    } catch (error) {
      next(error);
    }
  }
}
