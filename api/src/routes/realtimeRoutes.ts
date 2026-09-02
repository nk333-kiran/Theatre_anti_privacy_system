import { Router } from "express";
import {
  getSecurityStream,
  getRealtimeStatus,
  getRealtimeEvents,
  getRealtimeThreats,
  getRealtimeIncidents,
  getEntityRisk,
  analyzeRealtimeEvent,
  approveResponseAction,
  rejectResponseAction,
  executeCustomAction,
} from "../controllers/realtimeController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Authentication required for all realtime routes
router.use(authenticateJwt);

// Realtime SSE Security Stream (Filtered by RBAC in manager)
router.get("/security-stream", requireRole(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_STAFF"]), getSecurityStream);

// Operational Status & Events
router.get("/status", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getRealtimeStatus);
router.get("/events", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getRealtimeEvents);
router.get("/threats", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getRealtimeThreats);
router.get("/incidents", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getRealtimeIncidents);
router.get("/risk/:entityType/:entityId", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getEntityRisk);

// Ingestion & Containment (Admin restricted)
router.post("/analyze", requireRole(["ADMIN"]), analyzeRealtimeEvent);
router.post("/actions/execute", requireRole(["ADMIN"]), executeCustomAction);
router.post("/actions/:id/approve", requireRole(["ADMIN"]), approveResponseAction);
router.post("/actions/:id/reject", requireRole(["ADMIN"]), rejectResponseAction);

export default router;
