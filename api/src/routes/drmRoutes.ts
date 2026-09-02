import { Router } from "express";
import {
  getDrmStatus,
  prepareAssetDrm,
  getAssetDrmStatus,
  revokeAssetDrm,
  requestDrmLicense,
  getDrmMonitoringStats,
  getDrmLicenses,
} from "../controllers/drmController";
import { authenticateJwt, requireRole } from "../middleware/auth";
import { drmLicenseLimiter } from "../middleware/security";

const router = Router();

// Public / Audience Endpoints
router.get("/status", getDrmStatus);
router.post("/license", drmLicenseLimiter, requestDrmLicense);

// Protected Studio & Admin Endpoints
router.use(authenticateJwt);

router.post("/assets/:assetId/prepare", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), prepareAssetDrm);
router.get("/assets/:assetId/status", getAssetDrmStatus);
router.post("/assets/:assetId/revoke", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), revokeAssetDrm);

// Admin DRM Telemetry & Monitoring
router.get("/monitoring/stats", getDrmMonitoringStats);
router.get("/monitoring/licenses", getDrmLicenses);

export default router;
