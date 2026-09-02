# Threat Scoring Model & Explainable Mathematics

## 1. Scoring Objective
The Threat Intelligence Engine computes two deterministic metrics on a continuous scale of **0 to 100**:
1. **Risk Score ($R$)**: The calculated probability and impact of active piracy, unauthorized duplication, or credential compromise.
2. **Confidence Score ($C$)**: The reliability and statistical certainty of the underlying telemetry signals.

---

## 2. Risk Calculation Formula

Let $S = \{s_1, s_2, \dots, s_n\}$ be the set of active threat signals detected for a session or venue context.

Each signal $s_i$ carries:
* A predefined base risk weight $w_i \in [5, 65]$
* A confidence rating $c_i \in [50, 100]$

### Formula:
$$\text{Base Risk} = \sum_{i=1}^{n} w_i$$

### Compound Multiplier:
To account for compounding risk when multiple distinct anomalies occur simultaneously:
$$M(n) = 1 + (n - 1) \times 0.15 \quad (\text{for } n \ge 1)$$

$$\text{Raw Risk} = \min\left(100, \, \text{Round}\left(\text{Base Risk} \times M(n)\right)\right)$$

$$\text{Confidence Score} = \min\left(100, \, \text{Round}\left(\frac{1}{n} \sum_{i=1}^{n} c_i\right)\right)$$

---

## 3. Severity Tiers

| Score Range | Severity | Description | Default Response |
| :--- | :--- | :--- | :--- |
| **0 – 14** | `INFO` | Baseline telemetry, normal operation | None |
| **15 – 34** | `LOW` | Minor anomaly or single rate limit warning | Passive Monitoring |
| **35 – 59** | `MEDIUM` | Repeated failed access or rapid token polling | Rate Limit Source |
| **60 – 79** | `HIGH` | Session replay or token reuse across clients | Revoke Activation (SOC Approval) |
| **80 – 100** | `CRITICAL` | Confirmed watermark leak / concurrent session hijack | Immediate Session Termination |

---

## 4. Signal Weight Reference Table

| Pattern Type | Base Risk Weight | Default Confidence |
| :--- | :---: | :---: |
| `REPEATED_FAILED_ACCESS` | $20 - 45$ | $90\%$ |
| `SESSION_REPLAY` | $45 - 55$ | $95\%$ |
| `TOKEN_ABUSE` | $30 - 40$ | $85\%$ |
| `WATERMARK_CORRELATION` | $65$ | $95\%$ |
| `DRM_ABUSE` | $40$ | $85\%$ |
| `NETWORK_ANOMALY` | $25$ | $75\%$ |
