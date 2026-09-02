"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kmsManager = exports.LocalKmsProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../logging/logger");
class LocalKmsProvider {
    name = "local_aes256_gcm";
    masterKey;
    keyVersion = "v1";
    constructor(masterSecret) {
        const raw = masterSecret || process.env.JWT_SECRET || "default-kms-encryption-key-32-chars-minimum";
        this.masterKey = crypto_1.default.createHash("sha256").update(raw).digest();
    }
    async generateDataKey(keyLengthBytes = 32) {
        const plaintextKey = crypto_1.default.randomBytes(keyLengthBytes);
        const encResult = await this.encrypt(plaintextKey);
        return {
            plaintextKey,
            encryptedKey: JSON.stringify(encResult),
        };
    }
    async encrypt(plaintext) {
        const buffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf-8");
        const iv = crypto_1.default.randomBytes(12); // Standard 96-bit IV for AES-GCM
        const cipher = crypto_1.default.createCipheriv("aes-256-gcm", this.masterKey, iv);
        const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const tag = cipher.getAuthTag();
        return {
            ciphertext: ciphertext.toString("base64"),
            iv: iv.toString("base64"),
            tag: tag.toString("base64"),
            keyVersion: this.keyVersion,
        };
    }
    async decrypt(params) {
        const iv = Buffer.from(params.iv, "base64");
        const ciphertext = Buffer.from(params.ciphertext, "base64");
        const tag = Buffer.from(params.tag, "base64");
        const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", this.masterKey, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }
    async sign(data) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8");
        const signature = crypto_1.default.createHmac("sha256", this.masterKey).update(buffer).digest("hex");
        return {
            signature,
            algorithm: "HMAC-SHA256",
            keyVersion: this.keyVersion,
        };
    }
    async verify(data, signature) {
        const expected = await this.sign(data);
        return crypto_1.default.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected.signature, "hex"));
    }
    async rotateKey() {
        const nextVer = `v${parseInt(this.keyVersion.replace("v", ""), 10) + 1}`;
        this.keyVersion = nextVer;
        logger_1.logger.info(`[KMS] Rotated master key to version ${nextVer}`);
        return { newKeyVersion: nextVer };
    }
}
exports.LocalKmsProvider = LocalKmsProvider;
class KmsManager {
    activeProvider;
    constructor() {
        this.activeProvider = new LocalKmsProvider();
        logger_1.logger.info(`[KmsManager] Initialized KMS Provider: ${this.activeProvider.name}`);
    }
    getProvider() {
        return this.activeProvider;
    }
    setProvider(provider) {
        this.activeProvider = provider;
    }
}
exports.kmsManager = new KmsManager();
