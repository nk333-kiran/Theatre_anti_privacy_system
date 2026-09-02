# Cloud Deployment & Infrastructure Setup

## 1. Multi-Environment Staging Matrix

| Environment | Purpose | Database | Storage | DRM Provider |
| :--- | :--- | :--- | :--- | :--- |
| **DEVELOPMENT** | Local feature development & testing | Local PostgreSQL | Local filesystem (`/private_storage`) | Mock Provider |
| **STAGING** | End-to-end integration & pre-release testing | Managed Cloud PostgreSQL | S3 Staging Bucket | Widevine / FairPlay Test Servers |
| **PRODUCTION** | Live theatrical screening & studio distribution | Multi-AZ Clustered PostgreSQL | Private S3 Bucket (Replication) | Commercial DRM Key Servers |

---

## 2. Docker Deployment Commands

To deploy the production stack with health verification:

```bash
# 1. Verify preflight configuration
npm run check:preflight --workspace=@antipiracy/api

# 2. Deploy multi-container stack
docker-compose -f docker-compose.production.yml up -d --build

# 3. Check container status
docker-compose -f docker-compose.production.yml ps
```
