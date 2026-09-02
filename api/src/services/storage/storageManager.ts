import { IStorageProvider } from "./types";
import { LocalStorageProvider } from "./localStorageProvider";
import { ObjectStorageProvider } from "./objectStorageProvider";
import { logger } from "../logging/logger";

class StorageManager {
  private activeProvider: IStorageProvider;

  constructor() {
    const providerType = process.env.STORAGE_PROVIDER || "local";

    if (providerType === "s3" && process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY) {
      this.activeProvider = new ObjectStorageProvider({
        bucket: process.env.STORAGE_BUCKET,
        region: process.env.STORAGE_REGION || "us-east-1",
        endpoint: process.env.STORAGE_ENDPOINT,
        accessKeyId: process.env.STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.STORAGE_SECRET_KEY || "secret",
      });
      logger.info(`[StorageManager] Initialized Cloud S3 Object Storage Provider (${process.env.STORAGE_BUCKET})`);
    } else {
      this.activeProvider = new LocalStorageProvider();
      logger.info(`[StorageManager] Initialized Local Storage Provider`);
    }
  }

  public getProvider(): IStorageProvider {
    return this.activeProvider;
  }

  public setProvider(provider: IStorageProvider): void {
    this.activeProvider = provider;
  }
}

export const storageManager = new StorageManager();
