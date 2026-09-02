"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationController = void 0;
const piracyOrchestrationService_1 = require("../services/piracyOrchestrationService");
const errorHandler_1 = require("../middleware/errorHandler");
class OrchestrationController {
    /**
     * POST /api/orchestration/process
     * Ingest and orchestrate response for session security signals
     */
    static async process(req, res, next) {
        try {
            const { sessionId, signals, theatreId, showId, movieId, activationId, autoDraftEnforcement } = req.body;
            if (!sessionId) {
                throw new errorHandler_1.AppError("sessionId is required for piracy response orchestration", 400, "MISSING_SESSION_ID");
            }
            const result = await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
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
                correlationId: req.correlationId || req.headers["x-correlation-id"],
                autoDraftEnforcement: autoDraftEnforcement !== undefined ? Boolean(autoDraftEnforcement) : true,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/orchestration/session/:sessionId
     * Get full orchestration lifecycle trace by session ID
     */
    static async getBySession(req, res, next) {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                throw new errorHandler_1.AppError("sessionId parameter is required", 400, "MISSING_SESSION_ID");
            }
            const result = await piracyOrchestrationService_1.PiracyOrchestrationService.getSessionOrchestration({
                sessionId,
                userId: req.user?.id,
                userRole: req.user?.role,
                userTheatreId: req.user?.theatreId || null,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/orchestration/incident/:incidentId
     * Get full orchestration lifecycle trace by SOC incident ID
     */
    static async getByIncident(req, res, next) {
        try {
            const { incidentId } = req.params;
            if (!incidentId) {
                throw new errorHandler_1.AppError("incidentId parameter is required", 400, "MISSING_INCIDENT_ID");
            }
            const result = await piracyOrchestrationService_1.PiracyOrchestrationService.getIncidentOrchestration({
                incidentId,
                userId: req.user?.id,
                userRole: req.user?.role,
                userTheatreId: req.user?.theatreId || null,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/orchestration/demo/run
     * Executes the full Phase 30 End-to-End Production Validation Demo Workflow
     */
    static async runDemo(req, res, next) {
        try {
            const { signalLevel, autoApproveEnforcement } = req.body;
            const { EndToEndValidationService } = await Promise.resolve().then(() => __importStar(require("../services/validation/endToEndValidationService")));
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/orchestration/demo/status
     * Get current state of the deterministic demo scenario
     */
    static async getDemoStatus(req, res, next) {
        try {
            const { EndToEndValidationService } = await Promise.resolve().then(() => __importStar(require("../services/validation/endToEndValidationService")));
            const fixtures = await EndToEndValidationService.setupOrGetDeterministicDemoScenario();
            const trace = await piracyOrchestrationService_1.PiracyOrchestrationService.getSessionOrchestration({
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/orchestration/demo/reset
     * Safely reset the demo scenario and cleanup demo artifacts
     */
    static async resetDemo(req, res, next) {
        try {
            const { EndToEndValidationService } = await Promise.resolve().then(() => __importStar(require("../services/validation/endToEndValidationService")));
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/orchestration/demo/enforcement/approve
     * Human authorization action for the demo enforcement draft
     */
    static async approveDemoEnforcement(req, res, next) {
        try {
            const { enforcementId, notes } = req.body;
            const { enforcementService } = await Promise.resolve().then(() => __importStar(require("../services/enforcement/enforcementService")));
            if (!enforcementId) {
                throw new errorHandler_1.AppError("enforcementId is required", 400, "MISSING_ENFORCEMENT_ID");
            }
            const approved = await enforcementService.processApproval(enforcementId, "APPROVE", {
                id: req.user?.id || "demo-approver",
                email: req.user?.email || "admin@antipiracy.system",
                role: req.user?.role || "ADMIN",
                theatreId: req.user?.theatreId || null,
            }, notes || "Human authorized via Phase 30 End-to-End Demo Control Panel");
            res.status(200).json({
                success: true,
                data: approved,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OrchestrationController = OrchestrationController;
