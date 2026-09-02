import { Router } from "express";
import {
  getTheatres,
  getTheatreById,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  addScreen,
  updateScreen,
  deleteScreen,
  regenerateTheatreQr,
  getTheatreByQrCode,
  associateAndActivateTicket,
} from "../controllers/theatreController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Public permanent Theatre QR routes (Zero PII, used when attendees scan printed lobby/entrance QR)
router.get("/public/qr/:code", getTheatreByQrCode);
router.post("/public/associate-ticket", associateAndActivateTicket);

// Protect all admin theatre management routes
router.use(authenticateJwt);

router.get("/", getTheatres);
router.get("/:id", getTheatreById);

// Modifications restricted to ADMIN and THEATRE_ADMIN
router.post("/", requireRole(["ADMIN", "THEATRE_ADMIN"]), createTheatre);
router.put("/:id", requireRole(["ADMIN", "THEATRE_ADMIN"]), updateTheatre);
router.delete("/:id", requireRole(["ADMIN", "THEATRE_ADMIN"]), deleteTheatre);
router.post("/:id/regenerate-qr", requireRole(["ADMIN", "THEATRE_ADMIN"]), regenerateTheatreQr);

// Screen sub-routes
router.post("/:id/screens", requireRole(["ADMIN", "THEATRE_ADMIN"]), addScreen);
router.put("/screens/:screenId", requireRole(["ADMIN", "THEATRE_ADMIN"]), updateScreen);
router.delete("/screens/:screenId", requireRole(["ADMIN", "THEATRE_ADMIN"]), deleteScreen);

export default router;


