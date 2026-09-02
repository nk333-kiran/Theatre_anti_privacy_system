# Incident Correlation & Clustering Guide

## 1. Incident Deduplication & Clustering
High-volume attacks or misconfigured clients frequently generate hundreds of individual log entries (e.g. 50 failed DRM licensing attempts, 20 stream token rejections).

The **Incident Clustering Service** (`incidentClusteringService.ts`) correlates these disjointed signals into **a single unified incident** based on:
1. **Show & Screening Context (`showId`)**: Multiple concurrent failures in the same screening are grouped under one incident.
2. **Playback Session (`playbackSessionId`)**: All DRM errors, playback heartbeats, and audit violations for a session bind to one investigation.
3. **Theatrical Venue (`theatreId`)**: Outages or coordinated breach attempts across auditorium screens within a theatre are clustered.

---

## 2. Incident Lifecycle State Machine

```text
 ┌─────────────┐       Signal Detected        ┌─────────────────┐
 │  (Initial)  ├─────────────────────────────►│    DETECTED     │
 └─────────────┘                              └────────┬────────┘
                                                       │
                                            Assigned / Investigated
                                                       │
                                                       ▼
 ┌─────────────┐       Action Executed        ┌─────────────────┐
 │  CONFIRMED  │◄─────────────────────────────┤  INVESTIGATING  │
 └──────┬──────┘                              └────────┬────────┘
        │                                              │
        │             Resolution / False Alarm         │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │    RESOLVED     │
                      └────────┬────────┘
                               │
                       New Signal Anomaly
                               │
                               ▼
                      ┌─────────────────┐
                      │  INVESTIGATING  │ (Reopened)
                      └─────────────────┘
```

---

## 3. Forensic Integration
Every `ThreatIntelligenceIncident` connects directly to the Phase 13 Forensic Watermark Investigation engine:
- If a leaked recording is decoded, the identified session immediately links to the active threat incident.
- SOC analysts can transition from the Threat Intelligence Center directly into the Forensic Investigation Center with pre-populated evidence parameters.
