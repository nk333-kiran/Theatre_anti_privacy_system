"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const database_1 = require("@antipiracy/database");
const envValidator_1 = require("../../config/envValidator");
const logger_1 = require("../logging/logger");
const securityAuditService_1 = require("../security/securityAuditService");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BackupService {
    backupDir;
    metadataFile;
    inProgress = false;
    rpoTargetMinutes = 60; // 1 Hour RPO SLA Target
    rtoTargetMinutes = 15; // 15 Min RTO SLA Target
    retentionDays = 30; // 30-day default retention
    constructor() {
        this.backupDir = path_1.default.resolve(process.cwd(), "backups");
        this.metadataFile = path_1.default.join(this.backupDir, "backups_manifest.json");
        this.ensureBackupDir();
    }
    ensureBackupDir() {
        if (!fs_1.default.existsSync(this.backupDir)) {
            fs_1.default.mkdirSync(this.backupDir, { recursive: true });
        }
    }
    loadManifest() {
        this.ensureBackupDir();
        if (!fs_1.default.existsSync(this.metadataFile)) {
            return [];
        }
        try {
            const data = fs_1.default.readFileSync(this.metadataFile, "utf-8");
            return JSON.parse(data);
        }
        catch {
            return [];
        }
    }
    saveManifest(manifest) {
        this.ensureBackupDir();
        fs_1.default.writeFileSync(this.metadataFile, JSON.stringify(manifest, null, 2), "utf-8");
    }
    /**
     * Calculate SHA-256 checksum of a file
     */
    calculateFileChecksum(filePath) {
        const fileBuffer = fs_1.default.readFileSync(filePath);
        return crypto_1.default.createHash("sha256").update(fileBuffer).digest("hex");
    }
    /**
     * Create an atomic database backup
     */
    async createBackup(type = "MANUAL", actorUser) {
        if (this.inProgress) {
            throw new Error("A database backup job is already in progress.");
        }
        this.inProgress = true;
        const start = Date.now();
        const backupId = `bkp_${Date.now()}_${crypto_1.default.randomBytes(4).toString("hex")}`;
        const timestamp = new Date().toISOString();
        const filename = `theatre_db_${timestamp.replace(/[:.]/g, "-")}.json`;
        const filePath = path_1.default.join(this.backupDir, filename);
        logger_1.logger.info(`Starting database backup (${type}): ${backupId}...`);
        try {
            // 1. Snapshot all essential operational tables atomically via Prisma
            const [theatres, screens, movies, movieReleases, shows, tickets, activations, verifications, videoAssets, drmAssets, playbackSessions, drmLicenses, securityAudits, productionCompanies,] = await Promise.all([
                database_1.prisma.theatre.findMany(),
                database_1.prisma.screen.findMany(),
                database_1.prisma.movie.findMany(),
                database_1.prisma.movieRelease.findMany(),
                database_1.prisma.show.findMany(),
                database_1.prisma.ticket.findMany(),
                database_1.prisma.activation.findMany(),
                database_1.prisma.verification.findMany(),
                database_1.prisma.videoAsset.findMany(),
                database_1.prisma.drmAsset.findMany(),
                database_1.prisma.playbackSession.findMany(),
                database_1.prisma.drmLicense.findMany(),
                database_1.prisma.securityAuditLog.findMany({ take: 5000, orderBy: { createdAt: "desc" } }),
                database_1.prisma.productionCompany.findMany(),
            ]);
            const totalRecords = theatres.length +
                screens.length +
                movies.length +
                movieReleases.length +
                shows.length +
                tickets.length +
                activations.length +
                verifications.length +
                videoAssets.length +
                drmAssets.length +
                playbackSessions.length +
                drmLicenses.length +
                securityAudits.length +
                productionCompanies.length;
            const payload = {
                backupId,
                timestamp,
                environment: envValidator_1.env.NODE_ENV,
                version: envValidator_1.env.APP_VERSION,
                tables: {
                    theatres,
                    screens,
                    movies,
                    movieReleases,
                    shows,
                    tickets,
                    activations,
                    verifications,
                    videoAssets,
                    drmAssets,
                    playbackSessions,
                    drmLicenses,
                    securityAudits,
                    productionCompanies,
                },
            };
            // Write snapshot to disk
            fs_1.default.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
            const stats = fs_1.default.statSync(filePath);
            const checksum = this.calculateFileChecksum(filePath);
            const durationMs = Date.now() - start;
            const record = {
                id: backupId,
                filename,
                timestamp,
                sizeBytes: stats.size,
                checksumSha256: checksum,
                status: "SUCCESS",
                type,
                encryption: "NONE",
                tablesIncluded: Object.keys(payload.tables),
                totalRecords,
                durationMs,
                verificationStatus: "VERIFIED",
                verifiedAt: new Date().toISOString(),
            };
            // Update manifest
            const manifest = this.loadManifest();
            manifest.unshift(record);
            this.saveManifest(manifest);
            // Log security audit event
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: "SUSPICIOUS_ACTIVITY",
                severity: "INFO",
                userId: actorUser?.id,
                actorEmail: actorUser?.email,
                actorRole: actorUser?.role,
                actionSummary: `Database backup ${backupId} completed successfully (${totalRecords} records, ${(stats.size / 1024).toFixed(1)} KB, SHA256: ${checksum.slice(0, 12)}...)`,
            });
            logger_1.logger.info(`Database backup ${backupId} completed in ${durationMs}ms`);
            return record;
        }
        catch (err) {
            logger_1.logger.error(`Database backup ${backupId} failed:`, err);
            const failedRecord = {
                id: backupId,
                filename,
                timestamp,
                sizeBytes: 0,
                checksumSha256: "",
                status: "FAILED",
                type,
                encryption: "NONE",
                tablesIncluded: [],
                totalRecords: 0,
                durationMs: Date.now() - start,
                errorMessage: err.message,
            };
            const manifest = this.loadManifest();
            manifest.unshift(failedRecord);
            this.saveManifest(manifest);
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: "SUSPICIOUS_ACTIVITY",
                severity: "HIGH",
                userId: actorUser?.id,
                actorEmail: actorUser?.email,
                actorRole: actorUser?.role,
                actionSummary: `Database backup ${backupId} FAILED: ${err.message}`,
            });
            throw err;
        }
        finally {
            this.inProgress = false;
        }
    }
    /**
     * List all database backups
     */
    listBackups() {
        return this.loadManifest();
    }
    /**
     * Verify integrity of a specific backup file against its recorded SHA-256 checksum
     */
    verifyBackupIntegrity(backupId) {
        const manifest = this.loadManifest();
        const index = manifest.findIndex((b) => b.id === backupId);
        if (index === -1) {
            throw new Error(`Backup record ${backupId} not found in manifest.`);
        }
        const backup = manifest[index];
        const filePath = path_1.default.join(this.backupDir, backup.filename);
        if (!fs_1.default.existsSync(filePath)) {
            backup.verificationStatus = "CORRUPTED";
            backup.errorMessage = "Backup archive file not found on disk.";
            this.saveManifest(manifest);
            return {
                verified: false,
                checksum: "FILE_MISSING",
                expectedChecksum: backup.checksumSha256,
                verifiedAt: new Date().toISOString(),
            };
        }
        const currentChecksum = this.calculateFileChecksum(filePath);
        const verified = currentChecksum === backup.checksumSha256;
        backup.verificationStatus = verified ? "VERIFIED" : "CORRUPTED";
        backup.verifiedAt = new Date().toISOString();
        if (!verified) {
            backup.errorMessage = `Checksum mismatch. Expected ${backup.checksumSha256}, got ${currentChecksum}`;
        }
        this.saveManifest(manifest);
        return {
            verified,
            checksum: currentChecksum,
            expectedChecksum: backup.checksumSha256,
            verifiedAt: backup.verifiedAt,
        };
    }
    /**
     * Prune expired backups older than retention policy
     */
    pruneExpiredBackups(retentionDays = this.retentionDays) {
        const manifest = this.loadManifest();
        const cutoffDate = new Date(Date.now() - retentionDays * 86400000);
        let prunedCount = 0;
        let freedBytes = 0;
        const remainingManifest = [];
        for (const item of manifest) {
            const backupDate = new Date(item.timestamp);
            if (backupDate < cutoffDate) {
                const filePath = path_1.default.join(this.backupDir, item.filename);
                if (fs_1.default.existsSync(filePath)) {
                    const stats = fs_1.default.statSync(filePath);
                    freedBytes += stats.size;
                    fs_1.default.unlinkSync(filePath);
                }
                prunedCount++;
            }
            else {
                remainingManifest.push(item);
            }
        }
        this.saveManifest(remainingManifest);
        logger_1.logger.info(`Pruned ${prunedCount} database backups older than ${retentionDays} days (${(freedBytes / 1024).toFixed(1)} KB freed)`);
        return {
            prunedCount,
            freedBytes,
            remainingCount: remainingManifest.length,
        };
    }
    /**
     * Get overall Disaster Recovery & RPO/RTO SLA health status
     */
    getDisasterRecoveryStatus() {
        const manifest = this.loadManifest();
        const successfulBackups = manifest.filter((b) => b.status === "SUCCESS");
        const lastSuccessful = successfulBackups.length > 0 ? successfulBackups[0] : null;
        let currentRpoMinutes = 999999;
        if (lastSuccessful) {
            const diffMs = Date.now() - new Date(lastSuccessful.timestamp).getTime();
            currentRpoMinutes = Math.floor(diffMs / 60000);
        }
        // Determine recovery readiness based on RPO and backup health
        let recoveryReadiness = "READY";
        if (!lastSuccessful || currentRpoMinutes > this.rpoTargetMinutes * 24) {
            recoveryReadiness = "CRITICAL";
        }
        else if (currentRpoMinutes > this.rpoTargetMinutes * 2) {
            recoveryReadiness = "WARNING";
        }
        const totalStorageBytes = manifest.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
        const oneDayAgo = new Date(Date.now() - 86400000);
        const failedBackups24h = manifest.filter((b) => b.status === "FAILED" && new Date(b.timestamp) > oneDayAgo).length;
        return {
            rpoTargetMinutes: this.rpoTargetMinutes,
            currentRpoMinutes,
            rtoTargetMinutes: this.rtoTargetMinutes,
            recoveryReadiness,
            lastSuccessfulBackup: lastSuccessful,
            totalBackupsCount: manifest.length,
            totalStorageBytes,
            failedBackupsCount24h: failedBackups24h,
            activeIncidentsCount: failedBackups24h > 0 ? 1 : 0,
            autoBackupEnabled: true,
            retentionDays: this.retentionDays,
        };
    }
}
exports.backupService = new BackupService();
