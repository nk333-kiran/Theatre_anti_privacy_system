"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productionCompanyController_1 = require("../controllers/productionCompanyController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect all production routes
router.use(auth_1.authenticateJwt);
// Production Company CRUD
router.get("/companies", productionCompanyController_1.getProductionCompanies);
router.post("/companies", (0, auth_1.requireRole)(["ADMIN"]), productionCompanyController_1.createProductionCompany);
router.put("/companies/:id", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.updateProductionCompany);
// Movie Content & Asset Lifecycle Management
router.get("/movies", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.getProductionMovies);
router.post("/movies", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.createProductionMovie);
router.put("/movies/:id", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.updateProductionMovie);
router.post("/movies/:id/assets", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.addContentAsset);
router.delete("/movies/assets/:assetId", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.deleteContentAsset);
// Distribution & Release Authorizations
router.get("/releases", productionCompanyController_1.getMovieReleases);
router.post("/releases", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.createMovieRelease);
router.post("/releases/:id/approve", (0, auth_1.requireRole)(["ADMIN"]), productionCompanyController_1.approveMovieRelease);
router.post("/releases/:id/reject", (0, auth_1.requireRole)(["ADMIN"]), productionCompanyController_1.rejectMovieRelease);
// Audits & Production Stats
router.get("/audits", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.getMovieAudits);
router.get("/stats", (0, auth_1.requireRole)(["ADMIN", "PRODUCTION_COMPANY"]), productionCompanyController_1.getProductionCompanyStats);
exports.default = router;
