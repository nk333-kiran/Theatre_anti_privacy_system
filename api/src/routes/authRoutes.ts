import { Router } from "express";
import { login, register, logout, getProfile } from "../controllers/authController";
import { authenticateJwt } from "../middleware/auth";
import { authLimiter } from "../middleware/security";

const router = Router();

router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);
router.post("/signup", authLimiter, register);
router.post("/logout", authenticateJwt, logout);
router.get("/profile", authenticateJwt, getProfile);

export default router;

