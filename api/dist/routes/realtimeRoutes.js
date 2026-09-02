"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const realtimeController_1 = require("../controllers/realtimeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Authentication required for all realtime routes
router.use(auth_1.authenticateJwt);
// Realtime SSE Security Stream (Filtered by RBAC in manager)
router.get("/security-stream", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY", "THEATRE_STAFF"]), realtimeController_1.getSecurityStream);
// Operational Status & Events
router.get("/status", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), realtimeController_1.getRealtimeStatus);
router.get("/events", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), realtimeController_1.getRealtimeEvents);
router.get("/threats", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), realtimeController_1.getRealtimeThreats);
router.get("/incidents", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), realtimeController_1.getRealtimeIncidents);
router.get("/risk/:entityType/:entityId", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), realtimeController_1.getEntityRisk);
// Ingestion & Containment (Admin restricted)
router.post("/analyze", (0, auth_1.requireRole)(["ADMIN"]), realtimeController_1.analyzeRealtimeEvent);
router.post("/actions/execute", (0, auth_1.requireRole)(["ADMIN"]), realtimeController_1.executeCustomAction);
router.post("/actions/:id/approve", (0, auth_1.requireRole)(["ADMIN"]), realtimeController_1.approveResponseAction);
router.post("/actions/:id/reject", (0, auth_1.requireRole)(["ADMIN"]), realtimeController_1.rejectResponseAction);
exports.default = router;
