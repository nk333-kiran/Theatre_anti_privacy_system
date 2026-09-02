import { prisma } from "@antipiracy/database";
import { backupVerificationService } from "../recovery/backupVerificationService";
import { disasterRecoveryService } from "../recovery/disasterRecoveryService";
import { SecurityAuditService } from "../security/securityAuditService";
import { logger } from "../logging/logger";

export interface MigrationSafetyCheckResult {
  isSafeToMigrate: boolean;
  backupVerified: boolean;
  backupId?: string;
  backupChecksum?: string;
  databaseConnected: boolean;
  rollbackPlanReady: boolean;
  rollbackVersion: string;
  correlationId: string;
  checkedAt: string;
  blockers: string[];
}

export class MigrationSafetyService {
  /**
   * Evaluates all pre-migration safety gates before any schema migration can be performed
   */
  public async validatePreMigrationSafety(
    actor?: { id?: string; email?: string; role?: string },
    correlationId?: string
  ): Promise<MigrationSafetyCheckResult> {
    const corrId = correlationId || `CORR-MIG-SAFE-${Date.now()}`;
    const blockers: string[] = [];

    // 1. Database Connectivity Probe
    let databaseConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      blockers.push("Database is offline or unresponsive to ping queries");
    }

    // 2. Backup Availability & Checksum Verification
    let backupVerified = false;
    let backupId: string | undefined;
    let backupChecksum: string | undefined;

    try {
      const latestBackup = await backupVerificationService.getLatestVerifiedBackup();
      if (latestBackup && latestBackup.verificationStatus === "VERIFIED") {
        backupVerified = true;
        backupId = latestBackup.backupId;
        backupChecksum = latestBackup.checksum;
      } else {
        blockers.push("No verified, SHA-256 validated backup snapshot available for rollback");
      }
    } catch {
      blockers.push("Backup manifest catalog inaccessible");
    }

    // 3. Rollback Plan & Engine Readiness
    let rollbackPlanReady = false;
    const rollbackVersion = "0.9.8";
    try {
      const drStatus = await disasterRecoveryService.getRecoveryStatus();
      if (drStatus.rollback.status === "READY" && drStatus.rollback.migrationCompatible) {
        rollbackPlanReady = true;
      } else {
        blockers.push("Rollback plan is blocked or schema migrations are non-backward compatible");
      }
    } catch {
      blockers.push("Disaster recovery rollback status check failed");
    }

    const isSafeToMigrate = blockers.length === 0;

    const result: MigrationSafetyCheckResult = {
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
    await SecurityAuditService.logEvent({
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

export const migrationSafetyService = new MigrationSafetyService();
