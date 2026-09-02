"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const intelligenceController_1 = require("../controllers/intelligenceController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Authentication required for all intelligence routes
router.use(auth_1.authenticateJwt);
// Studio / Content Owner Intelligence Endpoints (Phase 28)
router.get("/studio/dashboard", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), intelligenceController_1.getStudioDashboardData);
router.get("/studio/rankings", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), intelligenceController_1.getStudioThreatRankings);
router.post("/studio/report", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), intelligenceController_1.generateStudioManagementReport);
router.get("/studio/report/export", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_ADMIN"]), intelligenceController_1.exportStudioReport);
// Scoped endpoints accessible to ADMIN and PRODUCTION_COMPANY
router.get("/stats", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), intelligenceController_1.getIntelligenceStats);
router.get("/patterns", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), intelligenceController_1.getThreatPatterns);
router.get("/predictions", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), intelligenceController_1.getThreatPredictions);
router.get("/risk", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), intelligenceController_1.getRiskScores);
// Endpoints restricted strictly to ADMIN / SOC Analysts
router.get("/overview", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.getIntelligenceOverview);
router.get("/signals", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.getThreatSignals);
router.get("/incidents", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.listIncidents);
router.get("/incidents/:id", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.getIncidentById);
router.post("/analyze", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.analyzeThreatContext);
router.post("/recalculate", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.recalculateThreatIntelligence);
router.post("/patterns/:id/acknowledge", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.acknowledgeThreatPattern);
router.post("/predictions/:id/investigate", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.investigatePrediction);
router.post("/incidents/:id/assign", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.assignIncident);
router.post("/incidents/:id/resolve", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.resolveIncident);
router.post("/incidents/:id/reopen", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.reopenIncident);
router.post("/actions/execute", (0, auth_1.requireRole)(["ADMIN"]), intelligenceController_1.executeResponseAction);
exports.default = router;
