# Peak Showtime Traffic Engineering & Burst Mitigation

## 1. Peak Showtime Traffic Patterns

Theatrical operations experience massive traffic spikes (10x–50x baseline) within the 15-minute window preceding prime-time screenings (e.g., 7:00 PM weekend showtimes):
1. **QR Admission Scan Influx**: Hundreds of audience members scanning permanent seat QR codes simultaneously.
2. **Staff Checkpoint Verifications**: High-velocity verification scans by cinema ushers.
3. **Playback Initialization Bursts**: Simultaneous projection terminal initialization and DRM license acquisitions.

---

## 2. Mitigation Strategies & Controlled Backpressure

* **Idempotency Fingerprinting**: Prevents duplicate activation or ticket creation when audience members frantically double-tap buttons.
* **Controlled Backpressure**: Non-critical dashboard analytics are throttled to prioritize staff admission verifications and DRM key delivery.
* **Peak Burst Limiter**: In peak mode, `peakShowtimeLimiter` dynamically expands allowed throughput for verified IP ranges while strictly clamping unauthenticated endpoints.
