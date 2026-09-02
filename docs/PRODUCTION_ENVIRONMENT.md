# Production Environment Configuration

## 1. Environment Variable Reference

| Variable | Type | Category | Required in Prod | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | Core | Yes | Set to `production` |
| `PORT` | Number | Core | Yes | HTTP listening port (default `4000`) |
| `DATABASE_URL` | String | Database | Yes | PostgreSQL connection string |
| `JWT_SECRET` | String | Security | Yes | Minimum 32-char cryptographically random secret |
| `JWT_EXPIRES_IN` | String | Security | Yes | Token validity duration (default `24h`) |
| `CORS_ORIGIN` | String | Security | Yes | Comma-separated list of allowed origins (no wildcard `*`) |
| `STORAGE_BASE_DIR`| String | Storage | Yes | Private filesystem path for evidence vault |
| `BACKUP_STORAGE_DIR`| String | Storage | Yes | Path for AES-256 encrypted backups |
| `TRUST_PROXY` | String/Bool| Network | Yes | Reverse proxy hops / IP trust configuration |
| `REQUEST_TIMEOUT_MS`| Number| Reliability| Yes | Maximum duration per request (30,000ms) |
| `DRAIN_TIMEOUT_MS`| Number | Reliability| Yes | Graceful shutdown drain timeout (10,000ms) |

## 2. Safe Startup Guarantees

Startup validation checks all required variables. If any variable is missing or insecure, the server fails fast with a clear error message that never reveals secret values.
