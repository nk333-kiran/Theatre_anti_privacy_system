"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drmController_1 = require("../controllers/drmController");
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
// Public / Audience Endpoints
router.get("/status", drmController_1.getDrmStatus);
router.post("/license", security_1.drmLicenseLimiter, drmController_1.requestDrmLicense);
// Protected Studio & Admin Endpoints
router.use(auth_1.authenticateJwt);
router.post("/assets/:assetId/prepare", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), drmController_1.prepareAssetDrm);
router.get("/assets/:assetId/status", drmController_1.getAssetDrmStatus);
router.post("/assets/:assetId/revoke", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), drmController_1.revokeAssetDrm);
// Admin DRM Telemetry & Monitoring
router.get("/monitoring/stats", drmController_1.getDrmMonitoringStats);
router.get("/monitoring/licenses", drmController_1.getDrmLicenses);
exports.default = router;
