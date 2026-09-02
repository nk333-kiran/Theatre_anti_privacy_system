# Phase 31: Real Mobile Device Integration & LAN Testing Guide

## 1. Overview & Architecture

Phase 31 connects real physical mobile devices (such as an Android smartphone) on the local area network (LAN) into the Theatre Anti-Piracy platform. It validates the full anti-piracy lifecycle—from real ticket QR scanning at the theatre checkpoint to live protected screening sessions, rotating forensic watermarking, non-punitive security monitoring, SOC telemetry ingestion, and Evidence Vault logging.

```
+---------------------------------------------------------------------------------------------------+
|                                      PHASE 31 MOBILE LIFECYCLE                                    |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [Android Phone] ---> [Login] ---> [Ticket QR Scanner] ---> [Secure QR Verification]             |
|         |                                                           |                             |
|         v                                                           v                             |
|  [Diagnostics] <----------------------------------------- [Protected Session]                    |
|         |                                                           |                             |
|         v                                                           v                             |
|  [SOC Signal] <--- [Security Monitoring] <---------------- [Dynamic Watermark (Rotating)]         |
|         |                                                           |                             |
|         v                                                           v                             |
|  [SOC Incident] ---> [Evidence Vault] ---> [Investigation] ---> [Approval] ---> [Enforcement]     |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. LAN Setup & Host Configuration

To allow an Android phone on the same Wi-Fi network to access the web and API servers:

### 2.1 Find Your Host Computer's LAN IP
* **Windows (PowerShell/CMD)**:
  ```powershell
  ipconfig
  ```
  Look for `IPv4 Address` under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.100` or `10.0.0.15`).

### 2.2 Server Host Bindings
* **Web Frontend (Next.js)**: Configured to bind on `0.0.0.0:3000` via:
  ```bash
  npm run dev:web
  # Executes: next dev -H 0.0.0.0 -p 3000
  ```
* **Backend API (Express)**: Configured to listen on `0.0.0.0:4000`:
  ```bash
  npm run dev:api
  # Executes: tsx watch src/index.ts
  ```

### 2.3 CORS & LAN Origin Support
The backend CORS policy dynamically accepts private LAN origins in non-production environments:
* `192.168.0.0/16`
* `10.0.0.0/8`
* `172.16.0.0/12`
* `localhost` and `127.0.0.1`

---

## 3. Step-by-Step Android Testing Guide

### Step 1: Connect Phone to Wi-Fi
Connect your Android phone to the same local Wi-Fi network as the host development machine.

### Step 2: Open the Mobile Application
Open Chrome, Edge, or Firefox on the Android phone and navigate to:
```
http://<YOUR_HOST_LAN_IP>:3000/mobile
```
*(Example: `http://192.168.1.100:3000/mobile`)*

### Step 3: Authenticate
Sign in using demo theatre staff credentials:
* **Email**: `staff@theatre.com`
* **Password**: `admin123`
*(Or use the 1-tap "Theatre Staff" / "Theatre Admin" preset buttons)*

### Step 4: Run Diagnostic Check (Tab: "Diag")
Tap the **Diag** tab in the bottom navigation bar:
* **API Connectivity**: Verifies real-time ping latency (ms) and connection state.
* **Authentication Status**: Confirms valid JWT, operator name, and venue binding.
* **Camera & Security Context**: Shows `window.isSecureContext` status and MediaDevices availability.
* **QR Scanner Subsystem**: Shows hardware barcode detector acceleration status.
* **Custom API URL**: Allows overriding the API endpoint directly on the phone if needed.

### Step 5: Test QR Ticket Verification (Tab: "Scan")
1. Tap **Launch QR Camera Scanner** to start live viewfinder scanning.
2. If scanning a printed or on-screen ticket QR, aim the rear camera at the code.
3. **Android HTTP Fallback (Native Camera Snapshot)**: If running over plain HTTP where live stream camera permissions are blocked by the browser, tap **Take Photo / Snap QR**. Android opens the native camera app to capture a high-resolution photo and automatically decodes the ticket QR.
4. **Preset Fallbacks**: Fast test buttons (e.g. `ACT-DEMO-01`, `TCK-IMAX-01`) are available under "Show Presets".

