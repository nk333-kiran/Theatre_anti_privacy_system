# Android Production Release Pipeline

## 1. Release Hardening & Signing Strategy

The Theatre Anti-Piracy Android application enforces enterprise release requirements:

1. **Release Build Configuration**:
   - `minifyEnabled true`
   - `shrinkResources true`
   - ProGuard/R8 obfuscation enabled with rules preserving DRM / camera APIs.
2. **Production API Endpoint**:
   - Explicit HTTPS production endpoints (`https://theatre-security.com/api`).
   - Cleartext traffic disabled (`android:usesCleartextTraffic="false"`).
3. **No Embedded Signing Keys in Git**:
   - Release Keystores and passwords are provided strictly via CI/CD environment variables or secure keystore vaults.
4. **Hardware-Backed Cryptography**:
   - Android Keystore used for asymmetric token signing and watermark verification.
5. **Anti-Tampering & Root Detection**:
   - Checks for SuperSU, Magisk, emulator environments, and debugging flags (`BuildConfig.DEBUG == false`).
