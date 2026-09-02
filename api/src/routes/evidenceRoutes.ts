import { Router } from "express";
import { authenticateJwt, requireRole } from "../middleware/auth";
import {
  createEvidence,
  listEvidence,
  getEvidenceById,
  getEvidenceChain,
  verifyEvidence,
  toggleLegalHold,
  exportEvidence,
  getEvidenceStats,
} from "../controllers/evidenceController";

const router = Router();

router.use(authenticateJwt);

router.post("/", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), createEvidence);
router.get("/", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), listEvidence);
router.get("/stats", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), getEvidenceStats);
router.get("/:id", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), getEvidenceById);
router.get("/:id/chain", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), getEvidenceChain);
router.post("/:id/verify", requireRole(["ADMIN", "THEATRE_STAFF"]), verifyEvidence);
router.post("/:id/legal-hold", requireRole(["ADMIN"]), toggleLegalHold);
router.post("/:id/export", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), exportEvidence);

export default router;
