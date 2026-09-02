"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeStorageProvider = exports.storageServiceFactory = exports.StorageServiceFactory = void 0;
const localStorageProvider_1 = require("./localStorageProvider");
const s3StorageProvider_1 = require("./s3StorageProvider");
class StorageServiceFactory {
    activeProvider;
    constructor() {
        const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
        switch (driver) {
            case "s3":
                this.activeProvider = new s3StorageProvider_1.S3StorageProvider();
                break;
            case "local":
            default:
                this.activeProvider = new localStorageProvider_1.LocalStorageProvider();
                break;
        }
    }
    getProvider() {
        return this.activeProvider;
    }
    async getDiagnostics() {
        return this.activeProvider.getDiagnostics();
    }
}
exports.StorageServiceFactory = StorageServiceFactory;
exports.storageServiceFactory = new StorageServiceFactory();
exports.activeStorageProvider = exports.storageServiceFactory.getProvider();
