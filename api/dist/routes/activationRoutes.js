"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activationController_1 = require("../controllers/activationController");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
// Public mobile activation routes
router.get("/verify/:code", activationController_1.verifyActivationToken);
router.post("/activate", security_1.activationLimiter, activationController_1.activateTicket);
exports.default = router;
