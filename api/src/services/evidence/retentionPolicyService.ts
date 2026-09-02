import { prisma, RetentionStatus, EvidenceStatus } from "@antipiracy/database";
import { chainOfCustodyService } from "./chainOfCustodyService";
import { logger } from "../logging/logger";

export interface LegalHoldParams {
  evidenceId: string;
  reason: string;
  actor: { id: string; role: string; email: string };
}

export class RetentionPolicyService {
  public static readonly DEFAULT_RETENTION_DAYS = 90;
  public static readonly CRITICAL_RETENTION_DAYS = 365;

  /**
   * Calculates retention expiration date based on classification & severity
   */
  public calculateExpirationDate(severity: string, retentionDaysOverride?: number): Date {
    const days = retentionDaysOverride || (severity === "CRITICAL" ? RetentionPolicyService.CRITICAL_RETENTION_DAYS : RetentionPolicyService.DEFAULT_RETENTION_DAYS);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Applies Legal Hold to an Evidence Record (prevents any automated deletion/archival)
   */
  public async applyLegalHold(params: LegalHoldParams) {
    const record = await prisma.evidenceRecord.findUnique({
      where: { id: params.evidenceId },
    });

    if (!record) throw new Error(`Evidence ${params.evidenceId} not found`);

    const updated = await prisma.evidenceRecord.update({
      where: { id: record.id },
      data: {
        retentionStatus: "LEGAL_HOLD" as RetentionStatus,
        status: "LEGAL_HOLD" as EvidenceStatus,
        legalHoldReason: params.reason,
      },
    });

    await chainOfCustodyService.appendChainEvent({
      evidenceRecordId: record.id,
      eventType: "LEGAL_HOLD_APPLIED",
      actorId: params.actor.id,
      actorRole: params.actor.role,
      actorEmail: params.actor.email,
      eventData: {
        action: "APPLY_LEGAL_HOLD",
        reason: params.reason,
        previousRetentionStatus: record.retentionStatus,
      },
    });

    logger.info(`[RetentionPolicy] Applied LEGAL_HOLD on ${record.evidenceNumber} by ${params.actor.email}`);
    return updated;
  }

  /**
   * Releases Legal Hold on an Evidence Record
   */
  public async releaseLegalHold(evidenceId: string, actor: { id: string; role: string; email: string }, releaseNotes?: string) {
    const record = await prisma.evidenceRecord.findUnique({
      where: { id: evidenceId },
    });

    if (!record) throw new Error(`Evidence ${evidenceId} not found`);
    if (record.retentionStatus !== "LEGAL_HOLD") {
      throw new Error(`Evidence ${record.evidenceNumber} is not on legal hold`);
    }

    const now = new Date();
    const isExpired = record.retentionExpiresAt ? record.retentionExpiresAt < now : false;
    const newRetentionStatus: RetentionStatus = isExpired ? "EXPIRED" : "ACTIVE";
    const newStatus: EvidenceStatus = isExpired ? "ARCHIVED" : "VERIFIED";

    const updated = await prisma.evidenceRecord.update({
      where: { id: record.id },
      data: {
        retentionStatus: newRetentionStatus,
        status: newStatus,
        legalHoldReason: null,
      },
    });

    await chainOfCustodyService.appendChainEvent({
      evidenceRecordId: record.id,
      eventType: "LEGAL_HOLD_RELEASED",
      actorId: actor.id,
      actorRole: actor.role,
      actorEmail: actor.email,
      eventData: {
        action: "RELEASE_LEGAL_HOLD",
        releaseNotes: releaseNotes || "Legal hold released by authorized operator",
        newRetentionStatus,
      },
    });

    logger.info(`[RetentionPolicy] Released LEGAL_HOLD on ${record.evidenceNumber} by ${actor.email}`);
    return updated;
  }

  /**
   * Evaluates all active evidence for expiration and updates status safely
   */
  public async runRetentionEvaluation(): Promise<{
    evaluated: number;
    expiredCount: number;
    activeCount: number;
    heldCount: number;
  }> {
    const records = await prisma.evidenceRecord.findMany({
      where: {
        retentionStatus: { not: "ARCHIVED" as RetentionStatus },
      },
    });

    let expiredCount = 0;
    let activeCount = 0;
    let heldCount = 0;
    const now = new Date();

    for (const record of records) {
      if (record.retentionStatus === "LEGAL_HOLD") {
        heldCount++;
        continue;
      }

      if (record.retentionExpiresAt && record.retentionExpiresAt < now) {
        await prisma.evidenceRecord.update({
          where: { id: record.id },
          data: {
            retentionStatus: "EXPIRED" as RetentionStatus,
            status: "ARCHIVED" as EvidenceStatus,
          },
        });
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      evaluated: records.length,
      expiredCount,
      activeCount,
      heldCount,
    };
  }
}

export const retentionPolicyService = new RetentionPolicyService();
