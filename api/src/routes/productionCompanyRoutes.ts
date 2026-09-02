import { Router } from "express";
import {
  getProductionCompanies,
  createProductionCompany,
  updateProductionCompany,
  getProductionMovies,
  createProductionMovie,
  updateProductionMovie,
  addContentAsset,
  deleteContentAsset,
  getMovieReleases,
  createMovieRelease,
  approveMovieRelease,
  rejectMovieRelease,
  getMovieAudits,
  getProductionCompanyStats,
} from "../controllers/productionCompanyController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Protect all production routes
router.use(authenticateJwt);

// Production Company CRUD
router.get("/companies", getProductionCompanies);
router.post("/companies", requireRole(["ADMIN"]), createProductionCompany);
router.put("/companies/:id", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), updateProductionCompany);

// Movie Content & Asset Lifecycle Management
router.get("/movies", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getProductionMovies);
router.post("/movies", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), createProductionMovie);
router.put("/movies/:id", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), updateProductionMovie);
router.post("/movies/:id/assets", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), addContentAsset);
router.delete("/movies/assets/:assetId", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), deleteContentAsset);

// Distribution & Release Authorizations
router.get("/releases", getMovieReleases);
router.post("/releases", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), createMovieRelease);
router.post("/releases/:id/approve", requireRole(["ADMIN"]), approveMovieRelease);
router.post("/releases/:id/reject", requireRole(["ADMIN"]), rejectMovieRelease);

// Audits & Production Stats
router.get("/audits", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getMovieAudits);
router.get("/stats", requireRole(["ADMIN", "PRODUCTION_COMPANY"]), getProductionCompanyStats);

export default router;
