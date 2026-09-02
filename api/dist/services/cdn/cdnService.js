"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdnService = exports.CdnService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../logging/logger");
class CdnService {
    cdnBaseUrl;
    signingSecret;
    defaultTtlSeconds = 300; // 5 minutes short-lived CDN token
    constructor() {
        this.cdnBaseUrl = process.env.CDN_BASE_URL || "https://cdn.theatre-antipiracy.net";
        this.signingSecret = process.env.CDN_SIGNING_SECRET || process.env.JWT_SECRET || "cdn-signing-master-secret";
    }
    /**
     * Generate an HMAC-SHA256 signed playback URL for CDN edge delivery
     */
    generateSignedPlaybackUrl(options) {
        const ttl = options.ttlSeconds || this.defaultTtlSeconds;
        const expiresAt = Math.floor(Date.now() / 1000) + ttl;
        const cleanPath = options.assetPath.replace(/^[/\\]+/, "");
        // Canonical signing token payload: PATH:SESSION:IP:EXPIRES
        const canonicalString = `${cleanPath}:${options.sessionId}:${options.clientIp || "any"}:${expiresAt}`;
        const token = crypto_1.default
            .createHmac("sha256", this.signingSecret)
            .update(canonicalString)
            .digest("hex");
        const signedUrl = `${this.cdnBaseUrl}/${cleanPath}?exp=${expiresAt}&sid=${options.sessionId}&sig=${token}`;
        logger_1.logger.info(`[CDN] Generated signed URL for session ${options.sessionId.slice(0, 8)}... (TTL: ${ttl}s)`);
        return signedUrl;
    }
    /**
     * Validate incoming CDN edge request token
     */
    validateCdnToken(params) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (params.expiresAt < nowSec) {
            return { valid: false, reason: "CDN signed URL expired" };
        }
        const cleanPath = params.assetPath.replace(/^[/\\]+/, "");
        const expectedCanonical = `${cleanPath}:${params.sessionId}:${params.clientIp || "any"}:${params.expiresAt}`;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", this.signingSecret)
            .update(expectedCanonical)
            .digest("hex");
        const match = crypto_1.default.timingSafeEqual(Buffer.from(params.signature, "hex"), Buffer.from(expectedSignature, "hex"));
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
exports.CdnService = CdnService;
exports.cdnService = new CdnService();