### Step 6: Inspect Protected Screening Session (Tab: "Session")
Upon successful verification:
* The session state transitions to **ACTIVE**.
* Displays verified movie title, runtime, auditorium screen, and seat assignment.
* Protection window timer displays remaining minutes until show completion.
* Dynamic watermark overlay activates with time slot identifier and venue cryptographic hash.

### Step 7: Verify Dynamic Watermark Rotation
* The watermark automatically queries the rotation endpoint every 25 seconds.
* Watermark slot increments (`SLOT #100`, `SLOT #101`, etc.) with rotated cryptographic HMAC signatures.
* No passwords, JWT secrets, or patron PII are ever exposed in the watermark string.

### Step 8: Test Forensic Watermark Attribution (Tab: "Attrib")
1. Copy or paste an active watermark identifier (e.g. `WM-ODE-SES-...`).
2. Tap **Attributed** to run cryptographic signature matching.
3. Confirms exact theatre venue, auditorium, seat number, and ticket number.
4. Tap **Log Trace to Evidence Vault** to seal an immutable SHA-256 evidence record.

### Step 9: Dispatch Security Telemetry to SOC (Tab: "SOC")
1. Select a normalized signal type (e.g., `SCREEN_CAPTURE_SIGNAL`, `CAMERA_ACTIVITY`, `SCREEN_VISIBILITY_CHANGE`).
2. Tap **Dispatch Signal to SOC API**.
3. Verifies non-punitive warning notice delivery to the operator.
4. High-severity signals automatically correlate with the Unified SOC Incident Manager.

---

## 4. Platform Capabilities & Architectural Truth

To maintain strict technical accuracy and transparency:

| Security Capability | Implementation Approach | Platform Boundary / Reality |
| :--- | :--- | :--- |
| **QR Code Admission** | HMAC-SHA256 signed `QRTK` tokens with atomic state transition | Prevents duplicate admissions, expired tickets, and counterfeit passes. |
| **Forensic Traceability** | Dynamic session watermarking rotated on periodic epoch slots | Links illicit recordings back to the exact venue, screen, and seat number. |
| **Security Telemetry** | Standards-compliant W3C event listeners (`visibilitychange`, focus loss) | Relies on browser-supported signals; non-punitive advisory warnings. |
| **Hardware Control** | **Not Claimed** | **Browser JavaScript cannot forcibly disable a smartphone's hardware camera or detect external physical recording devices.** |

---

## 5. Troubleshooting & Insecure Context Handling

### Camera Inactive on Android Chrome over HTTP
* **Root Cause**: Modern Chromium browsers restrict `navigator.mediaDevices.getUserMedia` to Secure Contexts (`https://` or `localhost`).
* **Solution 1 (Recommended)**: Tap **Take Photo / Snap QR** in the scanner. This uses native Android file capture (`<input type="file" accept="image/*" capture="environment">`) which works over plain HTTP.
* **Solution 2 (Chrome Flag)**: In Chrome on Android, navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://<HOST_IP>:3000`, toggle to Enabled, and restart Chrome.
* **Solution 3 (HTTPS)**: Tunnel local dev servers via HTTPS (e.g., local SSL or reverse proxy).

### API Connection Offline on Phone
* Ensure host computer firewall allows incoming TCP traffic on ports `3000` (Web) and `4000` (API).
* Verify that host computer and phone are connected to the same Wi-Fi subnet without AP isolation.
* Use the **Diagnostics** tab to test API health or manually set the IP address.

---

## 6. Automated Integration Tests

Run the full Phase 31 test suite:
```bash
npm run test:mobile
```
Runs:
1. `src/test/mobileAppFoundationTest.ts` (Phase 21-22 foundation)
2. `src/test/mobileAntiPiracyProtectionTest.ts` (Phase 23 protection)
3. `src/test/mobileWatermarkForensicsTest.ts` (Phase 24 watermarks)
4. `src/test/mobileDeviceIntegrationTest.ts` (Phase 31 real device integration)
