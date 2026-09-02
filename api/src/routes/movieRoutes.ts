import { Router } from "express";
import {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../controllers/movieController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Protect movie routes
router.use(authenticateJwt);

router.get("/", getMovies);
router.get("/:id", getMovieById);

// Restricted mutations
router.post("/", requireRole(["ADMIN", "THEATRE_ADMIN"]), createMovie);
router.put("/:id", requireRole(["ADMIN", "THEATRE_ADMIN"]), updateMovie);
router.delete("/:id", requireRole(["ADMIN", "THEATRE_ADMIN"]), deleteMovie);

export default router;

