"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryController = void 0;
const disasterRecoveryService_1 = require("../services/recovery/disasterRecoveryService");
const backupVerificationService_1 = require("../services/recovery/backupVerificationService");
class RecoveryController {
    static async getStatus(req, res) {
        try {
            const status = await disasterRecoveryService_1.disasterRecoveryService.getRecoveryStatus();
            res.json({
                success: true,
                data: status,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to retrieve disaster recovery status",
                errorCode: "RECOVERY_STATUS_ERROR",
            });
        }
    }
    static async listBackups(req, res) {
        try {
            const backups = await backupVerificationService_1.backupVerificationService.listBackups();
            res.json({
                success: true,
                data: backups,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to list backups",
                errorCode: "BACKUP_LIST_ERROR",
            });
        }
    }
    static async verifyBackup(req, res) {
        try {
            const { id } = req.params;
            const correlationId = req.headers["x-correlation-id"] || `CORR-VERIFY-${Date.now()}`;
            const result = await backupVerificationService_1.backupVerificationService.verifyBackup(id, req.user, correlationId);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message || "Failed to verify backup",
                errorCode: "BACKUP_VERIFY_ERROR",
            });
        }
    }
    static async verifyEvidenceIntegrity(req, res) {
        try {
            const correlationId = req.headers["x-correlation-id"] || `CORR-EVID-INT-${Date.now()}`;
            const report = await disasterRecoveryService_1.disasterRecoveryService.verifyEvidenceVaultIntegrity(req.user, correlationId);
            res.json({
                success: true,
                data: report,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to verify Evidence Vault integrity",
                errorCode: "EVIDENCE_INTEGRITY_ERROR",
            });
        }
    }
    static async requestRecovery(req, res) {
        try {
            const { backupId, targetEnvironment, reason } = req.body;
            if (!backupId || !reason) {
                res.status(400).json({
                    success: false,
                    message: "backupId and reason are required fields",
                    errorCode: "INVALID_REQUEST",
                });
                return;
            }
            const correlationId = req.headers["x-correlation-id"] || `CORR-REC-REQ-${Date.now()}`;
            const op = await disasterRecoveryService_1.disasterRecoveryService.requestRecovery({ backupId, targetEnvironment, reason }, req.user || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
            res.status(201).json({
                success: true,
                data: op,
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message || "Failed to submit recovery request",
                errorCode: "RECOVERY_REQUEST_ERROR",
            });
        }
    }
    static async approveRecovery(req, res) {
        try {
            const { id } = req.params;
            const { approvalNotes } = req.body;
            const correlationId = req.headers["x-correlation-id"] || `CORR-REC-APP-${Date.now()}`;
            const op = await disasterRecoveryService_1.disasterRecoveryService.approveRecovery(id, approvalNotes || "Approved by security administrator", req.user || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
            res.json({
                success: true,
                data: op,
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message || "Failed to approve recovery",
                errorCode: "RECOVERY_APPROVAL_ERROR",
            });
        }
    }
    static async validateRecovery(req, res) {
        try {
            const { id } = req.params;
            const correlationId = req.headers["x-correlation-id"] || `CORR-REC-VAL-${Date.now()}`;
            const op = await disasterRecoveryService_1.disasterRecoveryService.validateRecovery(id, req.user || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
            res.json({
                success: true,
                data: op,
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message || "Failed to validate recovery",
                errorCode: "RECOVERY_VALIDATE_ERROR",
            });
        }
    }
    static async executeRecovery(req, res) {
        try {
            const { id } = req.params;
            const correlationId = req.headers["x-correlation-id"] || `CORR-REC-EXEC-${Date.now()}`;
            const op = await disasterRecoveryService_1.disasterRecoveryService.executeRecovery(id, req.user || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
            res.json({
                success: true,
                data: op,
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message || "Failed to execute recovery",
                errorCode: "RECOVERY_EXEC_ERROR",
            });
        }
    }
    static async rollbackRecovery(req, res) {
        try {
            const { id } = req.params;
            const correlationId = req.headers["x-correlation-id"] || `CORR-ROLLBACK-${Date.now()}`;
            const op = await disasterRecoveryService_1.disasterRecoveryService.executeRollback(id, req.user || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
            res.json({
                success: true,
                data: op,
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: err.message || "Failed to rollback recovery",
                errorCode: "ROLLBACK_ERROR",
            });
        }
    }
    static async getAuditTrail(req, res) {
        try {
            const logs = await disasterRecoveryService_1.disasterRecoveryService.getRecoveryAuditTrail(50);
            res.json({
                success: true,
                data: logs,
            });
        }
        catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || "Failed to fetch recovery audit trail",
                errorCode: "AUDIT_TRAIL_ERROR",
            });
        }
    }
}
exports.RecoveryController = RecoveryController;
