"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const protectionController_1 = require("../controllers/protectionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public player session & heartbeat routes (Zero PII, verified via token)
router.post("/session/start", protectionController_1.startProtectionSession);
router.post("/heartbeat", protectionController_1.sendSessionHeartbeat);
router.post("/event", protectionController_1.recordProtectionEvent);
// Protected Admin Monitoring & Revocation Routes
router.use(auth_1.authenticateJwt);
router.post("/session/revoke", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), protectionController_1.revokeProtectionSession);
router.get("/sessions", protectionController_1.getProtectionSessions);
router.get("/events", protectionController_1.getProtectionEvents);
router.get("/stats", protectionController_1.getProtectionStats);
exports.default = router;
