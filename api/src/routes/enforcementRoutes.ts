import { Router } from "express";
import { authenticateJwt, requireRole } from "../middleware/auth";
import {
  createEnforcementAction,
  listEnforcementActions,
  getEnforcementActionById,
  generateEnforcementPackage,
  submitForReview,
  approveEnforcementAction,
  rejectEnforcementAction,
  submitEnforcementAction,
  completeEnforcementAction,
  cancelEnforcementAction,
  verifyPackageIntegrity,
} from "../controllers/enforcementController";

const router = Router();

// Apply JWT authentication across all enforcement endpoints
router.use(authenticateJwt);

router.post(
  "/",
  requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]),
  createEnforcementAction
);

router.get(
  "/",
  requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]),
  listEnforcementActions
);

router.get(
  "/:id",
  requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]),
  getEnforcementActionById
);

router.get(
  "/:id/package",
  requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]),
  generateEnforcementPackage
);

router.post(
  "/:id/review",
  requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]),
  submitForReview
);

router.post(
  "/:id/approve",
  requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]),
  approveEnforcementAction
);

router.post(
  "/:id/reject",
  requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]),
  rejectEnforcementAction
);

router.post(
  "/:id/submit",
  requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]),
  submitEnforcementAction
);

router.post(
  "/:id/complete",
  requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]),
  completeEnforcementAction
);

router.post(
  "/:id/cancel",
  requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]),
  cancelEnforcementAction
);

router.get(
  "/:id/verify",
  requireRole(["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]),
  verifyPackageIntegrity
);

export default router;
