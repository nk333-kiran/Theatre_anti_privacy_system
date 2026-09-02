import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  IDrmProvider,
  DrmProviderName,
  DrmProviderStatus,
  DrmKeyDetails,
  DrmPreparationParams,
  DrmPreparationResult,
  DrmLicenseRequestParams,
  DrmLicenseResponse,
} from "../types";

/**
 * Mock DRM Provider
 *
 * ⚠️ DEVELOPMENT ONLY — NOT REAL DRM ⚠️
 * Provides end-to-end simulated DRM key packaging, PSSH generation,
 * and token-bound license issuance for testing and development.
 *
 * Real production DRM requires Widevine/PlayReady/FairPlay cloud license servers.
 */
export class MockDrmProvider implements IDrmProvider {
  private licenseServerUrl: string;

  constructor(customLicenseServerUrl?: string) {
    this.licenseServerUrl =
      customLicenseServerUrl ||
      process.env.DRM_LICENSE_SERVER_URL ||
      "/api/drm/license";
  }

  getProviderName(): DrmProviderName {
    return "mock";
  }

  async getProviderStatus(): Promise<DrmProviderStatus> {
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

  async createContentKey(assetId: string, movieId: string): Promise<DrmKeyDetails> {
    // Generate deterministic yet secure Key Identifier (KID)
    const rawKid = crypto
      .createHash("sha256")
      .update(`MOCK-DRM-KID:${assetId}:${movieId}`)
      .digest("hex")
      .slice(0, 32);

    const formattedKid = `urn:uuid:${rawKid.slice(0, 8)}-${rawKid.slice(8, 12)}-${rawKid.slice(12, 16)}-${rawKid.slice(16, 20)}-${rawKid.slice(20, 32)}`;

    // Generate mock PSSH Box (Base64)
    const mockPssh = Buffer.from(
      JSON.stringify({
        systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
        kid: formattedKid,
        provider: "MOCK-THEATRE-GUARD-DRM",
      })
    ).toString("base64");

    return {
      keyId: formattedKid,
      scheme: "AES-128-ENCRYPTED",
      pssh: mockPssh,
      fairplayKeyUri: `skd://theatre-guard-drm/fps/${rawKid}`,
      licenseServerUrl: this.licenseServerUrl,
    };
  }

  async prepareDrmAsset(params: DrmPreparationParams): Promise<DrmPreparationResult> {
    const keyDetails = await this.createContentKey(params.assetId, params.movieId);

    // Ensure output directory exists
    if (!fs.existsSync(params.outputDir)) {
      fs.mkdirSync(params.outputDir, { recursive: true });
    }

    // Create encrypted manifest placeholder in output directory if missing
    const drmManifestPath = path.join(params.outputDir, "drm_master.m3u8");
    if (!fs.existsSync(drmManifestPath)) {
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
      fs.writeFileSync(drmManifestPath, drmManifestContent, "utf-8");
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

  async issueLicense(params: DrmLicenseRequestParams): Promise<DrmLicenseResponse> {
    // 30 minutes short-lived DRM license TTL
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const entropy = crypto.randomBytes(16).toString("hex");
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

  async revokeLicense(_licenseToken: string, _reason?: string): Promise<void> {
    return Promise.resolve();
  }
}
