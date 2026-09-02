"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incidentController_1 = require("../controllers/incidentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All Command Center / Incident endpoints require authentication and ADMIN / Security Officer role
router.use(auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN"]));
// 1. Live SSE Security Stream
router.get("/live-stream", incidentController_1.handleLiveSecurityStream);
// 2. Metrics & KPI Scorecard
router.get("/stats", incidentController_1.getIncidentScorecard);
router.get("/live", incidentController_1.getLiveThreatAlerts);
// 3. Incident Lifecycle & CRUD
router.get("/", incidentController_1.listSecurityIncidents);
router.post("/", incidentController_1.createSecurityIncident);
router.get("/:id", incidentController_1.getSecurityIncidentDetails);
router.post("/:id/acknowledge", incidentController_1.acknowledgeIncident);
router.post("/:id/assign", incidentController_1.assignIncident);
router.post("/:id/escalate", incidentController_1.escalateIncident);
router.post("/:id/resolve", incidentController_1.resolveIncident);
router.post("/:id/actions", incidentController_1.executeResponseAction);
router.get("/:id/evidence", incidentController_1.getIncidentEvidence);
exports.default = router;
