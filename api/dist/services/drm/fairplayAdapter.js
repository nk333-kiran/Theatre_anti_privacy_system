"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FairPlayAdapter = void 0;
const logger_1 = require("../logging/logger");
class FairPlayAdapter {
    /**
     * Format Apple FairPlay Streaming (FPS) skd:// URI
     */
    static formatSkdUri(keyId) {
        return `skd://${keyId}`;
    }
    /**
     * Process Server Playback Context (SPC) and generate Content Key Context (CKC)
     */
    static processSpcChallenge(params) {
        logger_1.logger.info(`[FairPlay] Processing SPC challenge for asset: ${params.assetId}`);
        const ckcBuffer = Buffer.from(`FPS_CKC_RESPONSE:${params.keyId}:${Date.now()}`);
        return {
            ckcBase64: ckcBuffer.toString("base64"),
            keyId: params.keyId,
            status: "GRANTED",
        };
    }
}
exports.FairPlayAdapter = FairPlayAdapter;
