import { Router } from "express";
import {
  startProtectionSession,
  sendSessionHeartbeat,
  recordProtectionEvent,
  revokeProtectionSession,
  getProtectionSessions,
  getProtectionEvents,
  getProtectionStats,
} from "../controllers/protectionController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Public player session & heartbeat routes (Zero PII, verified via token)
router.post("/session/start", startProtectionSession);
router.post("/heartbeat", sendSessionHeartbeat);
router.post("/event", recordProtectionEvent);

// Protected Admin Monitoring & Revocation Routes
router.use(authenticateJwt);

router.post("/session/revoke", requireRole(["ADMIN", "THEATRE_ADMIN"]), revokeProtectionSession);
router.get("/sessions", getProtectionSessions);
router.get("/events", getProtectionEvents);
router.get("/stats", getProtectionStats);

export default router;
