import { Router } from "express";
import {
  verifySecurityEntry,
  getVerifications,
  getVerificationStats,
} from "../controllers/verificationController";
import { authenticateJwt, requireRole } from "../middleware/auth";
import { verificationLimiter } from "../middleware/security";

const router = Router();

// Protect verification endpoints - accessible by THEATRE_STAFF, THEATRE_ADMIN, and ADMIN
router.use(authenticateJwt);
router.use(requireRole(["THEATRE_STAFF", "THEATRE_ADMIN", "ADMIN"]));

router.post("/verify", verificationLimiter, verifySecurityEntry);
router.get("/", getVerifications);
router.get("/stats", getVerificationStats);

export default router;
