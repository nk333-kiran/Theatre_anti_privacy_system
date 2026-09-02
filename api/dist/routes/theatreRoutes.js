"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const theatreController_1 = require("../controllers/theatreController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public permanent Theatre QR routes (Zero PII, used when attendees scan printed lobby/entrance QR)
router.get("/public/qr/:code", theatreController_1.getTheatreByQrCode);
router.post("/public/associate-ticket", theatreController_1.associateAndActivateTicket);
// Protect all admin theatre management routes
router.use(auth_1.authenticateJwt);
router.get("/", theatreController_1.getTheatres);
router.get("/:id", theatreController_1.getTheatreById);
// Modifications restricted to ADMIN and THEATRE_ADMIN
router.post("/", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), theatreController_1.createTheatre);
router.put("/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), theatreController_1.updateTheatre);
router.delete("/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), theatreController_1.deleteTheatre);
router.post("/:id/regenerate-qr", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), theatreController_1.regenerateTheatreQr);
// Screen sub-routes
router.post("/:id/screens", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), theatreController_1.addScreen);
router.put("/screens/:screenId", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), theatreController_1.updateScreen);
router.delete("/screens/:screenId", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), theatreController_1.deleteScreen);
exports.default = router;
