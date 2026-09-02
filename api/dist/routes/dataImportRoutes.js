"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dataImportController_1 = require("../controllers/dataImportController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Allow authenticated admins to view templates and perform imports
router.use(auth_1.authenticateJwt);
router.get("/templates", dataImportController_1.getImportTemplates);
router.post("/validate", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), dataImportController_1.validateImportData);
router.post("/commit", (0, auth_1.requireRole)(["ADMIN", "THEATRE_ADMIN"]), dataImportController_1.commitImportData);
exports.default = router;
