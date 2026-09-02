# Commercial DRM Provider Integration & Key Exchange

## 1. Multi-DRM Provider Matrix

```text
               ┌─────────────────────────────────────────────────┐
               │    Production Multi-DRM License Dispatcher     │
               └────────┬────────────────┬────────────────┬──────┘
                        │                │                │
                        ▼                ▼                ▼
                Google Widevine   Microsoft PlayReady  Apple FairPlay
                (edef8ba9...)     (9a04f079...)       (skd://)
```

| DRM System | Supported Clients | Container Format | Key Protocol |
| :--- | :--- | :--- | :--- |
| **Widevine Modular** | Chrome, Android, Chromium Projectors | CENC / DASH / HLS | PSSH Box / JSON License Challenge |
| **Microsoft PlayReady** | Edge, Windows, Xbox, Embedded STBs | CENC / DASH / HLS | WRMHEADER XML / SOAP Challenge |
| **Apple FairPlay Streaming**| Safari, iOS, macOS, tvOS | HLS (fMP4 / TS) | Server Playback Context (SPC/CKC) |

---

## 2. Commercial Vendor Provisioning Requirements

* **Google Widevine**: Requires a signed Google Widevine Certified Service Provider contract, CWIP accreditation, and Widevine License Server private credentials.
* **Microsoft PlayReady**: Requires a Microsoft PlayReady Server License Agreement and PlayReady Server Certificate.
* **Apple FairPlay**: Requires an Apple Developer Enterprise Program membership, FairPlay Streaming Server SDK deployment package, and FairPlay Private Key (`.p12` / `.pem`).

> [!IMPORTANT]
> Development and staging environments use the built-in mock and AES-128 envelope adapters. Mock DRM must never be represented as commercial hardware-grade DRM in production disclosures.
