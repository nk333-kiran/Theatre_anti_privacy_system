import { Response } from "express";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { disasterRecoveryService } from "../services/recovery/disasterRecoveryService";
import { backupVerificationService } from "../services/recovery/backupVerificationService";

export class RecoveryController {
  public static async getStatus(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const status = await disasterRecoveryService.getRecoveryStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || "Failed to retrieve disaster recovery status",
        errorCode: "RECOVERY_STATUS_ERROR",
      });
    }
  }

  public static async listBackups(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const backups = await backupVerificationService.listBackups();
      res.json({
        success: true,
        data: backups,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || "Failed to list backups",
        errorCode: "BACKUP_LIST_ERROR",
      });
    }
  }

  public static async verifyBackup(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-VERIFY-${Date.now()}`;
      const result = await backupVerificationService.verifyBackup(id, req.user as any, correlationId);
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || "Failed to verify backup",
        errorCode: "BACKUP_VERIFY_ERROR",
      });
    }
  }

  public static async verifyEvidenceIntegrity(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-EVID-INT-${Date.now()}`;
      const report = await disasterRecoveryService.verifyEvidenceVaultIntegrity(req.user as any, correlationId);
      res.json({
        success: true,
        data: report,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || "Failed to verify Evidence Vault integrity",
        errorCode: "EVIDENCE_INTEGRITY_ERROR",
      });
    }
  }

  public static async requestRecovery(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
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

      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-REC-REQ-${Date.now()}`;
      const op = await disasterRecoveryService.requestRecovery(
        { backupId, targetEnvironment, reason },
        (req.user as any) || { id: "unknown", email: "system@theatre.com", role: "ADMIN" },
        correlationId
      );

      res.status(201).json({
        success: true,
        data: op,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || "Failed to submit recovery request",
        errorCode: "RECOVERY_REQUEST_ERROR",
      });
    }
  }

  public static async approveRecovery(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const { approvalNotes } = req.body;
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-REC-APP-${Date.now()}`;

      const op = await disasterRecoveryService.approveRecovery(
        id,
        approvalNotes || "Approved by security administrator",
        (req.user as any) || { id: "unknown", email: "system@theatre.com", role: "ADMIN" },
        correlationId
      );

      res.json({
        success: true,
        data: op,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || "Failed to approve recovery",
        errorCode: "RECOVERY_APPROVAL_ERROR",
      });
    }
  }

  public static async validateRecovery(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-REC-VAL-${Date.now()}`;
      const op = await disasterRecoveryService.validateRecovery(id, (req.user as any) || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
      res.json({
        success: true,
        data: op,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || "Failed to validate recovery",
        errorCode: "RECOVERY_VALIDATE_ERROR",
      });
    }
  }

  public static async executeRecovery(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-REC-EXEC-${Date.now()}`;
      const op = await disasterRecoveryService.executeRecovery(id, (req.user as any) || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
      res.json({
        success: true,
        data: op,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || "Failed to execute recovery",
        errorCode: "RECOVERY_EXEC_ERROR",
      });
    }
  }

  public static async rollbackRecovery(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { id } = req.params;
      const correlationId = (req.headers["x-correlation-id"] as string) || `CORR-ROLLBACK-${Date.now()}`;
      const op = await disasterRecoveryService.executeRollback(id, (req.user as any) || { id: "unknown", email: "system@theatre.com", role: "ADMIN" }, correlationId);
      res.json({
        success: true,
        data: op,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || "Failed to rollback recovery",
        errorCode: "ROLLBACK_ERROR",
      });
    }
  }

  public static async getAuditTrail(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const logs = await disasterRecoveryService.getRecoveryAuditTrail(50);
      res.json({
        success: true,
        data: logs,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch recovery audit trail",
        errorCode: "AUDIT_TRAIL_ERROR",
      });
    }
  }
}
