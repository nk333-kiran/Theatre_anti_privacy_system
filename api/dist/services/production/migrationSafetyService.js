"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationSafetyService = exports.MigrationSafetyService = void 0;
const database_1 = require("@antipiracy/database");
const backupVerificationService_1 = require("../recovery/backupVerificationService");
const disasterRecoveryService_1 = require("../recovery/disasterRecoveryService");
const securityAuditService_1 = require("../security/securityAuditService");
class MigrationSafetyService {
    /**
     * Evaluates all pre-migration safety gates before any schema migration can be performed
     */
    async validatePreMigrationSafety(actor, correlationId) {
        const corrId = correlationId || `CORR-MIG-SAFE-${Date.now()}`;
        const blockers = [];
        // 1. Database Connectivity Probe
        let databaseConnected = false;
        try {
            await database_1.prisma.$queryRaw `SELECT 1`;
            databaseConnected = true;
        }
        catch {
            blockers.push("Database is offline or unresponsive to ping queries");
        }
        // 2. Backup Availability & Checksum Verification
        let backupVerified = false;
        let backupId;
        let backupChecksum;
        try {
            const latestBackup = await backupVerificationService_1.backupVerificationService.getLatestVerifiedBackup();
            if (latestBackup && latestBackup.verificationStatus === "VERIFIED") {
                backupVerified = true;
                backupId = latestBackup.backupId;
                backupChecksum = latestBackup.checksum;
            }
            else {
                blockers.push("No verified, SHA-256 validated backup snapshot available for rollback");
            }
        }
        catch {
            blockers.push("Backup manifest catalog inaccessible");
        }
        // 3. Rollback Plan & Engine Readiness
        let rollbackPlanReady = false;
        const rollbackVersion = "0.9.8";
        try {
            const drStatus = await disasterRecoveryService_1.disasterRecoveryService.getRecoveryStatus();
            if (drStatus.rollback.status === "READY" && drStatus.rollback.migrationCompatible) {
                rollbackPlanReady = true;
            }
            else {
                blockers.push("Rollback plan is blocked or schema migrations are non-backward compatible");
            }
        }
        catch {
            blockers.push("Disaster recovery rollback status check failed");
        }
        const isSafeToMigrate = blockers.length === 0;
        const result = {
            isSafeToMigrate,
            backupVerified,
            backupId,
            backupChecksum,
            databaseConnected,
            rollbackPlanReady,
            rollbackVersion,
            correlationId: corrId,
            checkedAt: new Date().toISOString(),
            blockers,
        };
        // Immutable Audit Entry
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: isSafeToMigrate ? "STAFF_VERIFICATION" : "SUSPICIOUS_ACTIVITY",
            severity: isSafeToMigrate ? "LOW" : "HIGH",
            userId: actor?.id,
            actorEmail: actor?.email,
            actorRole: actor?.role,
            actionSummary: `Pre-migration safety validation completed: ${isSafeToMigrate ? "SAFE_TO_MIGRATE" : "MIGRATION_BLOCKED"} [${corrId}]`,
            metadata: {
                readinessAction: "MIGRATION_SAFETY_CHECK",
                isSafeToMigrate,
                backupId,
                backupVerified,
                blockers,
                correlationId: corrId,
            },
        });
        return result;
    }
}
exports.MigrationSafetyService = MigrationSafetyService;
exports.migrationSafetyService = new MigrationSafetyService();
