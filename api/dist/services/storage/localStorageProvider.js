"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../logging/logger");
class LocalStorageProvider {
    name = "local";
    baseDir;
    secretKey;
    constructor(baseDir) {
        this.baseDir = baseDir || path_1.default.resolve(process.cwd(), "private_storage");
        this.secretKey = process.env.JWT_SECRET || "local-storage-secret-signing-key";
        if (!fs_1.default.existsSync(this.baseDir)) {
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    async getDiagnostics() {
        return {
            driver: "local",
            configured: true,
            status: "READY",
            basePathOrBucket: this.baseDir,
            isCloudStorage: false,
        };
    }
    getFilePath(key) {
        const safeKey = key.replace(/^[/\\]+/, "").replace(/\.\./g, "_");
        return path_1.default.join(this.baseDir, safeKey);
    }
    async upload(key, data, options) {
        const filePath = this.getFilePath(key);
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
            await fs_1.default.promises.writeFile(filePath, data);
        }
        else {
            const writeStream = fs_1.default.createWriteStream(filePath);
            await new Promise((resolve, reject) => {
                data.pipe(writeStream).on("finish", () => resolve()).on("error", reject);
            });
        }
        logger_1.logger.info(`[LocalStorage] Uploaded ${key} (${filePath})`);
        return `/storage/${key}`;
    }
    async download(key) {
        const filePath = this.getFilePath(key);
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`Object not found: ${key}`);
        }
        return fs_1.default.promises.readFile(filePath);
    }
    async delete(key) {
        const filePath = this.getFilePath(key);
        if (fs_1.default.existsSync(filePath)) {
            await fs_1.default.promises.unlink(filePath);
        }
    }
    async head(key) {
        const filePath = this.getFilePath(key);
        if (!fs_1.default.existsSync(filePath))
            return null;
        const stats = await fs_1.default.promises.stat(filePath);
        return {
            key,
            sizeBytes: stats.size,
            contentType: "application/octet-stream",
            lastModified: stats.mtime,
        };
    }
    async generateSignedUrl(key, options) {
        const ttl = options?.expiresInSeconds || 3600;
        const expiresAt = Math.floor(Date.now() / 1000) + ttl;
        const signature = crypto_1.default
            .createHmac("sha256", this.secretKey)
            .update(`GET:${key}:${expiresAt}`)
            .digest("hex");
        return `/api/storage/signed/${encodeURIComponent(key)}?expires=${expiresAt}&signature=${signature}`;
    }
    async generateUploadUrl(key, options) {
        const ttl = options?.expiresInSeconds || 900;
        const expiresAt = Math.floor(Date.now() / 1000) + ttl;
        const signature = crypto_1.default
            .createHmac("sha256", this.secretKey)
            .update(`PUT:${key}:${expiresAt}`)
            .digest("hex");
        return `/api/storage/upload/${encodeURIComponent(key)}?expires=${expiresAt}&signature=${signature}`;
    }
    async list(prefix = "") {
        const results = [];
        if (!fs_1.default.existsSync(this.baseDir))
            return results;
        const walk = (dir) => {
            const files = fs_1.default.readdirSync(dir);
            for (const file of files) {
                const full = path_1.default.join(dir, file);
                const stat = fs_1.default.statSync(full);
                if (stat.isDirectory()) {
                    walk(full);
                }
                else {
                    const rel = path_1.default.relative(this.baseDir, full).replace(/\\/g, "/");
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
exports.LocalStorageProvider = LocalStorageProvider;
