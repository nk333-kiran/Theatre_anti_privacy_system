import { Router } from "express";
import {
  listSecurityIncidents,
  getSecurityIncidentDetails,
  createSecurityIncident,
  acknowledgeIncident,
  assignIncident,
  escalateIncident,
  resolveIncident,
  executeResponseAction,
  getIncidentEvidence,
  getIncidentScorecard,
  getLiveThreatAlerts,
  handleLiveSecurityStream,
} from "../controllers/incidentController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// All Command Center / Incident endpoints require authentication and ADMIN / Security Officer role
router.use(authenticateJwt, requireRole(["ADMIN"]));

// 1. Live SSE Security Stream
router.get("/live-stream", handleLiveSecurityStream);

// 2. Metrics & KPI Scorecard
router.get("/stats", getIncidentScorecard);
router.get("/live", getLiveThreatAlerts);

// 3. Incident Lifecycle & CRUD
router.get("/", listSecurityIncidents);
router.post("/", createSecurityIncident);
router.get("/:id", getSecurityIncidentDetails);
router.post("/:id/acknowledge", acknowledgeIncident);
router.post("/:id/assign", assignIncident);
router.post("/:id/escalate", escalateIncident);
router.post("/:id/resolve", resolveIncident);
router.post("/:id/actions", executeResponseAction);
router.get("/:id/evidence", getIncidentEvidence);

export default router;
