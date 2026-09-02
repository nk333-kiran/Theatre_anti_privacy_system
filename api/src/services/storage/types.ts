import { Readable } from "stream";

export type StorageDriverType = "local" | "s3" | "gcs" | "azure";

export interface StorageDiagnostics {
  driver: StorageDriverType;
  configured: boolean;
  status: "READY" | "DEGRADED" | "NOT_CONFIGURED";
  basePathOrBucket: string;
  isCloudStorage: boolean;
  details?: Record<string, any>;
}

export interface ObjectMetadata {
  key: string;
  sizeBytes: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  contentType?: string;
  isPrivate?: boolean;
  metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  operation?: "getObject" | "putObject";
  contentType?: string;
}

export interface IStorageProvider {
  name: string;
  upload(key: string, data: Buffer | Uint8Array | Readable, options?: UploadOptions): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<ObjectMetadata | null>;
  generateSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  generateUploadUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  list(prefix?: string): Promise<ObjectMetadata[]>;
  getDriverName?(): StorageDriverType;
  ensureStorageDirectories?(): Promise<void>;
  getDiagnostics(): Promise<StorageDiagnostics>;
  resolvePath?(subPath: string): string;
  saveBuffer?(subPath: string, buffer: Buffer): Promise<string>;
  deleteFile?(subPath: string): Promise<void>;
  getFileStream?(subPath: string): Promise<Readable>;
  fileExists?(subPath: string): Promise<boolean>;
}
