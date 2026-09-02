# SOC Metrics & Operational KPIs

## Overview

The Platform tracks real-time performance indicators to evaluate incident response efficiency, threat detection latency, and automated workflow health.

---

## Tracked Operational Metrics

1. **Mean Time to Acknowledge (MTTA)**:
   - Average duration between telemetry detection (`detectedAt`) and analyst triage (`acknowledgedAt`). Target SLA: $< 5$ minutes.

2. **Mean Time to Resolve (MTTR)**:
   - Average duration from incident detection to resolution (`resolvedAt`). Target SLA: $< 30$ minutes.

3. **Workflow Success Rate**:
   - Percentage of automated workflow executions completing without runtime exceptions.

4. **Threat Distribution by Venue**:
   - Aggregated incident counts mapped to individual exhibitor multiplexes to identify persistent vulnerabilities.

5. **Threat Distribution by Title**:
   - Content leak frequency tracked across active studio theatrical releases.

6. **Privileged Action Latency**:
   - Average time taken to achieve multi-signature approval on high-risk operations.
