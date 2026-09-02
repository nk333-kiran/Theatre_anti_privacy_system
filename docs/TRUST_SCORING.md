# Zero-Trust Scoring Engine Specification

## 1. Mathematical Scoring Formula

The Trust Scoring Engine (`trustScoringEngine.ts`) produces a deterministic integer score $S \in [0, 100]$:

$$S = \max\left(0, \min\left(100, S_{\text{identity}} + A_{\text{tenant}} + A_{\text{session}} + A_{\text{device}} - P_{\text{threats}} - P_{\text{intel}} + A_{\text{posture}} - D_{\text{privileged}} + B_{\text{breakglass}}\right)\right)$$

---

## 2. Factor Breakdown & Weightings

| Component | Condition / Value | Score Adjustment |
| :--- | :--- | :--- |
| **Base Identity ($S_{\text{identity}}$)** | Authenticated Administrator<br>Verified Staff<br>Anonymous | $+50$<br>$+45$<br>$0$ |
| **Tenant Scope ($A_{\text{tenant}}$)** | Valid matching tenant scope<br>Tenant boundary mismatch | $+10$<br>$-30$ |
| **Session Age ($A_{\text{session}}$)** | Session $\le 60\text{ mins}$<br>Session $> 480\text{ mins}$ (8 hours) | $+5$<br>$-2\text{ per extra hour (max }-20\text{)}$ |
| **Device Trust ($A_{\text{device}}$)** | `TRUSTED`<br>`UNKNOWN`<br>`SUSPICIOUS`<br>`BLOCKED` | $+15$<br>$0$<br>$-25$<br>$-50$ |
| **Recent Incidents ($P_{\text{threats}}$)** | Security threat logs within 24h | $-10\text{ per incident (max }-30\text{)}$ |
| **Threat Intel Matches ($P_{\text{intel}}$)** | External IOC correlation hits | $-15\text{ per hit (max }-30\text{)}$ |
| **Threat Posture ($A_{\text{posture}}$)** | `CRITICAL`<br>`HIGH`<br>`ELEVATED`<br>`LOW` | $-20$<br>$-10$<br>$-5$<br>$+5$ |
| **Privileged Resource ($D_{\text{privileged}}$)** | High-impact action requested | $-10$ |
| **Break-Glass ($B_{\text{breakglass}}$)** | Active emergency session | $+15$ |

---

## 3. Trust Classifications

- **`TRUSTED`** ($80 \le S \le 100$): Optimal trust, routine access granted.
- **`STANDARD`** ($60 \le S \le 79$): Standard operating posture.
- **`GUARDED`** ($40 \le S \le 59$): Heightened monitoring; step-up verification for sensitive assets.
- **`HIGH_RISK`** ($20 \le S \le 39$): Elevated risk; administrative actions restricted.
- **`UNTRUSTED`** ($0 \le S \le 19$): Immediate access denial.
