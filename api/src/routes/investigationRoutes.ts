import { Router } from "express";
import { authenticateJwt, requireRole } from "../middleware/auth";
import {
  createCase,
  listCases,
  getCaseById,
  updateCase,
  assignAnalyst,
  updateStatus,
  addNote,
  linkEvidence,
  requestContainment,
  resolveCase,
  closeCase,
  verifyCaseIntegrity,
  createAutomatedPackage,
} from "../controllers/investigationController";

const router = Router();

router.use(authenticateJwt);

router.post("/", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), createCase);
router.get("/", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), listCases);
router.get("/:id", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), getCaseById);
router.put("/:id", requireRole(["ADMIN", "THEATRE_STAFF"]), updateCase);
router.post("/:id/assign", requireRole(["ADMIN", "THEATRE_STAFF"]), assignAnalyst);
router.post("/:id/status", requireRole(["ADMIN", "THEATRE_STAFF"]), updateStatus);
router.post("/:id/notes", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), addNote);
router.post("/:id/evidence", requireRole(["ADMIN", "THEATRE_STAFF"]), linkEvidence);
router.post("/:id/containment", requireRole(["ADMIN", "THEATRE_STAFF"]), requestContainment);
router.post("/:id/resolve", requireRole(["ADMIN", "THEATRE_STAFF"]), resolveCase);
router.post("/:id/close", requireRole(["ADMIN", "THEATRE_STAFF"]), closeCase);
router.post("/:id/verify-integrity", requireRole(["ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"]), verifyCaseIntegrity);
router.post("/:id/automated-package", requireRole(["ADMIN", "THEATRE_STAFF"]), createAutomatedPackage);

export default router;
