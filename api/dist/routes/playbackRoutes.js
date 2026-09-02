"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const playbackController_1 = require("../controllers/playbackController");
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
// Public / Audience Playback Authorization & Heartbeat Endpoints
router.post("/authorize", security_1.playbackLimiter, playbackController_1.authorizePlaybackSession);
router.post("/session/start", playbackController_1.startPlaybackStream);
router.post("/session/heartbeat", playbackController_1.sendPlaybackHeartbeat);
router.post("/session/terminate", playbackController_1.terminatePlaybackSession);
// HLS Stream Delivery Endpoints (Protected via short-lived playback token)
router.get("/stream/:streamKey/master.m3u8", playbackController_1.serveHlsMasterManifest);
router.get("/stream/:streamKey/:variant.m3u8", playbackController_1.serveHlsVariantManifest);
router.get("/stream/:streamKey/:segment", playbackController_1.serveHlsSegment);
router.get("/thumbnail/:streamKey", playbackController_1.serveAssetThumbnail);
// Protected Admin Monitoring & Telemetry
router.use(auth_1.authenticateJwt);
router.get("/sessions", playbackController_1.getPlaybackSessions);
router.get("/stats", playbackController_1.getPlaybackStats);
exports.default = router;
