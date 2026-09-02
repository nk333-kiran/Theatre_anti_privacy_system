"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verificationController_1 = require("../controllers/verificationController");
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
// Protect verification endpoints - accessible by THEATRE_STAFF, THEATRE_ADMIN, and ADMIN
router.use(auth_1.authenticateJwt);
router.use((0, auth_1.requireRole)(["THEATRE_STAFF", "THEATRE_ADMIN", "ADMIN"]));
router.post("/verify", security_1.verificationLimiter, verificationController_1.verifySecurityEntry);
router.get("/", verificationController_1.getVerifications);
router.get("/stats", verificationController_1.getVerificationStats);
exports.default = router;
