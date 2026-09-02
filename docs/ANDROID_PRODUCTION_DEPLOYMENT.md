# Android Production Deployment Guide

## 1. Build & Release Artifacts

The native Android app supports standard Android Gradle plugin build variants for Debug APKs, Release APKs, and Google Play Android App Bundles (AAB).

### 1.1 Application Versioning
* **`versionCode`**: `100` (Monotonically increasing integer)
* **`versionName`**: `"1.0.0"` (Semantic versioning: `MAJOR.MINOR.PATCH`)

### 1.2 Gradle Build Commands

```bash
# Navigate to android directory
cd android

# Build Debug APK (for local LAN / testing)
./gradlew assembleDebug

# Output location:
# app/build/outputs/apk/debug/app-debug.apk

# Build Production Release APK
./gradlew assembleRelease

# Output location:
# app/build/outputs/apk/release/app-release-unsigned.apk

# Build Production Google Play Bundle (AAB)
./gradlew bundleRelease

# Output location:
# app/build/outputs/bundle/release/app-release.aab
```

---

## 2. Release Signing & KeyStore Setup

Production release APKs and AABs must be signed using an Android release signing key:

```bash
# Generate production keystore (if not already existing)
keytool -genkey -v -keystore theatre-antipiracy-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias antipiracy-key

# Sign release APK with apksigner
apksigner sign --ks theatre-antipiracy-release.jks \
  --ks-key-alias antipiracy-key \
  --in app-release-unsigned.apk \
  --out app-release-signed.apk
```

---

## 3. Environment & HTTPS Configuration

| Environment | Base API URL | Cleartext (HTTP) Permitted | Target Audience |
| :--- | :--- | :--- | :--- |
| **Development** | `http://10.0.2.2:4000/api` or `http://192.168.x.x:4000/api` | **Yes** (Emulator / LAN only) | Local Dev & Test Engineers |
| **Staging** | `https://staging-api.theatre-antipiracy.com/api` | **No** (Strict TLS 1.3 / 1.2) | QA / Stage Checkpoint Operators |
| **Production** | `https://api.theatre-antipiracy.com/api` | **No** (Strict TLS 1.3 / 1.2) | Production Theatre Checkpoints |

### Network Security Configuration (`network_security_config.xml`):
* Cleartext traffic is strictly disabled by default.
* Production builds reject plain HTTP requests and enforce valid CA certificates.

---

## 4. Production Security Checklist

Prior to deploying the native Android app into production:

- [x] **`FLAG_SECURE` Enabled**: Window protection active on all activity screens.
- [x] **Cleartext Traffic Disabled**: Base config set to `cleartextTrafficPermitted="false"`.
- [x] **EncryptedSharedPreferences**: Auth tokens and active sessions encrypted using Android KeyStore MasterKey (AES-256 GCM).
- [x] **No Exported Components**: Activities and services configured with `android:exported="false"` (except main launcher).
- [x] **Backup Exclusions**: `data_extraction_rules.xml` excludes credentials from cloud backups.
- [x] **Zero Hardcoded Secrets**: Zero JWT secrets, database connection strings, or server private keys compiled into client code.
- [x] **Non-Punitive Telemetry**: Security warnings operate on advisory principles without arbitrary lockouts.
- [x] **Tenant / Venue Isolation**: Operator permissions strictly bound to assigned theatre ID.
- [x] **R8 Obfuscation & Log Stripping**: Proguard rules strip `Log.d`, `Log.v`, and `Log.i` statements in release builds.

---

## 5. Rollback Procedure

In the event of an unexpected release issue at theatre checkpoints:

1. **Immediate Server-Side Fallback**:
   * Backend APIs maintain backwards compatibility with Phase 31 web scanner (`/mobile`). Operators can instantly access the web checkpoint UI from any phone browser without waiting for an app update.
2. **Version Retirement in Console**:
   * If using Google Play / MDM, roll back to the previous stable release artifact or release a hotfix build incrementing `versionCode`.
3. **Session State Invalidation**:
   * Use the SOC Admin Console (`/api/soc/*`) to revoke compromised session tokens without affecting other theatre screening rooms.

---

## 6. Known Android Platform Limitations (Safety Truth)

| Limitation | Explanation | Mitigation |
| :--- | :--- | :--- |
| **External Cameras** | Software running on a phone cannot detect or disable external smartphones or cameras in the theatre audience. | Dynamic forensic watermarking periodically embedded into the stream links leaked video back to the exact seat. |
| **Rooted OS Capture** | Kernel-level screen scrapers on rooted devices can bypass `FLAG_SECURE`. | Tamper and integrity verification, combined with forensic attribution. |
| **Camera Hardware Control** | Android OS permissions do not grant one application control over third-party hardware. | Platform adheres to legal sandbox constraints. |
