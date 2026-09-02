"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageManager = void 0;
const localStorageProvider_1 = require("./localStorageProvider");
const objectStorageProvider_1 = require("./objectStorageProvider");
const logger_1 = require("../logging/logger");
class StorageManager {
    activeProvider;
    constructor() {
        const providerType = process.env.STORAGE_PROVIDER || "local";
        if (providerType === "s3" && process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY) {
            this.activeProvider = new objectStorageProvider_1.ObjectStorageProvider({
                bucket: process.env.STORAGE_BUCKET,
                region: process.env.STORAGE_REGION || "us-east-1",
                endpoint: process.env.STORAGE_ENDPOINT,
                accessKeyId: process.env.STORAGE_ACCESS_KEY,
                secretAccessKey: process.env.STORAGE_SECRET_KEY || "secret",
            });
            logger_1.logger.info(`[StorageManager] Initialized Cloud S3 Object Storage Provider (${process.env.STORAGE_BUCKET})`);
        }
        else {
            this.activeProvider = new localStorageProvider_1.LocalStorageProvider();
            logger_1.logger.info(`[StorageManager] Initialized Local Storage Provider`);
        }
    }
    getProvider() {
        return this.activeProvider;
    }
    setProvider(provider) {
        this.activeProvider = provider;
    }
}
exports.storageManager = new StorageManager();
