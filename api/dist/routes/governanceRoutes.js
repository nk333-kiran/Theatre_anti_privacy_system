"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceRouter = void 0;
const express_1 = require("express");
const governanceController_1 = require("../controllers/governanceController");
const auth_1 = require("../middleware/auth");
exports.governanceRouter = (0, express_1.Router)();
// Protect all governance routes with authentication
exports.governanceRouter.use(auth_1.authenticateJwt);
// ----------------------------------------------------
// POLICIES
// ----------------------------------------------------
exports.governanceRouter.get("/policies", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), governanceController_1.GovernanceController.listPolicies);
exports.governanceRouter.get("/policies/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), governanceController_1.GovernanceController.getPolicy);
exports.governanceRouter.post("/policies", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), governanceController_1.GovernanceController.createPolicy);
exports.governanceRouter.put("/policies/:id", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), governanceController_1.GovernanceController.updatePolicy);
exports.governanceRouter.post("/policies/:id/rollback", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), governanceController_1.GovernanceController.rollbackPolicy);
// ----------------------------------------------------
// ZERO-TRUST EVALUATION & DECISIONS
// ----------------------------------------------------
exports.governanceRouter.get("/decisions", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), governanceController_1.GovernanceController.listDecisions);
exports.governanceRouter.post("/trust/evaluate", governanceController_1.GovernanceController.evaluateTrust);
// ----------------------------------------------------
// DEVICES
// ----------------------------------------------------
exports.governanceRouter.get("/devices", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), governanceController_1.GovernanceController.listDevices);
exports.governanceRouter.post("/devices/:id/trust", (0, auth_1.requireRole)(["ADMIN"]), governanceController_1.GovernanceController.updateDeviceTrust);
// ----------------------------------------------------
// PRIVILEGED ACTIONS
// ----------------------------------------------------
exports.governanceRouter.get("/privileged-actions", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), governanceController_1.GovernanceController.listPrivilegedActions);
exports.governanceRouter.post("/privileged-actions", governanceController_1.GovernanceController.requestPrivilegedAction);
exports.governanceRouter.post("/privileged-actions/:id/approve", (0, auth_1.requireRole)(["ADMIN"]), governanceController_1.GovernanceController.approvePrivilegedAction);
exports.governanceRouter.post("/privileged-actions/:id/reject", (0, auth_1.requireRole)(["ADMIN"]), governanceController_1.GovernanceController.rejectPrivilegedAction);
exports.governanceRouter.post("/privileged-actions/:id/execute", governanceController_1.GovernanceController.executePrivilegedAction);
// ----------------------------------------------------
// BREAK-GLASS EMERGENCY ACCESS
// ----------------------------------------------------
exports.governanceRouter.get("/break-glass", (0, auth_1.requireRole)(["ADMIN"]), governanceController_1.GovernanceController.listBreakGlassSessions);
exports.governanceRouter.post("/break-glass/start", (0, auth_1.requireRole)(["ADMIN"]), governanceController_1.GovernanceController.startBreakGlass);
exports.governanceRouter.post("/break-glass/:id/close", (0, auth_1.requireRole)(["ADMIN"]), governanceController_1.GovernanceController.closeBreakGlass);
exports.governanceRouter.post("/break-glass/:id/review", (0, auth_1.requireRole)(["ADMIN"]), governanceController_1.GovernanceController.reviewBreakGlass);
// ----------------------------------------------------
// STATS & AUDIT
// ----------------------------------------------------
exports.governanceRouter.get("/stats", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), governanceController_1.GovernanceController.getStats);
exports.governanceRouter.get("/audit", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), governanceController_1.GovernanceController.listAuditEvents);
