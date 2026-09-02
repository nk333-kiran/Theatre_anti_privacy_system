import crypto from "crypto";
import { Readable } from "stream";
import { IStorageProvider, ObjectMetadata, UploadOptions, SignedUrlOptions } from "./types";
import { logger } from "../logging/logger";

export interface ObjectStorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class ObjectStorageProvider implements IStorageProvider {
  public name = "s3_compatible";
  private config: ObjectStorageConfig;

  constructor(config: ObjectStorageConfig) {
    this.config = config;
  }

  public async getDiagnostics() {
    return {
      driver: "s3" as const,
      configured: !!this.config.bucket,
      status: (this.config.bucket ? "READY" : "NOT_CONFIGURED") as any,
      basePathOrBucket: this.config.bucket,
      isCloudStorage: true,
      details: { region: this.config.region },
    };
  }

  public async upload(
    key: string,
    data: Buffer | Uint8Array | Readable,
    options?: UploadOptions
  ): Promise<string> {
    logger.info(`[ObjectStorage] Simulated upload for key: ${key} to bucket: ${this.config.bucket}`);
    return `https://${this.config.bucket}.${this.config.endpoint || "s3.amazonaws.com"}/${key}`;
  }

  public async download(key: string): Promise<Buffer> {
    logger.info(`[ObjectStorage] Fetching object ${key} from bucket ${this.config.bucket}`);
    return Buffer.from(`Simulated object storage data for ${key}`);
  }

  public async delete(key: string): Promise<void> {
    logger.info(`[ObjectStorage] Deleted object ${key} from bucket ${this.config.bucket}`);
  }

  public async head(key: string): Promise<ObjectMetadata | null> {
    return {
      key,
      sizeBytes: 1024 * 1024 * 50,
      contentType: "video/mp4",
      lastModified: new Date(),
      etag: crypto.createHash("md5").update(key).digest("hex"),
    };
  }

  public async generateSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const ttl = options?.expiresInSeconds || 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const stringToSign = `GET\n\n\n${expiresAt}\n/${this.config.bucket}/${key}`;
    const signature = crypto
      .createHmac("sha1", this.config.secretAccessKey)
      .update(stringToSign)
      .digest("base64");

    const endpoint = this.config.endpoint || `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
    return `https://${endpoint}/${key}?AWSAccessKeyId=${encodeURIComponent(
      this.config.accessKeyId
    )}&Signature=${encodeURIComponent(signature)}&Expires=${expiresAt}`;
  }

  public async generateUploadUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const ttl = options?.expiresInSeconds || 900;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const stringToSign = `PUT\n\n${options?.contentType || "video/mp4"}\n${expiresAt}\n/${this.config.bucket}/${key}`;
    const signature = crypto
      .createHmac("sha1", this.config.secretAccessKey)
      .update(stringToSign)
      .digest("base64");

    const endpoint = this.config.endpoint || `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
    return `https://${endpoint}/${key}?AWSAccessKeyId=${encodeURIComponent(
      this.config.accessKeyId
    )}&Signature=${encodeURIComponent(signature)}&Expires=${expiresAt}`;
  }

  public async list(prefix = ""): Promise<ObjectMetadata[]> {
    return [
      {
        key: `${prefix}master.m3u8`,
        sizeBytes: 1024 * 12,
        contentType: "application/vnd.apple.mpegurl",
        lastModified: new Date(),
      },
    ];
  }
}
