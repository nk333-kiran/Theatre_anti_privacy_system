import { Router } from "express";
import {
  getIntelligenceOverview,
  getIntelligenceStats,
  getRiskScores,
  getThreatPatterns,
  getThreatSignals,
  getThreatPredictions,
  acknowledgeThreatPattern,
  investigatePrediction,
  recalculateThreatIntelligence,
  listIncidents,
  getIncidentById,
  analyzeThreatContext,
  assignIncident,
  resolveIncident,
  reopenIncident,
  executeResponseAction,
  getStudioDashboardData,
  getStudioThreatRankings,
  generateStudioManagementReport,
  exportStudioReport,
} from "../controllers/intelligenceController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Authentication required for all intelligence routes
router.use(authenticateJwt);

// Studio / Content Owner Intelligence Endpoints (Phase 28)
router.get("/studio/dashboard", requireRole(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), getStudioDashboardData);
router.get("/studio/rankings", requireRole(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), getStudioThreatRankings);
router.post("/studio/report", requireRole(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), generateStudioManagementReport);
router.get("/studio/report/export", requireRole(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), exportStudioReport);

// Scoped endpoints accessible to ADMIN and PRODUCTION_COMPANY
router.get("/stats", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getIntelligenceStats);
router.get("/patterns", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getThreatPatterns);
router.get("/predictions", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getThreatPredictions);
router.get("/risk", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getRiskScores);

// Endpoints restricted strictly to ADMIN / SOC Analysts
router.get("/overview", requireRole(["ADMIN"]), getIntelligenceOverview);
router.get("/signals", requireRole(["ADMIN"]), getThreatSignals);
router.get("/incidents", requireRole(["ADMIN"]), listIncidents);
router.get("/incidents/:id", requireRole(["ADMIN"]), getIncidentById);
router.post("/analyze", requireRole(["ADMIN"]), analyzeThreatContext);
router.post("/recalculate", requireRole(["ADMIN"]), recalculateThreatIntelligence);
router.post("/patterns/:id/acknowledge", requireRole(["ADMIN"]), acknowledgeThreatPattern);
router.post("/predictions/:id/investigate", requireRole(["ADMIN"]), investigatePrediction);
router.post("/incidents/:id/assign", requireRole(["ADMIN"]), assignIncident);
router.post("/incidents/:id/resolve", requireRole(["ADMIN"]), resolveIncident);
router.post("/incidents/:id/reopen", requireRole(["ADMIN"]), reopenIncident);
router.post("/actions/execute", requireRole(["ADMIN"]), executeResponseAction);

export default router;
