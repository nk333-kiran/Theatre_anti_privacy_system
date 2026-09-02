# Deterministic Threat Scoring & Risk Modeling

## 1. Mathematical Scoring Formula

Risk scores are computed deterministically based on multi-signal indicators:

$$\text{Risk Score} = \min\left(100, \max\left(5, \sum_{i=1}^{n} w_i \cdot s_i\right)\right)$$

Where $w_i$ is the configured rule weight and $s_i$ is the signal count.

---

## 2. Signal Weights Table

| Telemetry Signal | Weight ($w_i$) | Maximum Contribution | Description |
| :--- | :--- | :--- | :--- |
| **Failed Checkpoint Verification** | +10 pts | 30 pts | Denied admission attempts at auditorium checkpoint. |
| **Failed QR Activation** | +10 pts | 30 pts | Invalid or expired QR activation requests. |
| **Token Replay Attempt** | +30 pts | 60 pts | Concurrent use of the same playback token on multiple devices. |
| **DRM License Denial Burst** | +20 pts | 40 pts | Hardware DRM licensing rejections. |
| **Screen Capture Attempt** | +15 pts | 45 pts | Sandbox detection of screenshot or screen-recording tools. |
| **Revoked Token Re-use** | +30 pts | 60 pts | Requests using blacklisted or revoked JWT credentials. |
| **Abnormal Concurrency** | +25 pts | 50 pts | Multiple streams initialized for a single admission ticket. |

---

## 3. Score-to-Severity Mapping

* **0 – 24**: `LOW` &bull; Standard continuous monitoring.
* **25 – 49**: `MEDIUM` &bull; Increased watermark density.
* **50 – 74**: `HIGH` &bull; DRM license revocation and staff reverification.
* **75 – 100**: `CRITICAL` &bull; Instant playback termination.
