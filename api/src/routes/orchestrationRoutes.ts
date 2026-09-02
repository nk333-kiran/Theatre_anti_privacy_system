import { Router } from "express";
import { OrchestrationController } from "../controllers/orchestrationController";
import { authenticateJwt } from "../middleware/auth";

const router = Router();

// All orchestration endpoints require authentication
router.use(authenticateJwt);

// 1. Process and orchestrate piracy response
router.post("/process", OrchestrationController.process);

// 2. Retrieve orchestration lifecycle status for a session
router.get("/session/:sessionId", OrchestrationController.getBySession);

// 3. Retrieve orchestration lifecycle status for an incident
router.get("/incident/:incidentId", OrchestrationController.getByIncident);

// 4. Phase 30 End-to-End Production Validation Demo Endpoints
router.post("/demo/run", OrchestrationController.runDemo);
router.get("/demo/status", OrchestrationController.getDemoStatus);
router.post("/demo/reset", OrchestrationController.resetDemo);
router.post("/demo/enforcement/approve", OrchestrationController.approveDemoEnforcement);

export default router;

