import { Router } from "express";
import { SocController } from "../controllers/socController";
import { authenticateJwt, requireRole } from "../middleware/auth";

export const socRouter = Router();

socRouter.use(authenticateJwt);

// Unified SOC summary & metrics
socRouter.get("/summary", requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), SocController.getSummary);
socRouter.get("/metrics", requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), SocController.getMetrics);

// Incidents
socRouter.get("/incidents", SocController.listIncidents);
socRouter.post("/incidents", requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF"]), SocController.createIncident);
socRouter.get("/incidents/:id", SocController.getIncidentDetails);
socRouter.get("/incidents/:id/timeline", SocController.getIncidentTimeline);
socRouter.post("/incidents/:id/assign", requireRole(["ADMIN", "THEATRE_ADMIN"]), SocController.assignAnalyst);
socRouter.post("/incidents/:id/transition", requireRole(["ADMIN", "THEATRE_ADMIN"]), SocController.transitionStatus);
socRouter.post("/incidents/:id/escalate", requireRole(["ADMIN", "THEATRE_ADMIN"]), SocController.escalateIncident);

// Workflows
socRouter.get("/workflows", requireRole(["ADMIN", "THEATRE_ADMIN"]), SocController.listWorkflows);
socRouter.post("/workflows", requireRole(["ADMIN"]), SocController.createWorkflow);
socRouter.get("/workflows/executions", requireRole(["ADMIN", "THEATRE_ADMIN"]), SocController.listWorkflowExecutions);

// Notifications
socRouter.get("/notifications", SocController.listNotifications);
socRouter.post("/notifications/:id/read", SocController.markNotificationRead);
