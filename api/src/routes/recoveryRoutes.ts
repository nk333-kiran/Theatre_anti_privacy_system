import { Router } from "express";
import { RecoveryController } from "../controllers/recoveryController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Recovery status & verification endpoints
router.get("/status", authenticateJwt, RecoveryController.getStatus);
router.get("/backups", authenticateJwt, RecoveryController.listBackups);
router.post("/backups/:id/verify", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), RecoveryController.verifyBackup);
router.get("/evidence/integrity", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), RecoveryController.verifyEvidenceIntegrity);

// Recovery workflow lifecycle endpoints
router.post("/request", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), RecoveryController.requestRecovery);
router.post("/:id/approve", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN"]), RecoveryController.approveRecovery);
router.post("/:id/validate", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN"]), RecoveryController.validateRecovery);
router.post("/:id/execute", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN"]), RecoveryController.executeRecovery);
router.post("/:id/rollback", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN"]), RecoveryController.rollbackRecovery);

// Immutable audit trail
router.get("/audit", authenticateJwt, requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), RecoveryController.getAuditTrail);

export default router;
