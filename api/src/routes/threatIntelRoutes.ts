import { Router } from "express";
import { authenticateJwt, requireRole } from "../middleware/auth";
import { ThreatIntelController } from "../controllers/threatIntelController";

const router = Router();

// 1. Unauthenticated / HMAC-validated Webhook Ingestion
router.post("/webhook/:sourceId", ThreatIntelController.handleWebhook);

// 2. Authenticated Endpoints
router.use(authenticateJwt);

// Sources & Health
router.get("/sources", ThreatIntelController.listSources);
router.post("/sources", requireRole(["ADMIN"]), ThreatIntelController.createSource);
router.put("/sources/:id", requireRole(["ADMIN"]), ThreatIntelController.updateSource);
router.post("/sources/:id/sync", requireRole(["ADMIN"]), ThreatIntelController.syncSource);
router.get("/source-health", ThreatIntelController.getSourceHealth);

// Feeds & Imports
router.get("/feeds", ThreatIntelController.listFeeds);
router.post("/feeds/import", requireRole(["ADMIN", "THEATRE_ADMIN"]), ThreatIntelController.importFeed);

// Indicators & Validation
router.get("/indicators", ThreatIntelController.listIndicators);
router.get("/indicators/:id", ThreatIntelController.getIndicatorById);
router.post("/indicators/:id/validate", requireRole(["ADMIN", "THEATRE_ADMIN"]), ThreatIntelController.validateIndicator);

// Matches
router.get("/matches", ThreatIntelController.listMatches);

// Campaigns
router.get("/campaigns", ThreatIntelController.listCampaigns);
router.post("/campaigns", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), ThreatIntelController.createCampaign);
router.get("/campaigns/:id", ThreatIntelController.getCampaignById);

// Analysis & Stats
router.post("/analyze", ThreatIntelController.analyzeInput);
router.get("/stats", ThreatIntelController.getStats);

export default router;
