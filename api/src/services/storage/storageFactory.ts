import { IStorageProvider, StorageDriverType, StorageDiagnostics } from "./types";
import { LocalStorageProvider } from "./localStorageProvider";
import { S3StorageProvider } from "./s3StorageProvider";

export class StorageServiceFactory {
  private activeProvider: IStorageProvider;

  constructor() {
    const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase() as StorageDriverType;

    switch (driver) {
      case "s3":
        this.activeProvider = new S3StorageProvider();
        break;
      case "local":
      default:
        this.activeProvider = new LocalStorageProvider();
        break;
    }
  }

  public getProvider(): IStorageProvider {
    return this.activeProvider;
  }

  public async getDiagnostics(): Promise<StorageDiagnostics> {
    return this.activeProvider.getDiagnostics();
  }
}

export const storageServiceFactory = new StorageServiceFactory();
export const activeStorageProvider = storageServiceFactory.getProvider();
