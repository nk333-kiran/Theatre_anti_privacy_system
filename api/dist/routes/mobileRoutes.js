"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mobileController_1 = require("../controllers/mobileController");
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
// All mobile operations require authentication
router.use(auth_1.authenticateJwt);
// 1. Ticket QR Verification & Protected Screening Session Creation
router.post("/verify-ticket", security_1.verificationLimiter, mobileController_1.MobileController.verifyTicket);
// 2. Secure Ticket QR Retrieval / Generation for existing ticket
router.get("/tickets/:id/qr", mobileController_1.MobileController.getTicketQr);
// 3. Protected Screening Session Retrieval
router.get("/session/:sessionId", mobileController_1.MobileController.getSession);
// 4. Dynamic Session Watermark Generation & Rotation
router.get("/session/:sessionId/watermark", mobileController_1.MobileController.getSessionWatermark);
// 5. Forensic Session Attribution Lookup
router.post("/watermark/attribute", mobileController_1.MobileController.attributeWatermark);
// 6. Forensic Evidence Vault Logging
router.post("/watermark/evidence", mobileController_1.MobileController.createForensicEvidence);
// 7. Mobile Security Event Ingestion (SOC Integration)
router.post("/events", mobileController_1.MobileController.submitSecurityEvent);
exports.default = router;
