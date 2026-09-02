import { Router } from "express";
import { getDashboardStats, getRecentOverview } from "../controllers/dashboardController";
import { authenticateJwt } from "../middleware/auth";

const router = Router();

// Dashboard routes protected by authentication
router.get("/stats", authenticateJwt, getDashboardStats);
router.get("/overview", authenticateJwt, getRecentOverview);

export default router;
