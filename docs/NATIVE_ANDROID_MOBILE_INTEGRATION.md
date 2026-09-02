# Phase 32: Native Android Anti-Piracy Mobile App Integration Guide

## 1. Overview & Architecture

Phase 32 introduces the **Native Android Mobile Application** for the Theatre Anti-Piracy Platform. Built using modern Android Jetpack architecture (Kotlin, Jetpack Compose, CameraX, Google ML Kit, EncryptedSharedPreferences, OkHttp/Retrofit, and Lifecycle Telemetry), the native application replaces the browser-only mobile workflow while natively consuming the existing backend APIs and SOC orchestration pipeline.

```
+---------------------------------------------------------------------------------------------------+
|                              NATIVE ANDROID ANTI-PIRACY ARCHITECTURE                              |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [Android Device]                                                                                 |
|         │                                                                                         |
|         ├── [1. Secure Auth] ───────> EncryptedSharedPreferences (AES-256 GCM MasterKey)          |
|         │                                │                                                        |
|         │                                ▼                                                        |
|         │                         /api/auth/login (JWT Bearer Injection)                          |
|         │                                                                                         |
|         ├── [2. CameraX + ML Kit] ──> Hardware Viewfinder Scanner                                 |
|         │                                │                                                        |
|         │                                ▼                                                        |
|         │                         /api/mobile/verify (Signed QRTK.<activationCode>.<hmac>)        |
|         │                                │                                                        |
|         │                                ▼                                                        |
|         ├── [3. Protected Session] ─> Live Countdown & Floating Dynamic Watermark Canvas          |
|         │                                │                                                        |
|         │                                ▼                                                        |
|         │                         /api/mobile/watermark/rotate (25-second Periodic Epoch Sync)    |
|         │                                                                                         |
|         ├── [4. OS Telemetry] ──────> WindowManager FLAG_SECURE + Android 14 ScreenCaptureCallback|
|         │                                │                                                        |
|         │                                ▼                                                        |
|         │                         /api/mobile/security/event (Non-Punitive Telemetry to SOC)      |
|         │                                │                                                        |
|         │                                ▼                                                        |
|         └── [5. Forensic Vault] ────> /api/mobile/watermark/attribute & /watermark/evidence       |
|                                          │                                                        |
|                                          ▼                                                        |
|                                   [Evidence Vault] ──> [SOC Incident] ──> [Studio Intelligence]   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Native Android Codebase Structure

All native Android source code is organized within the `android/` directory:

```
android/
├── build.gradle.kts                          # Root Gradle build script
├── settings.gradle.kts                       # Root project settings
└── app/
    ├── build.gradle.kts                      # Module build script (Compose, CameraX, ML Kit, Retrofit)
    └── src/main/
        ├── AndroidManifest.xml               # Permissions (CAMERA, INTERNET) & Application declaration
        ├── res/                              # Strings, styles, themes, and data extraction rules
        └── java/com/theatre/antipiracy/
            ├── AntiPiracyApplication.kt      # Application entrypoint initializing singletons
            ├── MainActivity.kt               # Root Activity with FLAG_SECURE & bottom navigation
            ├── data/
            │   ├── local/
            │   │   └── SecureStorageManager.kt   # EncryptedSharedPreferences (AES-256 SIV/GCM)
            │   ├── models/
            │   │   └── NetworkModels.kt          # Gson models matching backend schemas
            │   └── remote/
            │       ├── ApiClient.kt              # OkHttp client with Bearer auth & dynamic base URL
            │       └── MobileApiService.kt       # Retrofit suspend interface
            ├── camera/
            │   └── QrScannerManager.kt           # CameraX lifecycle binder + ML Kit barcode analyzer
            ├── security/
            │   ├── SecurityTelemetryManager.kt   # Window FLAG_SECURE, Android 14 capture callback & SOC events
            │   └── WatermarkRotationManager.kt   # Dynamic watermark rotation state machine
            └── ui/
                ├── theme/Theme.kt                # Material 3 dark mode theme
                ├── components/
                │   ├── AntiPiracyWarningDialog.kt# Non-punitive educational dialog
                │   └── DynamicWatermarkOverlay.kt# Floating diagonal canvas watermark renderer
                └── screens/
                    ├── AuthScreen.kt             # Operator sign-in & venue binding
                    ├── QrScannerScreen.kt        # Live CameraX scanner with error handling
                    ├── ProtectedSessionScreen.kt # Active screening session & live watermark
                    ├── ForensicAttributionScreen.kt # Watermark seat lookup & Evidence Vault seal
                    ├── SecurityTelemetryScreen.kt# Manual & automatic telemetry emission
                    └── DiagnosticsScreen.kt      # Hardware, OS, ping latency & endpoint configuration
