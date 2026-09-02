import { Router } from "express";
import {
  uploadVideoAsset,
  getVideoAssets,
  getVideoAssetById,
  processVideoAsset,
  retryVideoAssetProcessing,
  getVideoAssetStatus,
  getFFmpegDiagnostics,
} from "../controllers/videoAssetController";
import { authenticateJwt, requireRole } from "../middleware/auth";
import { videoUpload } from "../middleware/upload";

const router = Router();

router.use(authenticateJwt);

// Upload video master
router.post(
  "/upload",
  requireRole(["ADMIN", "PRODUCTION_COMPANY"]),
  videoUpload.single("video"),
  uploadVideoAsset
);

// Diagnostic health check
router.get("/diagnostics/ffmpeg", getFFmpegDiagnostics);

// List assets
router.get("/", getVideoAssets);

// Asset status & details
router.get("/:id/status", getVideoAssetStatus);
router.get("/:id", getVideoAssetById);

// Processing triggers
router.post("/:id/process", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), processVideoAsset);
router.post("/:id/retry", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), retryVideoAssetProcessing);

export default router;
