import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { PiracyOrchestrationService } from "../services/piracyOrchestrationService";
import { AppError } from "../middleware/errorHandler";

export class OrchestrationController {
  /**
   * POST /api/orchestration/process
   * Ingest and orchestrate response for session security signals
   */
  public static async process(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, signals, theatreId, showId, movieId, activationId, autoDraftEnforcement } = req.body;

      if (!sessionId) {
        throw new AppError("sessionId is required for piracy response orchestration", 400, "MISSING_SESSION_ID");
      }

      const result = await PiracyOrchestrationService.processOrchestration({
        sessionId,
        signals: Array.isArray(signals) ? signals : signals ? [signals] : [],
        theatreId: theatreId || req.user?.theatreId || null,
        showId,
        movieId,
        activationId,
        actorId: req.user?.id || null,
        actorEmail: req.user?.email || null,
        actorRole: req.user?.role || null,
        clientIp: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
        correlationId: (req as any).correlationId || req.headers["x-correlation-id"] as string,
        autoDraftEnforcement: autoDraftEnforcement !== undefined ? Boolean(autoDraftEnforcement) : true,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orchestration/session/:sessionId
   * Get full orchestration lifecycle trace by session ID
   */
  public static async getBySession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        throw new AppError("sessionId parameter is required", 400, "MISSING_SESSION_ID");
      }

      const result = await PiracyOrchestrationService.getSessionOrchestration({
        sessionId,
        userId: req.user?.id,
        userRole: req.user?.role,
        userTheatreId: req.user?.theatreId || null,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orchestration/incident/:incidentId
   * Get full orchestration lifecycle trace by SOC incident ID
   */
  public static async getByIncident(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { incidentId } = req.params;

      if (!incidentId) {
        throw new AppError("incidentId parameter is required", 400, "MISSING_INCIDENT_ID");
      }

      const result = await PiracyOrchestrationService.getIncidentOrchestration({
        incidentId,
        userId: req.user?.id,
        userRole: req.user?.role,
        userTheatreId: req.user?.theatreId || null,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orchestration/demo/run
   * Executes the full Phase 30 End-to-End Production Validation Demo Workflow
   */
  public static async runDemo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { signalLevel, autoApproveEnforcement } = req.body;
      const { EndToEndValidationService } = await import("../services/validation/endToEndValidationService");

      const result = await EndToEndValidationService.executeCompleteDemoFlow({
        signalLevel: signalLevel || "FULL_PIPELINE",
        autoApproveEnforcement: Boolean(autoApproveEnforcement),
        actor: {
          id: req.user?.id,
          email: req.user?.email,
          role: req.user?.role,
          theatreId: req.user?.theatreId || undefined,
          productionCompanyId: req.user?.productionCompanyId || undefined,
        },
        clientIp: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.headers["user-agent"] || undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orchestration/demo/status
   * Get current state of the deterministic demo scenario
   */
  public static async getDemoStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { EndToEndValidationService } = await import("../services/validation/endToEndValidationService");
      const fixtures = await EndToEndValidationService.setupOrGetDeterministicDemoScenario();

      const trace = await PiracyOrchestrationService.getSessionOrchestration({
        sessionId: fixtures.activation.id,
        userId: req.user?.id,
        userRole: req.user?.role,
        userTheatreId: req.user?.theatreId || null,
      }).catch(() => null);

      res.status(200).json({
        success: true,
        data: {
          fixtures: {
            theatreName: fixtures.theatre.name,
            theatreCode: fixtures.theatre.code,
            movieTitle: fixtures.movie.title,
            ticketNumber: fixtures.ticket.ticketNumber,
            activationCode: fixtures.activation.activationCode,
            secureQrToken: fixtures.secureQrToken,
            ticketStatus: fixtures.ticket.status,
            activationStatus: fixtures.activation.status,
          },
          trace,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orchestration/demo/reset
   * Safely reset the demo scenario and cleanup demo artifacts
   */
  public static async resetDemo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { EndToEndValidationService } = await import("../services/validation/endToEndValidationService");
      await EndToEndValidationService.cleanupDemoArtifacts();
      const fixtures = await EndToEndValidationService.setupOrGetDeterministicDemoScenario({ resetState: true });

      res.status(200).json({
        success: true,
        message: "Demo scenario successfully reset to pristine baseline.",
        data: {
          ticketNumber: fixtures.ticket.ticketNumber,
          activationCode: fixtures.activation.activationCode,
          secureQrToken: fixtures.secureQrToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orchestration/demo/enforcement/approve
   * Human authorization action for the demo enforcement draft
   */
  public static async approveDemoEnforcement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enforcementId, notes } = req.body;
      const { enforcementService } = await import("../services/enforcement/enforcementService");

      if (!enforcementId) {
        throw new AppError("enforcementId is required", 400, "MISSING_ENFORCEMENT_ID");
      }

      const approved = await enforcementService.processApproval(
        enforcementId,
        "APPROVE",
        {
          id: req.user?.id || "demo-approver",
          email: req.user?.email || "admin@antipiracy.system",
          role: req.user?.role || "ADMIN",
          theatreId: req.user?.theatreId || null,
        },
        notes || "Human authorized via Phase 30 End-to-End Demo Control Panel"
      );

      res.status(200).json({
        success: true,
        data: approved,
      });
    } catch (error) {
      next(error);
    }
  }
}
