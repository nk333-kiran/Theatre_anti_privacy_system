import crypto from "crypto";
import { IKmsProvider, EncryptionResult, DecryptionParams, SignatureResult } from "./types";
import { logger } from "../logging/logger";

export class LocalKmsProvider implements IKmsProvider {
  public name = "local_aes256_gcm";
  private masterKey: Buffer;
  private keyVersion = "v1";

  constructor(masterSecret?: string) {
    const raw = masterSecret || process.env.JWT_SECRET || "default-kms-encryption-key-32-chars-minimum";
    this.masterKey = crypto.createHash("sha256").update(raw).digest();
  }

  public async generateDataKey(keyLengthBytes = 32): Promise<{ plaintextKey: Buffer; encryptedKey: string }> {
    const plaintextKey = crypto.randomBytes(keyLengthBytes);
    const encResult = await this.encrypt(plaintextKey);
    return {
      plaintextKey,
      encryptedKey: JSON.stringify(encResult),
    };
  }

  public async encrypt(plaintext: Buffer | string): Promise<EncryptionResult> {
    const buffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf-8");
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", this.masterKey, iv);

    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      keyVersion: this.keyVersion,
    };
  }

  public async decrypt(params: DecryptionParams): Promise<Buffer> {
    const iv = Buffer.from(params.iv, "base64");
    const ciphertext = Buffer.from(params.ciphertext, "base64");
    const tag = Buffer.from(params.tag, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", this.masterKey, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  public async sign(data: Buffer | string): Promise<SignatureResult> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8");
    const signature = crypto.createHmac("sha256", this.masterKey).update(buffer).digest("hex");

    return {
      signature,
      algorithm: "HMAC-SHA256",
      keyVersion: this.keyVersion,
    };
  }

  public async verify(data: Buffer | string, signature: string): Promise<boolean> {
    const expected = await this.sign(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected.signature, "hex")
    );
  }

  public async rotateKey(): Promise<{ newKeyVersion: string }> {
    const nextVer = `v${parseInt(this.keyVersion.replace("v", ""), 10) + 1}`;
    this.keyVersion = nextVer;
    logger.info(`[KMS] Rotated master key to version ${nextVer}`);
    return { newKeyVersion: nextVer };
  }
}

class KmsManager {
  private activeProvider: IKmsProvider;

  constructor() {
    this.activeProvider = new LocalKmsProvider();
    logger.info(`[KmsManager] Initialized KMS Provider: ${this.activeProvider.name}`);
  }

  public getProvider(): IKmsProvider {
    return this.activeProvider;
  }

  public setProvider(provider: IKmsProvider): void {
    this.activeProvider = provider;
  }
}

export const kmsManager = new KmsManager();
