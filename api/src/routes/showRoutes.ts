import { Router } from "express";
import {
  getShows,
  getShowById,
  createShow,
  updateShow,
  cancelShow,
  deleteShow,
} from "../controllers/showController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Protect show routes
router.use(authenticateJwt);

router.get("/", getShows);
router.get("/:id", getShowById);

// Restricted show modifications
router.post("/", requireRole(["ADMIN", "THEATRE_ADMIN"]), createShow);
router.put("/:id", requireRole(["ADMIN", "THEATRE_ADMIN"]), updateShow);
router.patch("/:id/cancel", requireRole(["ADMIN", "THEATRE_ADMIN"]), cancelShow);
router.delete("/:id", requireRole(["ADMIN", "THEATRE_ADMIN"]), deleteShow);

export default router;

