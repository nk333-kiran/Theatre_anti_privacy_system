import crypto from "crypto";
import { logger } from "../logging/logger";

export interface CdnSignedUrlOptions {
  assetPath: string;
  sessionId: string;
  clientIp?: string;
  ttlSeconds?: number;
}

export interface CdnTokenValidationResult {
  valid: boolean;
  reason?: string;
  sessionId?: string;
  assetPath?: string;
  expiresAt?: Date;
}

export class CdnService {
  private cdnBaseUrl: string;
  private signingSecret: string;
  private defaultTtlSeconds = 300; // 5 minutes short-lived CDN token

  constructor() {
    this.cdnBaseUrl = process.env.CDN_BASE_URL || "https://cdn.theatre-antipiracy.net";
    this.signingSecret = process.env.CDN_SIGNING_SECRET || process.env.JWT_SECRET || "cdn-signing-master-secret";
  }

  /**
   * Generate an HMAC-SHA256 signed playback URL for CDN edge delivery
   */
  public generateSignedPlaybackUrl(options: CdnSignedUrlOptions): string {
    const ttl = options.ttlSeconds || this.defaultTtlSeconds;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const cleanPath = options.assetPath.replace(/^[/\\]+/, "");

    // Canonical signing token payload: PATH:SESSION:IP:EXPIRES
    const canonicalString = `${cleanPath}:${options.sessionId}:${options.clientIp || "any"}:${expiresAt}`;
    const token = crypto
      .createHmac("sha256", this.signingSecret)
      .update(canonicalString)
      .digest("hex");

    const signedUrl = `${this.cdnBaseUrl}/${cleanPath}?exp=${expiresAt}&sid=${options.sessionId}&sig=${token}`;
    logger.info(`[CDN] Generated signed URL for session ${options.sessionId.slice(0, 8)}... (TTL: ${ttl}s)`);
    return signedUrl;
  }

  /**
   * Validate incoming CDN edge request token
   */
  public validateCdnToken(params: {
    assetPath: string;
    sessionId: string;
    signature: string;
    expiresAt: number;
    clientIp?: string;
  }): CdnTokenValidationResult {
    const nowSec = Math.floor(Date.now() / 1000);
    if (params.expiresAt < nowSec) {
      return { valid: false, reason: "CDN signed URL expired" };
    }

    const cleanPath = params.assetPath.replace(/^[/\\]+/, "");
    const expectedCanonical = `${cleanPath}:${params.sessionId}:${params.clientIp || "any"}:${params.expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.signingSecret)
      .update(expectedCanonical)
      .digest("hex");

    const match = crypto.timingSafeEqual(
      Buffer.from(params.signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );

    if (!match) {
      return { valid: false, reason: "Invalid CDN signature token" };
    }

    return {
      valid: true,
      sessionId: params.sessionId,
      assetPath: cleanPath,
      expiresAt: new Date(params.expiresAt * 1000),
    };
  }
}

export const cdnService = new CdnService();
