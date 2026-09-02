import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { IStorageProvider, ObjectMetadata, UploadOptions, SignedUrlOptions } from "./types";
import { logger } from "../logging/logger";

export class LocalStorageProvider implements IStorageProvider {
  public name = "local";
  private baseDir: string;
  private secretKey: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), "private_storage");
    this.secretKey = process.env.JWT_SECRET || "local-storage-secret-signing-key";
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async getDiagnostics() {
    return {
      driver: "local" as const,
      configured: true,
      status: "READY" as const,
      basePathOrBucket: this.baseDir,
      isCloudStorage: false,
    };
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/^[/\\]+/, "").replace(/\.\./g, "_");
    return path.join(this.baseDir, safeKey);
  }

  public async upload(
    key: string,
    data: Buffer | Uint8Array | Readable,
    options?: UploadOptions
  ): Promise<string> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      await fs.promises.writeFile(filePath, data);
    } else {
      const writeStream = fs.createWriteStream(filePath);
      await new Promise<void>((resolve, reject) => {
        data.pipe(writeStream).on("finish", () => resolve()).on("error", reject);
      });
    }

    logger.info(`[LocalStorage] Uploaded ${key} (${filePath})`);
    return `/storage/${key}`;
  }

  public async download(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Object not found: ${key}`);
    }
    return fs.promises.readFile(filePath);
  }

  public async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  public async head(key: string): Promise<ObjectMetadata | null> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) return null;

    const stats = await fs.promises.stat(filePath);
    return {
      key,
      sizeBytes: stats.size,
      contentType: "application/octet-stream",
      lastModified: stats.mtime,
    };
  }

  public async generateSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const ttl = options?.expiresInSeconds || 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const signature = crypto
      .createHmac("sha256", this.secretKey)
      .update(`GET:${key}:${expiresAt}`)
      .digest("hex");

    return `/api/storage/signed/${encodeURIComponent(key)}?expires=${expiresAt}&signature=${signature}`;
  }

  public async generateUploadUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const ttl = options?.expiresInSeconds || 900;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const signature = crypto
      .createHmac("sha256", this.secretKey)
      .update(`PUT:${key}:${expiresAt}`)
      .digest("hex");

    return `/api/storage/upload/${encodeURIComponent(key)}?expires=${expiresAt}&signature=${signature}`;
  }

  public async list(prefix = ""): Promise<ObjectMetadata[]> {
    const results: ObjectMetadata[] = [];
    if (!fs.existsSync(this.baseDir)) return results;

    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else {
          const rel = path.relative(this.baseDir, full).replace(/\\/g, "/");
          if (rel.startsWith(prefix)) {
            results.push({
              key: rel,
              sizeBytes: stat.size,
              contentType: "application/octet-stream",
              lastModified: stat.mtime,
            });
          }
        }
      }
    };

    walk(this.baseDir);
    return results;
  }
}
