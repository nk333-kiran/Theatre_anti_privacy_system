# Production Database Migration Runbook

## 1. Migration Principles

1. **Never use `prisma db push` in production.** Production schema modifications must strictly use version-controlled, auditable migrations (`prisma migrate deploy`).
2. **Pre-Migration Backup**: Always take an automated transactional snapshot before applying migrations.
3. **Zero-Downtime Schema Expansion**: Use backward-compatible column and table additions. Never drop or rename columns in an active deployment until all running API instances have been upgraded.

---

## 2. Step-by-Step Procedure

### Step 1: Pre-Migration Health Verification
```bash
# Verify database connection and replication status
npm run test:reliability --workspace=@antipiracy/api
```

### Step 2: Trigger Pre-Migration Backup Snapshot
```bash
# Capture full database snapshot
curl -X POST http://localhost:4000/api/operations/backups \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Pre-migration Phase 15 snapshot"}'
```

### Step 3: Apply Migration
```bash
# Apply pending Prisma migration scripts
npx prisma migrate deploy --schema=database/prisma/schema.prisma
```

### Step 4: Verify Migration Success
```bash
# Run preflight validation
npm run check:preflight --workspace=@antipiracy/api
```

### Step 5: Rollback Plan (If Failure Occurs)
If migration fails, execute restore from pre-migration backup snapshot:
```bash
# Trigger disaster recovery restore
curl -X POST http://localhost:4000/api/operations/disaster-recovery/restore-test \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN"
```
