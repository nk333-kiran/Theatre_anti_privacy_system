import { Router } from "express";
import {
  getSecurityStats,
  getSecurityAuditLogs,
  getActiveThreats,
  revokeSessionToken,
} from "../controllers/securityController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Strict Admin-Only Security Operations (SOC) Endpoints
router.use(authenticateJwt);
router.use(requireRole(["ADMIN"]));

router.get("/stats", getSecurityStats);
router.get("/audit-logs", getSecurityAuditLogs);
router.get("/threats", getActiveThreats);
router.post("/tokens/revoke", revokeSessionToken);

export default router;
