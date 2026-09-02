# Production Deployment Runbook

## 1. Prerequisites & Validation Commands

Before promoting a deployment to production, run the pre-flight suites:

```bash
# 1. Audit Environment & Secrets
npm run validate:production-config

# 2. Verify Database Health & Pre-Migration Backups
npm run validate:migrations

# 3. Check Deployment Infrastructure Status
npm run validate:deployment

# 4. Execute 15-Point Production Smoke Tests
npm run smoke:production

# 5. Evaluate Canary Release Promotion Gates
npm run release:check
```

## 2. Docker Compose Deployment

```bash
# Build and run production containers
docker-compose -f docker-compose.production.yml up --build -d

# Check health of all services
docker-compose -f docker-compose.production.yml ps
```

## 3. Environment Types & Distinctions

- **LOCAL**: Local development environment with SQLite/PostgreSQL on localhost.
- **STAGING**: Staging mirror with pre-production data and simulated external integrations.
- **PRODUCTION**: Live operational cluster with strict TLS, isolated DB network, and high availability.
- **SIMULATED**: Automated test drills testing edge degradation scenarios.
- **VALIDATED IN TEST**: Automated test assertions passing under regression suites.
