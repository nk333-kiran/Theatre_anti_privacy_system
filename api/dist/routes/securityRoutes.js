"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const securityController_1 = require("../controllers/securityController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Strict Admin-Only Security Operations (SOC) Endpoints
router.use(auth_1.authenticateJwt);
router.use((0, auth_1.requireRole)(["ADMIN"]));
router.get("/stats", securityController_1.getSecurityStats);
router.get("/audit-logs", securityController_1.getSecurityAuditLogs);
router.get("/threats", securityController_1.getActiveThreats);
router.post("/tokens/revoke", securityController_1.revokeSessionToken);
exports.default = router;
