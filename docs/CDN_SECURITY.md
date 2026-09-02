# CDN Edge Security & Playback Token Authorization

## 1. Signed URL Security Model

The CDN edge gate enforces strict HMAC-SHA256 URL signing for all media playlist (`.m3u8`) and video chunk (`.ts`, `.m4s`) requests.

$$\text{Signature} = \text{HMAC-SHA256}_{\text{SigningSecret}}\Big(\text{Path} \parallel \text{SessionId} \parallel \text{ClientIP} \parallel \text{ExpiresAt}\Big)$$

---

## 2. Playback Authorization Hierarchy

Direct media file access is strictly blocked. A valid theatre ticket alone does **NOT** grant CDN access. Access follows the mandatory chain:

```text
Ticket
  ↓
Activation
  ↓
Security Staff Checkpoint Verification
  ↓
Playback Session Creation
  ↓
DRM License Issuance
  ↓
CDN Signed URL Token Generation
  ↓
Encrypted Media Delivery
```

---

## 3. Edge Revocation Enforcement

When a session is revoked (via SOC Command Center or automated threat response), the session token is blacklisted, immediately invalidating all subsequent CDN media chunk requests.
