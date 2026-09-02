"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDrmProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Mock DRM Provider
 *
 * ⚠️ DEVELOPMENT ONLY — NOT REAL DRM ⚠️
 * Provides end-to-end simulated DRM key packaging, PSSH generation,
 * and token-bound license issuance for testing and development.
 *
 * Real production DRM requires Widevine/PlayReady/FairPlay cloud license servers.
 */
class MockDrmProvider {
    licenseServerUrl;
    constructor(customLicenseServerUrl) {
        this.licenseServerUrl =
            customLicenseServerUrl ||
                process.env.DRM_LICENSE_SERVER_URL ||
                "/api/drm/license";
    }
    getProviderName() {
        return "mock";
    }
    async getProviderStatus() {
        return {
            configured: true,
            provider: "mock",
            status: "READY",
            isDevelopmentOnly: true,
            supportedSchemes: ["AES-128-ENCRYPTED", "MOCK-CENC", "SAMPLE-AES"],
            capabilities: {
                widevine: false,
                playready: false,
                fairplay: false,
                hardwareDrmReady: false,
            },
            serverTimestamp: new Date().toISOString(),
        };
    }
    async createContentKey(assetId, movieId) {
        // Generate deterministic yet secure Key Identifier (KID)
        const rawKid = crypto_1.default
            .createHash("sha256")
            .update(`MOCK-DRM-KID:${assetId}:${movieId}`)
            .digest("hex")
            .slice(0, 32);
        const formattedKid = `urn:uuid:${rawKid.slice(0, 8)}-${rawKid.slice(8, 12)}-${rawKid.slice(12, 16)}-${rawKid.slice(16, 20)}-${rawKid.slice(20, 32)}`;
        // Generate mock PSSH Box (Base64)
        const mockPssh = Buffer.from(JSON.stringify({
            systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
            kid: formattedKid,
            provider: "MOCK-THEATRE-GUARD-DRM",
        })).toString("base64");
        return {
            keyId: formattedKid,
            scheme: "AES-128-ENCRYPTED",
            pssh: mockPssh,
            fairplayKeyUri: `skd://theatre-guard-drm/fps/${rawKid}`,
            licenseServerUrl: this.licenseServerUrl,
        };
    }
    async prepareDrmAsset(params) {
        const keyDetails = await this.createContentKey(params.assetId, params.movieId);
        // Ensure output directory exists
        if (!fs_1.default.existsSync(params.outputDir)) {
            fs_1.default.mkdirSync(params.outputDir, { recursive: true });
        }
        // Create encrypted manifest placeholder in output directory if missing
        const drmManifestPath = path_1.default.join(params.outputDir, "drm_master.m3u8");
        if (!fs_1.default.existsSync(drmManifestPath)) {
            const drmManifestContent = `#EXTM3U
#EXT-X-VERSION:5
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-SESSION-KEY:METHOD=SAMPLE-AES,URI="${this.licenseServerUrl}?keyId=${encodeURIComponent(keyDetails.keyId)}",KEYFORMAT="identity"

#EXT-X-STREAM-INF:BANDWIDTH=4800000,RESOLUTION=1920x1080,NAME="1080p DRM Protected"
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2400000,RESOLUTION=1280x720,NAME="720p DRM Protected"
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,NAME="480p DRM Protected"
480p.m3u8
`;
            fs_1.default.writeFileSync(drmManifestPath, drmManifestContent, "utf-8");
        }
        return {
            keyId: keyDetails.keyId,
            provider: "mock",
            scheme: keyDetails.scheme,
            encryptedManifestUrl: `/api/playback/stream/${params.streamKey}/master.m3u8`,
            licenseServerUrl: this.licenseServerUrl,
            metadata: {
                isDevelopmentOnly: true,
                pssh: keyDetails.pssh,
                fairplayKeyUri: keyDetails.fairplayKeyUri,
                cencFormat: "SAMPLE-AES",
            },
        };
    }
    async issueLicense(params) {
        // 30 minutes short-lived DRM license TTL
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const entropy = crypto_1.default.randomBytes(16).toString("hex");
        const licenseToken = `DRM-LIC-${Date.now().toString(36).toUpperCase()}-${entropy.slice(0, 12).toUpperCase()}`;
        // Mock opaque license payload (Client decrypts via EME or test module)
        const payloadObject = {
            licenseToken,
            keyId: params.keyId,
            theatreCode: params.theatreCode,
            seatNumber: params.seatNumber,
            expiresAt: expiresAt.toISOString(),
            status: "AUTHORIZED",
            note: "DEVELOPMENT ONLY — NOT REAL DRM",
        };
        const licensePayload = Buffer.from(JSON.stringify(payloadObject)).toString("base64");
        return {
            authorized: true,
            licenseToken,
            keyId: params.keyId,
            licensePayload,
            scheme: "AES-128-ENCRYPTED",
            expiresAt,
        };
    }
    async revokeLicense(_licenseToken, _reason) {
        return Promise.resolve();
    }
}
exports.MockDrmProvider = MockDrmProvider;
