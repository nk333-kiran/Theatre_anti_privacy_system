# High Availability Architecture & Zero-Downtime Design

## 1. High Availability Principles

* **Stateless API Ingress**: API container instances are completely stateless. All session state, blacklists, idempotency locks, and sliding-window rate limit counters reside in PostgreSQL and Redis.
* **Redundant API Replicas**: Minimum of 2–4 API replicas running behind an Nginx / Cloud Load Balancer with active round-robin and least-connection routing.
* **Health Probes**: Liveness (`/health/live`) and readiness (`/health/ready`) probes ensure that malfunctioning containers are immediately severed from load balancing without dropping in-flight requests.
* **Graceful Drain**: SIGTERM triggers a 15-second connection drain, allowing active HTTP transactions and playback token verifications to conclude safely.
