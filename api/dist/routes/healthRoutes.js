"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthController_1 = require("../controllers/healthController");
const router = (0, express_1.Router)();
// Fast Liveness & Health Probes
router.get("/health", healthController_1.getBasicHealth);
router.get("/health/live", healthController_1.getLivenessHealth);
router.get("/health/ready", healthController_1.getReadinessHealth);
router.get("/health/dependencies", healthController_1.getDependenciesHealth);
router.get("/health/version", healthController_1.getVersionHealth);
router.get("/health/db", healthController_1.getDatabaseHealth);
router.get("/health/system", healthController_1.getSystemHealth);
exports.default = router;
