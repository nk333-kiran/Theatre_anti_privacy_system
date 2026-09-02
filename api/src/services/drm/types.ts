export type DrmProviderName = "mock" | "widevine" | "playready" | "fairplay" | "custom";

export interface DrmKeyDetails {
  keyId: string; // KID URN or Hex
  scheme: string; // e.g. "cenc", "cbcs", "AES-128-ENCRYPTED"
  pssh?: string;
  fairplayKeyUri?: string;
  licenseServerUrl: string;
}

export interface DrmPreparationParams {
  assetId: string;
  movieTitle: string;
  movieId: string;
  streamKey: string;
  inputManifestPath: string;
  outputDir: string;
}

export interface DrmPreparationResult {
  keyId: string;
  provider: DrmProviderName;
  scheme: string;
  encryptedManifestUrl: string;
  licenseServerUrl: string;
  metadata: Record<string, any>;
}

export interface DrmLicenseRequestParams {
  keyId: string;
  activationId: string;
  playbackToken: string;
  ticketNumber: string;
  seatNumber: string;
  theatreCode: string;
  showId: string;
  clientIp?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  challenge?: string;
}

export interface DrmLicenseResponse {
  authorized: boolean;
  licenseToken: string;
  keyId: string;
  licensePayload: string; // Base64 or tokenized DRM license response
  scheme: string;
  expiresAt: Date;
  denialReason?: string;
}

export interface DrmProviderStatus {
  configured: boolean;
  provider: string;
  status: "READY" | "NOT_CONFIGURED" | "DEGRADED";
  isDevelopmentOnly: boolean;
  supportedSchemes: string[];
  capabilities: {
    widevine: boolean;
    playready: boolean;
    fairplay: boolean;
    hardwareDrmReady: boolean;
  };
  serverTimestamp: string;
}

export interface IDrmProvider {
  getProviderName(): DrmProviderName;
  getProviderStatus(): Promise<DrmProviderStatus>;
  createContentKey(assetId: string, movieId: string): Promise<DrmKeyDetails>;
  prepareDrmAsset(params: DrmPreparationParams): Promise<DrmPreparationResult>;
  issueLicense(params: DrmLicenseRequestParams): Promise<DrmLicenseResponse>;
  revokeLicense(licenseToken: string, reason?: string): Promise<void>;
}
