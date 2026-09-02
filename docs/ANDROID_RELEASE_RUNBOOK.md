# Android Production Release Runbook

## 1. Build & Release Preparation

### 1.1 Prerequisites
* Android Studio Iguana or higher
* JDK 17
* Android SDK Platform 34

### 1.2 Release Compilation
```bash
cd android
./gradlew assembleRelease
```

---

## 2. Release Security Checklist

- [x] `debuggable` set to `false` in release build type.
- [x] ProGuard/R8 rules active with code shrinking and obfuscation.
- [x] `FLAG_SECURE` applied to WindowManager in ScreeningActivity.
- [x] Android 14+ `ScreenCaptureCallback` active for telemetry ingestion.
- [x] CameraX QR scanner configured with HMAC verification.
- [x] Offline retry queue with deduplication active for unstable connectivity.
- [x] Zero hardcoded JWT secrets in APK resources or manifest.

---

## 3. Physical Boundary Statement

> **IMPORTANT**: Software security controls on mobile devices (e.g. `FLAG_SECURE`, watermark canvas) protect against onboard recording and screenshots. **No mobile application can physically prevent an external analog camera or optical camcorder from recording a movie theatre screen.** The platform mitigates this threat through dynamic forensic patron watermarks that identify the leak source downstream.
