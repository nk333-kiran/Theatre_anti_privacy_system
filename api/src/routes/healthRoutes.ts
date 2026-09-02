import { Router } from "express";
import {
  getBasicHealth,
  getLivenessHealth,
  getReadinessHealth,
  getDependenciesHealth,
  getDatabaseHealth,
  getSystemHealth,
  getVersionHealth,
} from "../controllers/healthController";

const router = Router();

// Fast Liveness & Health Probes
router.get("/health", getBasicHealth);
router.get("/health/live", getLivenessHealth);
router.get("/health/ready", getReadinessHealth);
router.get("/health/dependencies", getDependenciesHealth);
router.get("/health/version", getVersionHealth);
router.get("/health/db", getDatabaseHealth);
router.get("/health/system", getSystemHealth);

export default router;
