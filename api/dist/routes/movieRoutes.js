"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const movieController_1 = require("../controllers/movieController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect movie routes
router.use(auth_1.authenticateJwt);
router.get("/", movieController_1.getMovies);
router.get("/:id", movieController_1.getMovieById);
// Restricted mutations
router.post("/", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), movieController_1.createMovie);
router.put("/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), movieController_1.updateMovie);
router.delete("/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), movieController_1.deleteMovie);
exports.default = router;
