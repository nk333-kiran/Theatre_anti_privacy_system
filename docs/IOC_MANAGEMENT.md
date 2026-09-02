# Indicators of Compromise (IOC) Normalization & Scoring

## 1. Indicator Canonical Normalization Standards

To prevent duplicate records caused by differing formatting, URLs, trailing slashes, CIDR masks, or uppercase casing, all ingested indicators undergo strict canonical normalization via `IndicatorNormalizationService`.

| Type | Raw Input Example | Normalized Canonical Value | Standard Applied |
| :--- | :--- | :--- | :--- |
| `IP_ADDRESS` | `198.51.100.22:8080` / `198.51.100.22/32` | `198.51.100.22` | Port & CIDR mask stripped; valid IPv4/IPv6 regex. |
| `DOMAIN` | `HTTP://WWW.PirateBay-Feed.ORG/` | `piratebay-feed.org` | Protocol & trailing slash removed; lowercased; RFC 1035 format. |
| `URL` | `HTTP://Site.com:80/stream/` | `http://site.com/stream/` | Default ports stripped; lowercase domain; path preserved. |
| `FILE_HASH` | `E3B0C44298FC1C149AFBF4C8...` | `e3b0c44298fc1c149afbf4c8...` | Lowercase hex verification for MD5 (32), SHA-1 (40), SHA-256 (64). |
| `EMAIL` | `Leaker@SYNDICATE.Org` | `leaker@syndicate.org` | Trimmed and lowercased; standard RFC 5322 regex. |
| `DEVICE_FINGERPRINT` | `FP-983A-BC71` | `FP-983A-BC71` | Trimmed and canonicalized identifier string. |

---

## 2. Deterministic Confidence Scoring Engine

Confidence scores (0–100) are deterministic and audit-reproducible. They are calculated using the following mathematical model:

$$\text{Confidence Score} = \text{Clamp}_{0}^{100}\left(0.6 \cdot W_{\text{source}} + 7 \cdot (N_{\text{sources}} - 1) - 0.5 \cdot \max(0, \text{Age}_{\text{days}} - 30) + 5 \cdot M_{\text{telemetry}} + A_{\text{analyst}}\right)$$

### Factor Breakdown:
1. **Base Source Trust ($0.6 \times W_{\text{source}}$)**: Initial confidence based on provider trust level (0–100).
2. **Multi-Source Corroboration ($+7$ per additional source)**: Up to $+28$ bonus when corroborated across multiple independent intelligence providers.
3. **Age Decay Penalty ($-0.5$ per day beyond 30 days)**: Old indicators without recent observations gradually decay in confidence.
4. **Internal Telemetry Boost ($+5$ per match)**: Up to $+20$ boost when the IOC is observed interacting with internal screening infrastructure.
5. **Analyst Validation Bonus ($+15$)**: Direct confirmation by an authorized security analyst.
6. **False Positive Override ($0$)**: Immediate drop to 0 score and `UNTRUSTED` level if flagged as a false positive.

### Confidence Tier Classification:
- **`VERY_HIGH` (80–100)**: Multiple corroborated sources or analyst-verified high-trust feed.
- **`HIGH` (60–79)**: Trusted commercial feed with recent sightings.
- **`MODERATE` (40–59)**: Open-source or uncorroborated single-source signal.
- **`LOW` (20–39)**: Aging indicator or low-trust feed.
- **`UNTRUSTED` (0–19)**: Stale, unverified, or false-positive indicator.
