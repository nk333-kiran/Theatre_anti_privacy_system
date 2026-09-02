# Production Capacity Planning & Sizing Guidelines

## 1. Workload Sizing Models

| Scale Tier | Theatres / Screens | Simultaneous Playbacks | Sizing Recommendation |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Regional)** | 10 Theatres (50 Screens) | 50 Active Streams | 2 API Instances (2 vCPU, 4GB RAM), PostgreSQL (4 vCPU, 16GB RAM) |
| **Tier 2 (National)** | 100 Theatres (600 Screens) | 600 Active Streams | 6 API Instances (4 vCPU, 8GB RAM), PostgreSQL Multi-AZ (8 vCPU, 32GB RAM), Redis Cluster |
| **Tier 3 (Global / Studio)** | 500+ Theatres (3,000+ Screens) | 3,000+ Active Streams | 16+ Auto-scaling API Pods, PostgreSQL Primary + 3 Read Replicas, Multi-Region CDN |

---

## 2. Resource Utilization Limits

* **Max Memory Footprint**: 512MB baseline per API node, scaling to 1.5GB under heavy forensic watermarking loads.
* **Database Connections**: 50 pooled connections per node with aggressive 15-second idle timeout.
