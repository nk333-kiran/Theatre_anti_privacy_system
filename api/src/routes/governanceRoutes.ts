import { Router } from "express";
import { GovernanceController } from "../controllers/governanceController";
import { authenticateJwt, requireRole } from "../middleware/auth";

export const governanceRouter = Router();

// Protect all governance routes with authentication
governanceRouter.use(authenticateJwt);

// ----------------------------------------------------
// POLICIES
// ----------------------------------------------------
governanceRouter.get("/policies", requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), GovernanceController.listPolicies);
governanceRouter.get("/policies/:id", requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), GovernanceController.getPolicy);
governanceRouter.post("/policies", requireRole(["ADMIN", "THEATRE_ADMIN"]), GovernanceController.createPolicy);
governanceRouter.put("/policies/:id", requireRole(["ADMIN", "THEATRE_ADMIN"]), GovernanceController.updatePolicy);
governanceRouter.post("/policies/:id/rollback", requireRole(["ADMIN", "THEATRE_ADMIN"]), GovernanceController.rollbackPolicy);

// ----------------------------------------------------
// ZERO-TRUST EVALUATION & DECISIONS
// ----------------------------------------------------
governanceRouter.get("/decisions", requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), GovernanceController.listDecisions);
governanceRouter.post("/trust/evaluate", GovernanceController.evaluateTrust);

// ----------------------------------------------------
// DEVICES
// ----------------------------------------------------
governanceRouter.get("/devices", requireRole(["ADMIN", "THEATRE_ADMIN"]), GovernanceController.listDevices);
governanceRouter.post("/devices/:id/trust", requireRole(["ADMIN"]), GovernanceController.updateDeviceTrust);

// ----------------------------------------------------
// PRIVILEGED ACTIONS
// ----------------------------------------------------
governanceRouter.get("/privileged-actions", requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), GovernanceController.listPrivilegedActions);
governanceRouter.post("/privileged-actions", GovernanceController.requestPrivilegedAction);
governanceRouter.post("/privileged-actions/:id/approve", requireRole(["ADMIN"]), GovernanceController.approvePrivilegedAction);
governanceRouter.post("/privileged-actions/:id/reject", requireRole(["ADMIN"]), GovernanceController.rejectPrivilegedAction);
governanceRouter.post("/privileged-actions/:id/execute", GovernanceController.executePrivilegedAction);

// ----------------------------------------------------
// BREAK-GLASS EMERGENCY ACCESS
// ----------------------------------------------------
governanceRouter.get("/break-glass", requireRole(["ADMIN"]), GovernanceController.listBreakGlassSessions);
governanceRouter.post("/break-glass/start", requireRole(["ADMIN"]), GovernanceController.startBreakGlass);
governanceRouter.post("/break-glass/:id/close", requireRole(["ADMIN"]), GovernanceController.closeBreakGlass);
governanceRouter.post("/break-glass/:id/review", requireRole(["ADMIN"]), GovernanceController.reviewBreakGlass);

// ----------------------------------------------------
// STATS & AUDIT
// ----------------------------------------------------
governanceRouter.get("/stats", requireRole(["ADMIN", "THEATRE_ADMIN", "PRODUCTION_COMPANY"]), GovernanceController.getStats);
governanceRouter.get("/audit", requireRole(["ADMIN", "THEATRE_ADMIN"]), GovernanceController.listAuditEvents);
