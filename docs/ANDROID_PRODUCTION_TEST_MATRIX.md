# Android Production Test Matrix

## 1. Overview & Legend

This test matrix defines the physical test scenarios and expected behavioral classifications for the Theatre Anti-Piracy Native Android application across different Android OS versions, device form factors, and hardware conditions.

### Classification Legend:
* **SUPPORTED**: Standard Android API / platform capability fully handled and guaranteed by the application.
* **PLATFORM-DEPENDENT**: Capability depends on the specific Android OS version (e.g., API 34+ vs API 26+) or OEM implementation.
* **UNSUPPORTED / SAFETY BOUNDARY**: Physically impossible or out-of-sandbox behavior that no legitimate software can provide.

---

## 2. Test Execution Matrix

| Test ID | Scenario | Preconditions | Steps / Action | Expected Result | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAM-01** | Camera Permission Granted | App freshly installed on device. | Tap "Grant Camera Permission" and select "While using the app". | Camera preview initiates immediately via CameraX; reticle overlay renders; QR decoding active. | **SUPPORTED** |
| **CAM-02** | Camera Permission Denied | Camera permission denied or revoked. | Deny camera permission dialog. | Fallback UI displayed; Manual Token input field and test presets available for admission. | **SUPPORTED** |
| **CAM-03** | Low Light QR Scanning | Darkened theatre auditorium environment. | Point camera at illuminated or low-contrast printed QR code. | Google ML Kit barcode processor auto-adjusts exposure and recognizes valid QR token. | **SUPPORTED** |
| **QR-01** | Valid Ticket QR Scan | Unused, valid ticket QR with HMAC signature. | Scan `QRTK.<code signature>`. | Status 200 OK; Session transitions to `ACTIVE`; Dynamic Watermark overlay begins floating. | **SUPPORTED** |
| **QR-02** | Duplicate Admission Scan | Ticket has already been scanned/admitted. | Re-scan the same ticket QR. | Rejection dialog with error `ALREADY_ACTIVATED (409)`; no second session created. | **SUPPORTED** |
| **QR-03** | Expired Ticket Scan | Showtime ended > 30 minutes ago. | Scan expired ticket QR. | Rejection dialog with error `EXPIRED_TICKET (400)`; admission blocked. | **SUPPORTED** |
| **QR-04** | Cancelled Ticket Scan | Ticket status marked `CANCELLED` in DB. | Scan cancelled ticket QR. | Rejection dialog with error `CANCELLED_TICKET (400)`; admission blocked. | **SUPPORTED** |
| **QR-05** | Tampered QR Payload | Forged HMAC signature in QR string. | Scan `QRTK.ACT-XXX.0000000000000000`. | Rejection with `INVALID_QR (400)`; security audit log recorded. | **SUPPORTED** |
| **QR-06** | Cross-Venue Mismatch | Operator at Theatre A scans Theatre B ticket. | Operator logged into Theatre A scans foreign pass. | Blocked with `UNAUTHORIZED_THEATRE (403)`; tenant isolation preserved. | **SUPPORTED** |
| **TEL-01** | Window Screenshot Attempt (OS) | Active screening session open. | Press Power + Volume Down on Android device. | OS blocks screenshot with "Can't take screenshot due to security policy" via `FLAG_SECURE`. | **SUPPORTED** |
| **TEL-02** | Screen Capture Detection (Android 14) | Device running Android 14 (API 34+). | Trigger screen recording or capture request. | `Activity.ScreenCaptureCallback` fires; non-punitive educational advisory dialog displayed. | **PLATFORM-DEPENDENT** *(Android 14+)* |
| **TEL-03** | Task Switcher Preview | Active session with sensitive metadata. | Press Android Recents / Task Switcher button. | App card displays blank dark screen; zero movie or patron metadata previewed. | **SUPPORTED** |
| **TEL-04** | App Background / Split-Screen | User minimizes app or enters multi-window. | Press Home or open secondary app in split view. | `SCREEN_VISIBILITY_CHANGE` signal dispatched to SOC; non-punitive warning logged. | **SUPPORTED** |
| **NET-01** | Transient Network Disconnect | Active session running; Wi-Fi toggled off. | Toggle Airplane mode or disable Wi-Fi. | Session remains active locally; dynamic watermark continues from cached session token. | **SUPPORTED** |
| **NET-02** | Telemetry Offline Queueing | Device offline; security event occurs. | Trigger visibility change while offline. | Event enqueued in `TelemetryRetryQueue` with unique UUID idempotency key. | **SUPPORTED** |
| **NET-03** | Network Reconnect & Auto-Flush | Device reconnects to network. | Turn Wi-Fi back on. | `NetworkStateTracker` triggers `flushQueue()`; pending telemetry delivered without duplicates. | **SUPPORTED** |
| **SES-01** | Process Restart / Activity Recreation | Active session running. | Rotate device or kill app process in background. | `SecureStorageManager` restores active session and resumes dynamic watermark without re-scanning. | **SUPPORTED** |
| **SES-02** | Session Expiration Handshake | Show finishes and protection timer reaches 0. | Wait until `expiresAt` is reached. | Session transitions to `EXPIRED`; watermark rotation halts; storage cleaned up. | **SUPPORTED** |
| **SEC-01** | Optical Camera Detection | Another person films screen with external phone. | Point external smartphone camera at screen. | **Not software-detectable**. Forensic dynamic watermark identifies venue and seat on leak. | **UNSUPPORTED / SAFETY BOUNDARY** |
| **SEC-02** | Remote Camera Hardware Disable | Patron holding phone in auditorium. | Attempt to disable phone's hardware camera. | **Physically impossible / violates OS security sandbox**. | **UNSUPPORTED / SAFETY BOUNDARY** |

---

## 3. Platform-Dependent Behaviors Across Android SDK Versions

| Android Version | API Level | Window Protection | ScreenCaptureCallback | KeyStore Encryption |
| :--- | :--- | :--- | :--- | :--- |
| **Android 14 & 15** | 34 - 35 | `FLAG_SECURE` (Full) | Native OS Callback Supported | AES-256 GCM KeyStore |
| **Android 12 & 13** | 31 - 33 | `FLAG_SECURE` (Full) | Fallback Lifecycle & Window Blur | AES-256 GCM KeyStore |
| **Android 10 & 11** | 29 - 30 | `FLAG_SECURE` (Full) | Fallback Lifecycle Tracker | AES-256 GCM KeyStore |
| **Android 8.0 - 9.0** | 26 - 28 | `FLAG_SECURE` (Full) | Fallback Lifecycle Tracker | AES-256 GCM KeyStore |
