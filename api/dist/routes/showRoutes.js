"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const showController_1 = require("../controllers/showController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect show routes
router.use(auth_1.authenticateJwt);
router.get("/", showController_1.getShows);
router.get("/:id", showController_1.getShowById);
// Restricted show modifications
router.post("/", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), showController_1.createShow);
router.put("/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), showController_1.updateShow);
router.patch("/:id/cancel", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), showController_1.cancelShow);
router.delete("/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), showController_1.deleteShow);
exports.default = router;
