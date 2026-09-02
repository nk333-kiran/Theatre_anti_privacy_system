"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceHashService = exports.EvidenceHashService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class EvidenceHashService {
    /**
     * Computes SHA-256 hash over raw data buffer or string
     */
    computeSha256(data) {
        return crypto_1.default.createHash("sha256").update(data).digest("hex");
    }
    /**
     * Computes a deterministic canonical SHA-256 hash over an evidence record and its metadata
     */
    computeEvidenceRecordHash(params) {
        const canonicalPayload = JSON.stringify({
            evidenceNumber: params.evidenceNumber,
            classification: params.classification,
            source: params.source,
            metadata: params.metadata || "{}",
            theatreId: params.theatreId || null,
            movieId: params.movieId || null,
            showId: params.showId || null,
            createdAt: new Date(params.createdAt).toISOString(),
        });
        return this.computeSha256(canonicalPayload);
    }
    /**
     * Computes a cryptographic chain block hash:
     * H_n = SHA256(H_{n-1} + eventType + actorId + timestamp + eventData)
     */
    computeChainBlockHash(params) {
        const payload = [
            params.previousChainHash,
            params.eventType,
            params.actorId || "SYSTEM",
            new Date(params.timestamp).toISOString(),
            params.eventData || "{}",
        ].join("::");
        return this.computeSha256(payload);
    }
    /**
     * Verifies if a given hash matches the expected hash
     */
    verifyHash(calculated, expected) {
        if (!calculated || !expected || calculated.length !== expected.length) {
            return false;
        }
        return crypto_1.default.timingSafeEqual(Buffer.from(calculated, "utf-8"), Buffer.from(expected, "utf-8"));
    }
}
exports.EvidenceHashService = EvidenceHashService;
exports.evidenceHashService = new EvidenceHashService();
