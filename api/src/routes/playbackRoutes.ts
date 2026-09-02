import { Router } from "express";
import {
  authorizePlaybackSession,
  startPlaybackStream,
  sendPlaybackHeartbeat,
  terminatePlaybackSession,
  getPlaybackSessions,
  getPlaybackStats,
  serveHlsMasterManifest,
  serveHlsVariantManifest,
  serveHlsSegment,
  serveAssetThumbnail,
} from "../controllers/playbackController";
import { authenticateJwt, requireRole } from "../middleware/auth";
import { playbackLimiter } from "../middleware/security";

const router = Router();

// Public / Audience Playback Authorization & Heartbeat Endpoints
router.post("/authorize", playbackLimiter, authorizePlaybackSession);
router.post("/session/start", startPlaybackStream);
router.post("/session/heartbeat", sendPlaybackHeartbeat);
router.post("/session/terminate", terminatePlaybackSession);

// HLS Stream Delivery Endpoints (Protected via short-lived playback token)
router.get("/stream/:streamKey/master.m3u8", serveHlsMasterManifest);
router.get("/stream/:streamKey/:variant.m3u8", serveHlsVariantManifest);
router.get("/stream/:streamKey/:segment", serveHlsSegment);
router.get("/thumbnail/:streamKey", serveAssetThumbnail);

// Protected Admin Monitoring & Telemetry
router.use(authenticateJwt);

router.get("/sessions", getPlaybackSessions);
router.get("/stats", getPlaybackStats);

export default router;
