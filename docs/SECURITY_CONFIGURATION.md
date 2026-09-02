# Production Security Configuration & Hardening Guide

## 1. Security Overview & Defense-in-Depth

The Theatre Anti-Piracy Platform implements a multi-layered security architecture designed to prevent unauthorized screening captures, credential harvesting, brute-force attacks, and data leakage.

---

## 2. Cryptographic Secret Management

### Zero-Hardcoding Rule
* Cryptographic secrets (JWT signing keys, DRM API secrets, database passwords) must NEVER be committed to source control or hard-coded in codebases.
* Secrets are injected solely via environment variables or cloud key vaults (AWS Secrets Manager, HashiCorp Vault).

### Key Entropy Standards
* **JWT_SECRET**: Must be a high-entropy string generated with at least 256 bits of randomness (minimum 32 characters).
  ```bash
  openssl rand -base64 48
  ```
* In `production` and `staging`, the API enforces a fail-fast startup validator that rejects weak or default placeholder secrets.

---

## 3. Strict Production CORS Policy

* **No Wildcards**: Authenticated production APIs strictly prohibit wildcard `*` origins.
* **Explicit Allowlist**: `CORS_ORIGIN` must be configured with exact domain names (e.g. `https://theatre-security.com,https://admin.theatre-security.com`).
* **Credentials & Preflight**: Preflight responses cache allowed origins for 24 hours (`maxAge: 86400`) and enforce strict method/header allowlists.

---

## 4. Rate Limiting & Abuse Prevention

Rate limits are evaluated per client identity utilizing reverse-proxy aware IP resolution (`getClientIp`):

| Endpoint Label | Window | Max Requests | Trigger Consequence |
| :--- | :--- | :--- | :--- |
| **Global API** (`/api`) | 1 Minute | 300 requests | HTTP 429 + Audit Log |
| **Authentication** (`/api/auth/login`) | 5 Minutes | 10 requests | HTTP 429 + HIGH Severity Audit Log |
| **QR Activation** (`/api/activations/activate`) | 5 Minutes | 25 requests | HTTP 429 + Audit Log |
| **Staff Verification** (`/api/verifications/verify`) | 1 Minute | 80 requests | HTTP 429 + Checkpoint Alert |
| **Playback Auth** (`/api/playback/authorize`) | 5 Minutes | 30 requests | HTTP 429 + Threat Score Bump |
| **DRM Licensing** (`/api/drm/license`) | 5 Minutes | 40 requests | HTTP 429 + Threat Score Bump |

---

## 5. Reverse Proxy & Header Hardening

* **Trust Proxy**: When deploying behind an Application Load Balancer or Cloudflare, set `TRUST_PROXY=true` (or configure specific subnet CIDRs).
* **HTTP Parameter Pollution**: Duplicate query parameters are normalized to eliminate auth bypass vectors.
* **Request Timeouts**: Long-hanging requests time out automatically after 30 seconds (`REQUEST_TIMEOUT_MS=30000`).
* **Helmet Security Headers**:
  - HSTS with subdomains and preload (`maxAge: 31536000`)
  - Strict Content-Security-Policy (CSP)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
