export interface EncryptionResult {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  tag: string; // Base64 encoded (GCM auth tag)
  keyVersion: string;
}

export interface DecryptionParams {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion?: string;
}

export interface SignatureResult {
  signature: string;
  algorithm: string;
  keyVersion: string;
}

export interface IKmsProvider {
  name: string;
  generateDataKey(keyLengthBytes?: number): Promise<{ plaintextKey: Buffer; encryptedKey: string }>;
  encrypt(plaintext: Buffer | string): Promise<EncryptionResult>;
  decrypt(params: DecryptionParams): Promise<Buffer>;
  sign(data: Buffer | string): Promise<SignatureResult>;
  verify(data: Buffer | string, signature: string): Promise<boolean>;
  rotateKey(): Promise<{ newKeyVersion: string }>;
}
