import { Router } from "express";
import { authenticateJwt, requireRole } from "../middleware/auth";
import { ProductionController } from "../controllers/productionController";

const router = Router();

// 1. Safe Public Endpoints (Accessible for probes, scrapers, version metadata)
router.get("/version", ProductionController.getVersion);
router.get("/lifecycle", ProductionController.getLifecycle);
router.get("/sla", ProductionController.getSlaStatus);
router.get("/metrics/prometheus", ProductionController.getPrometheusMetrics);

// 2. Protected Production Operations (Require JWT & Admin / Production Company role)
router.use(authenticateJwt);
router.use(requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]));

router.get("/readiness", ProductionController.getReadiness);
router.post("/readiness/validate", ProductionController.validateReadiness);
router.get("/metrics", ProductionController.getMetrics);
router.get("/alerts", ProductionController.getAlerts);
router.post("/migration/safety-check", ProductionController.checkMigrationSafety);
router.get("/posture", ProductionController.getProductionPosture);
router.get("/release/history", ProductionController.getReleaseHistory);
router.post("/release/evaluate-promotion", ProductionController.evaluatePromotion);

export default router;
