import { Router } from "express";
import {
  verifyActivationToken,
  activateTicket,
} from "../controllers/activationController";
import { activationLimiter } from "../middleware/security";

const router = Router();

// Public mobile activation routes
router.get("/verify/:code", verifyActivationToken);
router.post("/activate", activationLimiter, activateTicket);

export default router;
