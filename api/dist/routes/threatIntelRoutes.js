"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const threatIntelController_1 = require("../controllers/threatIntelController");
const router = (0, express_1.Router)();
// 1. Unauthenticated / HMAC-validated Webhook Ingestion
router.post("/webhook/:sourceId", threatIntelController_1.ThreatIntelController.handleWebhook);
// 2. Authenticated Endpoints
router.use(auth_1.authenticateJwt);
// Sources & Health
router.get("/sources", threatIntelController_1.ThreatIntelController.listSources);
router.post("/sources", (0, auth_1.requireRole)(["ADMIN"]), threatIntelController_1.ThreatIntelController.createSource);
router.put("/sources/:id", (0, auth_1.requireRole)(["ADMIN"]), threatIntelController_1.ThreatIntelController.updateSource);
router.post("/sources/:id/sync", (0, auth_1.requireRole)(["ADMIN"]), threatIntelController_1.ThreatIntelController.syncSource);
router.get("/source-health", threatIntelController_1.ThreatIntelController.getSourceHealth);
// Feeds & Imports
router.get("/feeds", threatIntelController_1.ThreatIntelController.listFeeds);
router.post("/feeds/import", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), threatIntelController_1.ThreatIntelController.importFeed);
// Indicators & Validation
router.get("/indicators", threatIntelController_1.ThreatIntelController.listIndicators);
router.get("/indicators/:id", threatIntelController_1.ThreatIntelController.getIndicatorById);
router.post("/indicators/:id/validate", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), threatIntelController_1.ThreatIntelController.validateIndicator);
// Matches
router.get("/matches", threatIntelController_1.ThreatIntelController.listMatches);
// Campaigns
router.get("/campaigns", threatIntelController_1.ThreatIntelController.listCampaigns);
router.post("/campaigns", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), threatIntelController_1.ThreatIntelController.createCampaign);
router.get("/campaigns/:id", threatIntelController_1.ThreatIntelController.getCampaignById);
// Analysis & Stats
router.post("/analyze", threatIntelController_1.ThreatIntelController.analyzeInput);
router.get("/stats", threatIntelController_1.ThreatIntelController.getStats);
exports.default = router;
