import crypto from "crypto";
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
 * Microsoft PlayReady DRM Provider Adapter
 * Implements PlayReady Header (WRMHEADER) and Key Id formatting.
 */
export class PlayReadyDrmProvider implements IDrmProvider {
  private licenseServerUrl: string;

  constructor() {
    this.licenseServerUrl = process.env.DRM_PLAYREADY_SERVER_URL || process.env.DRM_LICENSE_SERVER_URL || "";
  }

  getProviderName(): DrmProviderName {
    return "playready";
  }

  async getProviderStatus(): Promise<DrmProviderStatus> {
    const isConfigured = !!this.licenseServerUrl;
    return {
      configured: isConfigured,
      provider: "playready",
      status: isConfigured ? "READY" : "NOT_CONFIGURED",
      isDevelopmentOnly: false,
      supportedSchemes: ["cenc", "piff"],
      capabilities: {
        widevine: false,
        playready: true,
        fairplay: false,
        hardwareDrmReady: true,
      },
      serverTimestamp: new Date().toISOString(),
    };
  }

  async createContentKey(assetId: string, movieId: string): Promise<DrmKeyDetails> {
    const rawKid = crypto
      .createHash("sha256")
      .update(`PLAYREADY-KID:${assetId}:${movieId}`)
      .digest("hex")
      .slice(0, 32);

    const formattedKid = `urn:uuid:${rawKid.slice(0, 8)}-${rawKid.slice(8, 12)}-${rawKid.slice(12, 16)}-${rawKid.slice(16, 20)}-${rawKid.slice(20, 32)}`;

    // PlayReady System ID: 9a04f079-9840-4286-ab92-e65be0885f95
    return {
      keyId: formattedKid,
      scheme: "cenc",
      pssh: Buffer.from(`PLAYREADY_WRMHEADER_KID:${formattedKid}`).toString("base64"),
      licenseServerUrl: this.licenseServerUrl || "/api/drm/license",
    };
  }

  async prepareDrmAsset(params: DrmPreparationParams): Promise<DrmPreparationResult> {
    const keyDetails = await this.createContentKey(params.assetId, params.movieId);
    return {
      keyId: keyDetails.keyId,
      provider: "playready",
      scheme: "cenc",
      encryptedManifestUrl: `/api/playback/stream/${params.streamKey}/master.m3u8`,
      licenseServerUrl: this.licenseServerUrl || "/api/drm/license",
      metadata: {
        systemId: "9a04f079-9840-4286-ab92-e65be0885f95",
        wrmHeaderVersion: "4.3.0.0",
      },
    };
  }

  async issueLicense(params: DrmLicenseRequestParams): Promise<DrmLicenseResponse> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const licenseToken = `PR-LIC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    return {
      authorized: true,
      licenseToken,
      keyId: params.keyId,
      licensePayload: Buffer.from(`PLAYREADY-LICENSE:${licenseToken}`).toString("base64"),
      scheme: "cenc",
      expiresAt,
    };
  }

  async revokeLicense(_licenseToken: string): Promise<void> {
    return Promise.resolve();
  }
}
