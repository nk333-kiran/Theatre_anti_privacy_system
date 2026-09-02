"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookSecurityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const securityAuditService_1 = require("../security/securityAuditService");
const database_1 = require("@antipiracy/database");
class WebhookSecurityService {
    // In-memory replay cache of recent valid request signatures (valid within TTL window)
    static processedSignatures = new Map();
    static MAX_TIMESTAMP_DRIFT_SEC = 300; // 5 minutes
    /**
     * Cleans up expired nonce/signature records.
     */
    static cleanupReplayCache() {
        const now = Date.now();
        const threshold = now - this.MAX_TIMESTAMP_DRIFT_SEC * 1000;
        for (const [sig, timestamp] of this.processedSignatures.entries()) {
            if (timestamp < threshold) {
                this.processedSignatures.delete(sig);
            }
        }
    }
    /**
     * Generates HMAC-SHA256 signature for payload and timestamp.
     */
    static computeSignature(secret, timestamp, payload) {
        const dataToSign = `${timestamp}.${payload}`;
        return crypto_1.default.createHmac("sha256", secret).update(dataToSign).digest("hex");
    }
    /**
     * Validates an incoming webhook request with timestamp check and HMAC signature verification.
     */
    static async validateWebhook(params) {
        this.cleanupReplayCache();
        if (!params.signatureHeader || !params.timestampHeader) {
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                severity: database_1.SecuritySeverity.HIGH,
                ipAddress: params.ipAddress,
                actionSummary: "Threat Intel Webhook rejected: Missing signature or timestamp headers",
            });
            return {
                isValid: false,
                errorCode: "MISSING_HEADERS",
                errorMessage: "Headers X-Threat-Signature and X-Threat-Timestamp are required",
            };
        }
        // 1. Timestamp Freshness Check
        const reqTimestamp = parseInt(params.timestampHeader, 10);
        if (isNaN(reqTimestamp)) {
            return {
                isValid: false,
                errorCode: "INVALID_TIMESTAMP",
                errorMessage: "X-Threat-Timestamp must be a valid unix timestamp (seconds)",
            };
        }
        const nowSec = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSec - reqTimestamp) > this.MAX_TIMESTAMP_DRIFT_SEC) {
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                severity: database_1.SecuritySeverity.HIGH,
                ipAddress: params.ipAddress,
                actionSummary: "Threat Intel Webhook rejected: Request timestamp drift exceeded 300s (Replay Protection)",
            });
            return {
                isValid: false,
                errorCode: "INVALID_TIMESTAMP",
                errorMessage: "Request timestamp outside allowed 5-minute window",
            };
        }
        // 2. Replay Detection
        const signature = params.signatureHeader.trim();
        if (this.processedSignatures.has(signature)) {
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                severity: database_1.SecuritySeverity.CRITICAL,
                ipAddress: params.ipAddress,
                actionSummary: "Threat Intel Webhook rejected: Duplicate signature detected (Replay Attack)",
            });
            return {
                isValid: false,
                errorCode: "REPLAY_DETECTED",
                errorMessage: "Duplicate webhook signature detected",
            };
        }
        // 3. Cryptographic Timing-Safe HMAC Verification
        const expectedSignature = this.computeSignature(params.configuredSecret, params.timestampHeader, params.rawPayload);
        const sigBuffer = Buffer.from(signature, "hex");
        const expectedBuffer = Buffer.from(expectedSignature, "hex");
        if (sigBuffer.length !== expectedBuffer.length || !crypto_1.default.timingSafeEqual(sigBuffer, expectedBuffer)) {
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: database_1.SecurityEventType.SUSPICIOUS_ACTIVITY,
                severity: database_1.SecuritySeverity.CRITICAL,
                ipAddress: params.ipAddress,
                actionSummary: "Threat Intel Webhook rejected: Invalid HMAC signature",
            });
            return {
                isValid: false,
                errorCode: "INVALID_SIGNATURE",
                errorMessage: "Invalid cryptographic HMAC signature",
            };
        }
        // Mark signature as processed
        this.processedSignatures.set(signature, Date.now());
        return { isValid: true };
    }
}
exports.WebhookSecurityService = WebhookSecurityService;
