"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseManagementService = exports.ReleaseManagementService = void 0;
const envValidator_1 = require("../../config/envValidator");
class ReleaseManagementService {
    static instance;
    currentStage = "PROMOTED";
    deploymentRecords = [];
    currentDeploymentId = `deploy-${Date.now().toString(36)}`;
    constructor() {
        this.recordInitialDeployment();
    }
    static getInstance() {
        if (!ReleaseManagementService.instance) {
            ReleaseManagementService.instance = new ReleaseManagementService();
        }
        return ReleaseManagementService.instance;
    }
    recordInitialDeployment() {
        this.deploymentRecords.push({
            deploymentId: this.currentDeploymentId,
            version: envValidator_1.env.APP_VERSION,
            actor: "system-bootstrap",
            timestamp: new Date().toISOString(),
            environment: envValidator_1.env.NODE_ENV,
            correlationId: `bootstrap-${Date.now()}`,
            migrationStatus: "APPLIED",
            healthStatus: "HEALTHY",
            stage: "PROMOTED",
        });
    }
    getVersionMetadata() {
        return {
            applicationVersion: envValidator_1.env.APP_VERSION,
            apiVersion: envValidator_1.env.APP_VERSION,
            webVersion: "1.0.0",
            androidVersion: "1.0.0 (build 1)",
            buildTimestamp: new Date().toISOString(),
            gitCommit: process.env.GIT_COMMIT || "git-prod-release-v1.0.0",
            environment: envValidator_1.env.NODE_ENV,
            deploymentId: this.currentDeploymentId,
        };
    }
    getStage() {
        return this.currentStage;
    }
    getDeploymentHistory() {
        return [...this.deploymentRecords];
    }
    createDeployment(params) {
        this.currentDeploymentId = `deploy-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const record = {
            deploymentId: this.currentDeploymentId,
            version: params.version,
            actor: params.actor,
            timestamp: new Date().toISOString(),
            environment: envValidator_1.env.NODE_ENV,
            correlationId: params.correlationId,
            migrationStatus: params.migrationStatus || "APPLIED",
            healthStatus: "HEALTHY",
            stage: "PREPARED",
        };
        this.currentStage = "PREPARED";
        this.deploymentRecords.unshift(record);
        return record;
    }
    evaluatePromotionGates(checks) {
        const blockers = [];
        if (!checks.healthChecksPass)
            blockers.push("Health checks failed");
        if (!checks.readinessPass)
            blockers.push("Readiness probes failed");
        if (!checks.smokeTestsPass)
            blockers.push("Production smoke tests failed");
        if (!checks.databaseMigrationSafe)
            blockers.push("Database migration safety gate unconfirmed");
        if (!checks.backupVerified)
            blockers.push("Backup integrity validation unconfirmed");
        if (!checks.evidenceIntegrityVerified)
            blockers.push("Forensic evidence vault integrity unconfirmed");
        if (!checks.tenantIsolationVerified)
            blockers.push("Tenant isolation boundary tests unconfirmed");
        if (!checks.rollbackAvailable)
            blockers.push("Rollback procedure not ready");
        const canPromote = blockers.length === 0;
        return {
            ...checks,
            canPromote,
            blockers,
        };
    }
    advanceStage(nextStage) {
        this.currentStage = nextStage;
        if (this.deploymentRecords.length > 0) {
            this.deploymentRecords[0].stage = nextStage;
        }
    }
}
exports.ReleaseManagementService = ReleaseManagementService;
exports.releaseManagementService = ReleaseManagementService.getInstance();
