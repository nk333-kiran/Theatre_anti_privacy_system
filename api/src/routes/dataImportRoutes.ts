import { Router } from "express";
import {
  validateImportData,
  commitImportData,
  getImportTemplates,
} from "../controllers/dataImportController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Allow authenticated admins to view templates and perform imports
router.use(authenticateJwt);

router.get("/templates", getImportTemplates);
router.post("/validate", requireRole(["ADMIN", "THEATRE_ADMIN"]), validateImportData);
router.post("/commit", requireRole(["ADMIN", "THEATRE_ADMIN"]), commitImportData);

export default router;
