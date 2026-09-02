"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const productionController_1 = require("../controllers/productionController");
const router = (0, express_1.Router)();
// 1. Safe Public Endpoints (Accessible for probes, scrapers, version metadata)
router.get("/version", productionController_1.ProductionController.getVersion);
router.get("/lifecycle", productionController_1.ProductionController.getLifecycle);
router.get("/sla", productionController_1.ProductionController.getSlaStatus);
router.get("/metrics/prometheus", productionController_1.ProductionController.getPrometheusMetrics);
// 2. Protected Production Operations (Require JWT & Admin / Production Company role)
router.use(auth_1.authenticateJwt);
router.use((0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]));
router.get("/readiness", productionController_1.ProductionController.getReadiness);
router.post("/readiness/validate", productionController_1.ProductionController.validateReadiness);
router.get("/metrics", productionController_1.ProductionController.getMetrics);
router.get("/alerts", productionController_1.ProductionController.getAlerts);
router.post("/migration/safety-check", productionController_1.ProductionController.checkMigrationSafety);
router.get("/posture", productionController_1.ProductionController.getProductionPosture);
router.get("/release/history", productionController_1.ProductionController.getReleaseHistory);
router.post("/release/evaluate-promotion", productionController_1.ProductionController.evaluatePromotion);
exports.default = router;
