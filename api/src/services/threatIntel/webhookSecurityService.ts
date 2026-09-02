import crypto from "crypto";
import { SecurityAuditService } from "../security/securityAuditService";
import { SecurityEventType, SecuritySeverity } from "@antipiracy/database";

export interface WebhookValidationResult {
  isValid: boolean;
  errorCode?: "MISSING_HEADERS" | "INVALID_TIMESTAMP" | "REPLAY_DETECTED" | "INVALID_SIGNATURE" | "SECRET_NOT_CONFIGURED";
  errorMessage?: string;
}

export class WebhookSecurityService {
  // In-memory replay cache of recent valid request signatures (valid within TTL window)
  private static processedSignatures: Map<string, number> = new Map();
  private static readonly MAX_TIMESTAMP_DRIFT_SEC = 300; // 5 minutes

  /**
   * Cleans up expired nonce/signature records.
   */
  private static cleanupReplayCache() {
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
  public static computeSignature(secret: string, timestamp: string, payload: string): string {
    const dataToSign = `${timestamp}.${payload}`;
    return crypto.createHmac("sha256", secret).update(dataToSign).digest("hex");
  }

  /**
   * Validates an incoming webhook request with timestamp check and HMAC signature verification.
   */
  public static async validateWebhook(params: {
    rawPayload: string;
    signatureHeader?: string;
    timestampHeader?: string;
    configuredSecret: string;
    ipAddress?: string;
  }): Promise<WebhookValidationResult> {
    this.cleanupReplayCache();

    if (!params.signatureHeader || !params.timestampHeader) {
      await SecurityAuditService.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
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
      await SecurityAuditService.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
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
      await SecurityAuditService.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.CRITICAL,
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
    const expectedSignature = this.computeSignature(
      params.configuredSecret,
      params.timestampHeader,
      params.rawPayload
    );

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      await SecurityAuditService.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.CRITICAL,
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
