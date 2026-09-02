"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orchestrationController_1 = require("../controllers/orchestrationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All orchestration endpoints require authentication
router.use(auth_1.authenticateJwt);
// 1. Process and orchestrate piracy response
router.post("/process", orchestrationController_1.OrchestrationController.process);
// 2. Retrieve orchestration lifecycle status for a session
router.get("/session/:sessionId", orchestrationController_1.OrchestrationController.getBySession);
// 3. Retrieve orchestration lifecycle status for an incident
router.get("/incident/:incidentId", orchestrationController_1.OrchestrationController.getByIncident);
// 4. Phase 30 End-to-End Production Validation Demo Endpoints
router.post("/demo/run", orchestrationController_1.OrchestrationController.runDemo);
router.get("/demo/status", orchestrationController_1.OrchestrationController.getDemoStatus);
router.post("/demo/reset", orchestrationController_1.OrchestrationController.resetDemo);
router.post("/demo/enforcement/approve", orchestrationController_1.OrchestrationController.approveDemoEnforcement);
exports.default = router;
