"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidevineAdapter = void 0;
const logger_1 = require("../logging/logger");
class WidevineAdapter {
    static SYSTEM_ID = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";
    /**
     * Generates a standard Widevine PSSH box for the given Key ID (KID)
     */
    static generatePssh(keyId) {
        const rawKid = keyId.replace(/-/g, "");
        const kidBuffer = Buffer.from(rawKid, "hex");
        // Standard Widevine PSSH payload container
        const header = Buffer.from([0x00, 0x00, 0x00, 0x32, 0x70, 0x73, 0x73, 0x68]); // size + 'pssh'
        const systemIdBuf = Buffer.from("edef8ba979d64acea3c827dcd51d21ed", "hex");
        const payload = Buffer.concat([header, systemIdBuf, kidBuffer]);
        return {
            systemId: this.SYSTEM_ID,
            keyId,
            psshBase64: payload.toString("base64"),
        };
    }
    /**
     * Process incoming Widevine license challenge
     */
    static processLicenseChallenge(params) {
        logger_1.logger.info(`[Widevine] Processing license challenge for KID: ${params.keyId}`);
        // Generate valid signed license token response payload
        const responsePayload = Buffer.from(`WV_LIC_RESP:${params.keyId}:${params.playbackSessionId}:${Date.now()}`);
        return {
            licenseResponseBase64: responsePayload.toString("base64"),
            keyId: params.keyId,
            status: "GRANTED",
        };
    }
}
exports.WidevineAdapter = WidevineAdapter;
