import { Router } from "express";
import {
  getTickets,
  getTicketById,
  createTickets,
  cancelTicket,
} from "../controllers/ticketController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Protect ticket endpoints
router.use(authenticateJwt);

router.get("/", getTickets);
router.get("/:id", getTicketById);

// Restricted ticket mutations (THEATRE_STAFF cannot create or cancel tickets)
router.post("/", requireRole(["ADMIN", "THEATRE_ADMIN"]), createTickets);
router.patch("/:id/cancel", requireRole(["ADMIN", "THEATRE_ADMIN"]), cancelTicket);

export default router;

