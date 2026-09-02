# Production Database Operations & Safety

## 1. Connection Pool & Timeout Policy

| Parameter | Production Value | Purpose |
| :--- | :--- | :--- |
| `connectionLimit` | 20 | Concurrency allocation across API instances |
| `connectTimeoutMs` | 5,000ms | Fail fast if database cluster is unreachable |
| `idleTimeoutMs` | 10,000ms | Terminate orphaned client connections |
| `queryTimeoutMs` | 15,000ms | Prevent runaway blocking analytical queries |
| `maxRetries` | 3 | Exponential backoff for transient deadlock/network glitches |

## 2. Pre-Migration Safety Gates

Before applying any migration in staging or production:
1. **Backup Verification**: A fresh snapshot must be taken and verified.
2. **Checksum Validation**: SHA-256 integrity hash of backup archive verified.
3. **Cluster Health**: Database connectivity & replication lag within thresholds.
4. **Rollback Plan**: Rollback SQL script pre-tested.
5. **Operator Authorization**: Correlation ID and operator ID logged in audit trail.
