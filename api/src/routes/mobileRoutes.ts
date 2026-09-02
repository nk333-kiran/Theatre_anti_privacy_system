import { Router } from "express";
import { MobileController } from "../controllers/mobileController";
import { authenticateJwt } from "../middleware/auth";
import { verificationLimiter } from "../middleware/security";

const router = Router();

// All mobile operations require authentication
router.use(authenticateJwt);

// 1. Ticket QR Verification & Protected Screening Session Creation
router.post("/verify-ticket", verificationLimiter, MobileController.verifyTicket);

// 2. Secure Ticket QR Retrieval / Generation for existing ticket
router.get("/tickets/:id/qr", MobileController.getTicketQr);

// 3. Protected Screening Session Retrieval
router.get("/session/:sessionId", MobileController.getSession);

// 4. Dynamic Session Watermark Generation & Rotation
router.get("/session/:sessionId/watermark", MobileController.getSessionWatermark);

// 5. Forensic Session Attribution Lookup
router.post("/watermark/attribute", MobileController.attributeWatermark);

// 6. Forensic Evidence Vault Logging
router.post("/watermark/evidence", MobileController.createForensicEvidence);

// 7. Mobile Security Event Ingestion (SOC Integration)
router.post("/events", MobileController.submitSecurityEvent);

export default router;
