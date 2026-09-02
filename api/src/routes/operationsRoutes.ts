import { Router } from "express";
import {
  getOperationsHealth,
  getOperationsMetrics,
  getOperationsDependencies,
  toggleMaintenanceMode,
  listBackups,
  triggerBackup,
  verifyBackup,
  pruneBackups,
  getDisasterRecoveryStatus,
  getScalingTelemetry,
  checkIdempotencyEndpoint,
} from "../controllers/operationsController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// All operational routes are strictly restricted to ADMIN
router.use(authenticateJwt, requireRole(["ADMIN"]));

// Observability & Telemetry
router.get("/health", getOperationsHealth);
router.get("/metrics", getOperationsMetrics);
router.get("/dependencies", getOperationsDependencies);
router.get("/scaling", getScalingTelemetry);
router.post("/idempotency/check", checkIdempotencyEndpoint);
router.post("/maintenance", toggleMaintenanceMode);

// Database Backup & Disaster Recovery
router.get("/backups", listBackups);
router.post("/backups/create", triggerBackup);
router.post("/backups/:backupId/verify", verifyBackup);
router.post("/backups/prune", pruneBackups);
router.get("/disaster-recovery", getDisasterRecoveryStatus);

export default router;
