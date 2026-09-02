import { env } from "../../config/envValidator";

export type ReleaseStage = "PREPARED" | "VALIDATING" | "CANARY" | "PROMOTED" | "ROLLED_BACK";

export interface VersionMetadata {
  applicationVersion: string;
  apiVersion: string;
  webVersion: string;
  androidVersion: string;
  buildTimestamp: string;
  gitCommit: string;
  environment: string;
  deploymentId: string;
}

export interface DeploymentRecord {
  deploymentId: string;
  version: string;
  actor: string;
  timestamp: string;
  environment: string;
  correlationId: string;
  migrationStatus: "APPLIED" | "PENDING" | "NOT_REQUIRED";
  healthStatus: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  stage: ReleaseStage;
}

export interface ReleasePrePromotionCheck {
  healthChecksPass: boolean;
  readinessPass: boolean;
  smokeTestsPass: boolean;
  databaseMigrationSafe: boolean;
  backupVerified: boolean;
  evidenceIntegrityVerified: boolean;
  tenantIsolationVerified: boolean;
  rollbackAvailable: boolean;
  canPromote: boolean;
  blockers: string[];
}

export class ReleaseManagementService {
  private static instance: ReleaseManagementService;
  private currentStage: ReleaseStage = "PROMOTED";
  private deploymentRecords: DeploymentRecord[] = [];
  private currentDeploymentId = `deploy-${Date.now().toString(36)}`;

  private constructor() {
    this.recordInitialDeployment();
  }

  public static getInstance(): ReleaseManagementService {
    if (!ReleaseManagementService.instance) {
      ReleaseManagementService.instance = new ReleaseManagementService();
    }
    return ReleaseManagementService.instance;
  }

  private recordInitialDeployment(): void {
    this.deploymentRecords.push({
      deploymentId: this.currentDeploymentId,
      version: env.APP_VERSION,
      actor: "system-bootstrap",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      correlationId: `bootstrap-${Date.now()}`,
      migrationStatus: "APPLIED",
      healthStatus: "HEALTHY",
      stage: "PROMOTED",
    });
  }

  public getVersionMetadata(): VersionMetadata {
    return {
      applicationVersion: env.APP_VERSION,
      apiVersion: env.APP_VERSION,
      webVersion: "1.0.0",
      androidVersion: "1.0.0 (build 1)",
      buildTimestamp: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || "git-prod-release-v1.0.0",
      environment: env.NODE_ENV,
      deploymentId: this.currentDeploymentId,
    };
  }

  public getStage(): ReleaseStage {
    return this.currentStage;
  }

  public getDeploymentHistory(): DeploymentRecord[] {
    return [...this.deploymentRecords];
  }

  public createDeployment(params: {
    version: string;
    actor: string;
    correlationId: string;
    migrationStatus?: "APPLIED" | "PENDING" | "NOT_REQUIRED";
  }): DeploymentRecord {
    this.currentDeploymentId = `deploy-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const record: DeploymentRecord = {
      deploymentId: this.currentDeploymentId,
      version: params.version,
      actor: params.actor,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      correlationId: params.correlationId,
      migrationStatus: params.migrationStatus || "APPLIED",
      healthStatus: "HEALTHY",
      stage: "PREPARED",
    };
    this.currentStage = "PREPARED";
    this.deploymentRecords.unshift(record);
    return record;
  }

  public evaluatePromotionGates(checks: {
    healthChecksPass: boolean;
    readinessPass: boolean;
    smokeTestsPass: boolean;
    databaseMigrationSafe: boolean;
    backupVerified: boolean;
    evidenceIntegrityVerified: boolean;
    tenantIsolationVerified: boolean;
    rollbackAvailable: boolean;
  }): ReleasePrePromotionCheck {
    const blockers: string[] = [];

    if (!checks.healthChecksPass) blockers.push("Health checks failed");
    if (!checks.readinessPass) blockers.push("Readiness probes failed");
    if (!checks.smokeTestsPass) blockers.push("Production smoke tests failed");
    if (!checks.databaseMigrationSafe) blockers.push("Database migration safety gate unconfirmed");
    if (!checks.backupVerified) blockers.push("Backup integrity validation unconfirmed");
    if (!checks.evidenceIntegrityVerified) blockers.push("Forensic evidence vault integrity unconfirmed");
    if (!checks.tenantIsolationVerified) blockers.push("Tenant isolation boundary tests unconfirmed");
    if (!checks.rollbackAvailable) blockers.push("Rollback procedure not ready");

    const canPromote = blockers.length === 0;

    return {
      ...checks,
      canPromote,
      blockers,
    };
  }

  public advanceStage(nextStage: ReleaseStage): void {
    this.currentStage = nextStage;
    if (this.deploymentRecords.length > 0) {
      this.deploymentRecords[0].stage = nextStage;
    }
  }
}

export const releaseManagementService = ReleaseManagementService.getInstance();
