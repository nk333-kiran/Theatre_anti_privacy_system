# Production Disaster Recovery & Business Continuity Plan

## 1. Operational RPO & RTO Targets

| Target Metric | Configurable Operational Baseline | Description |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | &le; 15 minutes (with WAL shipping) | Maximum data loss window in the event of primary database outage. |
| **Recovery Time Objective (RTO)** | &le; 30 minutes | Target time to restore operational playback services. |

---

## 2. Recovery Procedures

### Scenario A: Primary PostgreSQL Cluster Outage
1. Initiate failover to the standby read-replica cluster.
2. Update `DATABASE_URL` connection strings in environment configuration.
3. Restart API and Web container services.
4. Verify `/health/ready` probe.

### Scenario B: Cloud Object Storage Corruption
1. Activate cross-region S3 disaster recovery bucket replication.
2. Update `STORAGE_BUCKET` to point to the secondary region.
3. Run asset verification test suite.
