# Cloud Key Management Service (KMS) & Envelope Encryption

## 1. Key Hierarchy

The platform uses a two-tier Envelope Encryption architecture:

```text
 ┌────────────────────────────────────────┐
 │   Cloud KMS / HSM Root Master Key     │ (Never leaves Cloud KMS HSM)
 └───────────────────┬────────────────────┘
                     │ Encrypts / Decrypts
                     ▼
 ┌────────────────────────────────────────┐
 │  Data Encryption Keys (DEK) (AES-256)  │ (Rotated per video asset / DRM license)
 └───────────────────┬────────────────────┘
                     │ Encrypts
                     ▼
 ┌────────────────────────────────────────┐
 │      Encrypted Media Chunks (fMP4)     │
 └────────────────────────────────────────┘
```

---

## 2. Key Isolation & Sanitization

* **Zero Plaintext Storage**: Data Encryption Keys (DEKs) are stored in ciphertext format in the database.
* **Zero Log Exposure**: Keys, tokens, and cryptographic seeds are redacted from all Winston and Morgan log outputs.
* **Key Rotation**: Master keys can be rotated without re-encrypting existing video assets via DEK re-wrapping.
