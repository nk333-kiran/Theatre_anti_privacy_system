"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayReadyAdapter = void 0;
const logger_1 = require("../logging/logger");
class PlayReadyAdapter {
    static SYSTEM_ID = "9a04f079-9840-4286-ab92-e65be0885f95";
    /**
     * Generates standard PlayReady WRMHEADER XML
     */
    static generateWrmHeader(keyId, licenseServerUrl) {
        const xml = `<?xml version="1.0" encoding="utf-8"?>
<WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.3.0.0">
  <DATA>
    <PROTECTINFO>
      <KID>${keyId}</KID>
      <ALGID>AESCTR</ALGID>
      <CHECKSUM>pr_chk_${keyId.slice(0, 8)}</CHECKSUM>
    </PROTECTINFO>
    <LA_URL>${licenseServerUrl || "/api/drm/license"}</LA_URL>
  </DATA>
</WRMHEADER>`;
        return {
            systemId: this.SYSTEM_ID,
            wrmHeaderXml: xml,
            wrmHeaderBase64: Buffer.from(xml, "utf-8").toString("base64"),
        };
    }
    /**
     * Process incoming PlayReady SOAP/XML challenge
     */
    static processLicenseChallenge(params) {
        logger_1.logger.info(`[PlayReady] Processing challenge for KID: ${params.keyId}`);
        const response = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <AcquireLicenseResponse xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols">
      <AcquireLicenseResult>PR_LIC_GRANTED_${params.keyId}</AcquireLicenseResult>
    </AcquireLicenseResponse>
  </soap:Body>
</soap:Envelope>`;
        return { soapResponseXml: response, status: "GRANTED" };
    }
}
exports.PlayReadyAdapter = PlayReadyAdapter;
