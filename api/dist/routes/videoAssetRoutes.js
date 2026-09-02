"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const videoAssetController_1 = require("../controllers/videoAssetController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJwt);
// Upload video master
router.post("/upload", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), upload_1.videoUpload.single("video"), videoAssetController_1.uploadVideoAsset);
// Diagnostic health check
router.get("/diagnostics/ffmpeg", videoAssetController_1.getFFmpegDiagnostics);
// List assets
router.get("/", videoAssetController_1.getVideoAssets);
// Asset status & details
router.get("/:id/status", videoAssetController_1.getVideoAssetStatus);
router.get("/:id", videoAssetController_1.getVideoAssetById);
// Processing triggers
router.post("/:id/process", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), videoAssetController_1.processVideoAsset);
router.post("/:id/retry", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), videoAssetController_1.retryVideoAssetProcessing);
exports.default = router;
