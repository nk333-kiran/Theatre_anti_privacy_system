"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStorageProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../logging/logger");
class ObjectStorageProvider {
    name = "s3_compatible";
    config;
    constructor(config) {
        this.config = config;
    }
    async getDiagnostics() {
        return {
            driver: "s3",
            configured: !!this.config.bucket,
            status: (this.config.bucket ? "READY" : "NOT_CONFIGURED"),
            basePathOrBucket: this.config.bucket,
            isCloudStorage: true,
            details: { region: this.config.region },
        };
    }
    async upload(key, data, options) {
        logger_1.logger.info(`[ObjectStorage] Simulated upload for key: ${key} to bucket: ${this.config.bucket}`);
        return `https://${this.config.bucket}.${this.config.endpoint || "s3.amazonaws.com"}/${key}`;
    }
    async download(key) {
        logger_1.logger.info(`[ObjectStorage] Fetching object ${key} from bucket ${this.config.bucket}`);
        return Buffer.from(`Simulated object storage data for ${key}`);
    }
    async delete(key) {
        logger_1.logger.info(`[ObjectStorage] Deleted object ${key} from bucket ${this.config.bucket}`);
    }
    async head(key) {
        return {
            key,
            sizeBytes: 1024 * 1024 * 50,
            contentType: "video/mp4",
            lastModified: new Date(),
            etag: crypto_1.default.createHash("md5").update(key).digest("hex"),
        };
    }
    async generateSignedUrl(key, options) {
        const ttl = options?.expiresInSeconds || 3600;
        const expiresAt = Math.floor(Date.now() / 1000) + ttl;
        const stringToSign = `GET\n\n\n${expiresAt}\n/${this.config.bucket}/${key}`;
        const signature = crypto_1.default
            .createHmac("sha1", this.config.secretAccessKey)
            .update(stringToSign)
            .digest("base64");
        const endpoint = this.config.endpoint || `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
        return `https://${endpoint}/${key}?AWSAccessKeyId=${encodeURIComponent(this.config.accessKeyId)}&Signature=${encodeURIComponent(signature)}&Expires=${expiresAt}`;
    }
    async generateUploadUrl(key, options) {
        const ttl = options?.expiresInSeconds || 900;
        const expiresAt = Math.floor(Date.now() / 1000) + ttl;
        const stringToSign = `PUT\n\n${options?.contentType || "video/mp4"}\n${expiresAt}\n/${this.config.bucket}/${key}`;
        const signature = crypto_1.default
            .createHmac("sha1", this.config.secretAccessKey)
            .update(stringToSign)
            .digest("base64");
        const endpoint = this.config.endpoint || `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
        return `https://${endpoint}/${key}?AWSAccessKeyId=${encodeURIComponent(this.config.accessKeyId)}&Signature=${encodeURIComponent(signature)}&Expires=${expiresAt}`;
    }
    async list(prefix = "") {
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
exports.ObjectStorageProvider = ObjectStorageProvider;