```

---

## 3. Backend API Integration Mapping

| Native App Component | Backend Endpoint | Method | Request / Response Purpose |
| :--- | :--- | :--- | :--- |
| `AuthScreen` | `/api/auth/login` | `POST` | Operator authentication and theatre venue binding. |
| `DiagnosticsScreen` | `/health` | `GET` | Real-time connectivity and latency (ping ms) probe. |
| `QrScannerScreen` | `/api/mobile/verify` | `POST` | Validates signed `QRTK.<code signature>` tokens; creates protected session. |
| `ProtectedSessionScreen` | `/api/mobile/session/:id` | `GET` | Fetches active screening metadata, movie details, and seat assignment. |
| `WatermarkRotationManager` | `/api/mobile/watermark/rotate` | `POST` | Synchronizes dynamic watermark to 25-second periodic epoch slot. |
| `ForensicAttributionScreen` | `/api/mobile/watermark/attribute` | `POST` | Resolves watermark hash to exact theatre, auditorium, and seat number. |
| `ForensicAttributionScreen` | `/api/mobile/watermark/evidence` | `POST` | Seals immutable SHA-256 forensic record into the Evidence Vault. |
| `SecurityTelemetryManager` | `/api/mobile/security/event` | `POST` | Emits normalized telemetry signals to the Unified SOC Incident pipeline. |

---

## 4. Supported Android Security Capabilities & Platform Boundaries

### Supported Native Android Capabilities:
1. **Window-Level Screen Capture Prevention (`FLAG_SECURE`)**:
   * Enables `WindowManager.LayoutParams.FLAG_SECURE` on the window.
   * Prevents standard OS-level screenshots and hides content in the Android recent apps task switcher.
2. **Android 14 (API 34) Screen Capture Detection (`Activity.ScreenCaptureCallback`)**:
   * Registers native OS screen capture callbacks to detect when the user attempts a hardware screenshot or screen recording.
   * Dispatches normalized `SCREEN_CAPTURE_SIGNAL` to the SOC pipeline.
3. **Application Lifecycle Tracking**:
   * Monitors `ActivityLifecycleCallbacks` for `onActivityPaused` and `onActivityResumed` to detect app backgrounding, split-screen mode, or loss of window focus (`SCREEN_VISIBILITY_CHANGE`, `FOREGROUND_BACKGROUND_CHANGE`).
4. **Encrypted Local Storage**:
   * Uses `androidx.security.crypto.EncryptedSharedPreferences` backed by the Android KeyStore (`AES256_GCM`) to store auth tokens and active session tokens securely.

### Explicit Safety & Platform Boundaries (Architectural Truth):
* ❌ **No Physical Camera Disabling**: Browser and Android JavaScript/Kotlin apps cannot physically disable external camera hardware or external phones in the auditorium.
* ❌ **No Detection of External Cameras / Lenses**: An app running on a device cannot detect optical lenses or cameras pointing at the screen from the outside.
* ❌ **No Guaranteed Screen Recording Prevention**: OS-level root modifications, external capture cards, or HDMI splitters bypass `FLAG_SECURE`.
* ❌ **No Covert Surveillance / OS Memory Scraping**: Operates strictly within standard sandbox permissions.

---

## 5. Non-Punitive Warning UX

* **Advisory Notifications**: When telemetry detects visibility change or capture signals, a non-punitive dialog (`AntiPiracyWarningDialog.kt`) is displayed to the operator.
* **Preserved Session Continuity**: Single/weak signals **never** automatically terminate sessions, eject users, or lock out patrons.
* **Human Approval Enforcement Model**: Any formal enforcement action requires explicit Human SOC / Studio Admin review and approval through the existing Investigation and Enforcement pipelines.

---

## 6. Verification & Automated Test Suites

Run the full Native Mobile integration test suite:
```bash
npm run test:mobile
```
Runs:
1. `src/test/mobileAppFoundationTest.ts` (Phase 21-22 foundation)
2. `src/test/mobileAntiPiracyProtectionTest.ts` (Phase 23 protection)
3. `src/test/mobileWatermarkForensicsTest.ts` (Phase 24 watermarks)
4. `src/test/mobileDeviceIntegrationTest.ts` (Phase 31 real device integration)
5. `src/test/mobileNativeIntegrationTest.ts` (Phase 32 native Android integration)
