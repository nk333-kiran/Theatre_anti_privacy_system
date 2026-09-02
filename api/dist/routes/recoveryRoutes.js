"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recoveryController_1 = require("../controllers/recoveryController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Recovery status & verification endpoints
router.get("/status", auth_1.authenticateJwt, recoveryController_1.RecoveryController.getStatus);
router.get("/backups", auth_1.authenticateJwt, recoveryController_1.RecoveryController.listBackups);
router.post("/backups/:id/verify", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), recoveryController_1.RecoveryController.verifyBackup);
router.get("/evidence/integrity", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), recoveryController_1.RecoveryController.verifyEvidenceIntegrity);
// Recovery workflow lifecycle endpoints
router.post("/request", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), recoveryController_1.RecoveryController.requestRecovery);
router.post("/:id/approve", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), recoveryController_1.RecoveryController.approveRecovery);
router.post("/:id/validate", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), recoveryController_1.RecoveryController.validateRecovery);
router.post("/:id/execute", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), recoveryController_1.RecoveryController.executeRecovery);
router.post("/:id/rollback", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), recoveryController_1.RecoveryController.rollbackRecovery);
// Immutable audit trail
router.get("/audit", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), recoveryController_1.RecoveryController.getAuditTrail);
exports.default = router;
