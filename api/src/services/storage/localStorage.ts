import path from "path";
import fs from "fs";

export class LocalStorageManager {
  private baseDir: string;
  private rawDir: string;
  private processedDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir =
      customBaseDir ||
      process.env.STORAGE_BASE_DIR ||
      path.resolve(process.cwd(), "private_storage");

    this.rawDir = path.join(this.baseDir, "raw");
    this.processedDir = path.join(this.baseDir, "processed");

    this.initDirectories();
  }

  private initDirectories() {
    [this.baseDir, this.rawDir, this.processedDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  public getRawStorageDir(): string {
    return this.rawDir;
  }

  public getProcessedStorageDir(): string {
    return this.processedDir;
  }

  public getAssetProcessedDir(assetId: string): string {
    const safeAssetId = this.sanitizeFilename(assetId);
    const assetDir = path.join(this.processedDir, safeAssetId);
    if (!fs.existsSync(assetDir)) {
      fs.mkdirSync(assetDir, { recursive: true });
    }
    return assetDir;
  }

  public sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      .replace(/\.{2,}/g, "_");
  }

  public fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  public deleteFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`Failed to delete file: ${filePath}`, e);
      return false;
    }
  }
}

export const storageManager = new LocalStorageManager();
