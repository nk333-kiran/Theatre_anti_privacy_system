"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socRouter = void 0;
const express_1 = require("express");
const socController_1 = require("../controllers/socController");
const auth_1 = require("../middleware/auth");
exports.socRouter = (0, express_1.Router)();
exports.socRouter.use(auth_1.authenticateJwt);
// Unified SOC summary & metrics
exports.socRouter.get("/summary", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), socController_1.SocController.getSummary);
exports.socRouter.get("/metrics", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), socController_1.SocController.getMetrics);
// Incidents
exports.socRouter.get("/incidents", socController_1.SocController.listIncidents);
exports.socRouter.post("/incidents", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF"]), socController_1.SocController.createIncident);
exports.socRouter.get("/incidents/:id", socController_1.SocController.getIncidentDetails);
exports.socRouter.get("/incidents/:id/timeline", socController_1.SocController.getIncidentTimeline);
exports.socRouter.post("/incidents/:id/assign", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), socController_1.SocController.assignAnalyst);
exports.socRouter.post("/incidents/:id/transition", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), socController_1.SocController.transitionStatus);
exports.socRouter.post("/incidents/:id/escalate", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), socController_1.SocController.escalateIncident);
// Workflows
exports.socRouter.get("/workflows", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), socController_1.SocController.listWorkflows);
exports.socRouter.post("/workflows", (0, auth_1.requireRole)(["ADMIN"]), socController_1.SocController.createWorkflow);
exports.socRouter.get("/workflows/executions", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), socController_1.SocController.listWorkflowExecutions);
// Notifications
exports.socRouter.get("/notifications", socController_1.SocController.listNotifications);
exports.socRouter.post("/notifications/:id/read", socController_1.SocController.markNotificationRead);
