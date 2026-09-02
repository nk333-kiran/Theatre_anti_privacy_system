"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticketController_1 = require("../controllers/ticketController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect ticket endpoints
router.use(auth_1.authenticateJwt);
router.get("/", ticketController_1.getTickets);
router.get("/:id", ticketController_1.getTicketById);
// Restricted ticket mutations (THEATRE_STAFF cannot create or cancel tickets)
router.post("/", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), ticketController_1.createTickets);
router.patch("/:id/cancel", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), ticketController_1.cancelTicket);
exports.default = router;
