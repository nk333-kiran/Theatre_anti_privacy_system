"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageManager = exports.LocalStorageManager = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class LocalStorageManager {
    baseDir;
    rawDir;
    processedDir;
    constructor(customBaseDir) {
        this.baseDir =
            customBaseDir ||
                process.env.STORAGE_BASE_DIR ||
                path_1.default.resolve(process.cwd(), "private_storage");
        this.rawDir = path_1.default.join(this.baseDir, "raw");
        this.processedDir = path_1.default.join(this.baseDir, "processed");
        this.initDirectories();
    }
    initDirectories() {
        [this.baseDir, this.rawDir, this.processedDir].forEach((dir) => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
    }
    getRawStorageDir() {
        return this.rawDir;
    }
    getProcessedStorageDir() {
        return this.processedDir;
    }
    getAssetProcessedDir(assetId) {
        const safeAssetId = this.sanitizeFilename(assetId);
        const assetDir = path_1.default.join(this.processedDir, safeAssetId);
        if (!fs_1.default.existsSync(assetDir)) {
            fs_1.default.mkdirSync(assetDir, { recursive: true });
        }
        return assetDir;
    }
    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
            .replace(/\.{2,}/g, "_");
    }
    fileExists(filePath) {
        try {
            return fs_1.default.existsSync(filePath);
        }
        catch {
            return false;
        }
    }
    deleteFile(filePath) {
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                return true;
            }
            return false;
        }
        catch (e) {
            console.error(`Failed to delete file: ${filePath}`, e);
            return false;
        }
    }
}
exports.LocalStorageManager = LocalStorageManager;
exports.storageManager = new LocalStorageManager();
