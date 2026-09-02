"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const operationsController_1 = require("../controllers/operationsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All operational routes are strictly restricted to ADMIN
router.use(auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN"]));
// Observability & Telemetry
router.get("/health", operationsController_1.getOperationsHealth);
router.get("/metrics", operationsController_1.getOperationsMetrics);
router.get("/dependencies", operationsController_1.getOperationsDependencies);
router.get("/scaling", operationsController_1.getScalingTelemetry);
router.post("/idempotency/check", operationsController_1.checkIdempotencyEndpoint);
router.post("/maintenance", operationsController_1.toggleMaintenanceMode);
// Database Backup & Disaster Recovery
router.get("/backups", operationsController_1.listBackups);
router.post("/backups/create", operationsController_1.triggerBackup);
router.post("/backups/:backupId/verify", operationsController_1.verifyBackup);
router.post("/backups/prune", operationsController_1.pruneBackups);
router.get("/disaster-recovery", operationsController_1.getDisasterRecoveryStatus);
exports.default = router;
