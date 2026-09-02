# Zero-Downtime Deployment & Rolling Upgrade Strategy

## 1. Deployment States

```text
BUILDING ──> MIGRATING ──> STARTING ──> HEALTH_CHECKING ──> READY ──> DRAINING ──> COMPLETED
                                              │
                                              ▼ (Probe failure)
                                         ROLLED_BACK ──> FAILED
```

---

## 2. Zero-Downtime Rolling Update Procedure

1. **New Pod Launch**: Kubernetes / Docker Swarm launches v2 container replicas alongside active v1 containers.
2. **Readiness Probe**: v2 container passes `/health/ready` check (database connectivity, storage, KMS verified).
3. **Traffic Shift**: Load balancer redirects ingress traffic to v2 container.
4. **Connection Drain**: v1 container receives SIGTERM, stops accepting new requests, drains active HTTP requests over 15 seconds, and terminates gracefully.
