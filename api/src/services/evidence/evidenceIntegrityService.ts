import { prisma, EvidenceStatus } from "@antipiracy/database";
import { evidenceHashService } from "./evidenceHashService";
import { chainOfCustodyService } from "./chainOfCustodyService";
import { realtimeEventBus } from "../realtime/realtimeEventBus";
import { SecurityAuditService } from "../security/securityAuditService";
import { logger } from "../logging/logger";

export interface VerificationResult {
  evidenceId: string;
  evidenceNumber: string;
  isValid: boolean;
  tamperDetected: boolean;
  recordHashValid: boolean;
  artifactsValid: boolean;
  chainValid: boolean;
  details: string[];
  verifiedAt: Date;
}

export class EvidenceIntegrityService {
  /**
   * Verifies an individual evidence record, its artifacts, and its chain of custody
   */
  public async verifyEvidenceRecord(evidenceId: string, actor?: { id: string; role: string; email: string }): Promise<VerificationResult> {
    const record = await prisma.evidenceRecord.findUnique({
      where: { id: evidenceId },
      include: {
        artifacts: true,
        hashes: { orderBy: { verifiedAt: "desc" }, take: 1 },
      },
    });

    if (!record) {
      throw new Error(`Evidence record ${evidenceId} not found`);
    }

    const details: string[] = [];
    let tamperDetected = false;

    // 1. Verify Record Canonical Hash
    const calculatedRecordHash = evidenceHashService.computeEvidenceRecordHash({
      evidenceNumber: record.evidenceNumber,
      classification: record.classification,
      source: record.source,
      metadata: record.metadata,
      theatreId: record.theatreId,
      movieId: record.movieId,
      showId: record.showId,
      createdAt: record.createdAt,
    });

    const recordHashValid = record.integrityHash ? evidenceHashService.verifyHash(calculatedRecordHash, record.integrityHash) : true;
    if (!recordHashValid) {
      tamperDetected = true;
      details.push(`Evidence record integrity hash mismatch! Stored: ${record.integrityHash}, Calculated: ${calculatedRecordHash}`);
    }

    // 2. Verify all Artifact Hashes
    let artifactsValid = true;
    for (const artifact of record.artifacts) {
      if (artifact.payloadData) {
        const payloadHash = evidenceHashService.computeSha256(artifact.payloadData);
        if (!evidenceHashService.verifyHash(payloadHash, artifact.sha256Hash)) {
          artifactsValid = false;
          tamperDetected = true;
          details.push(`Artifact [${artifact.artifactName}] SHA-256 mismatch! Stored: ${artifact.sha256Hash}, Calculated: ${payloadHash}`);
        }
      }
    }

    // 3. Verify Chain of Custody
    const chainVerification = await chainOfCustodyService.verifyChainOfCustody(record.id);
    const chainValid = chainVerification.isValid;
    if (!chainValid) {
      tamperDetected = true;
      details.push(`Chain of custody broken: ${chainVerification.details}`);
    }

    const overallValid = !tamperDetected;

    // Record verification hash entry in database
    await prisma.evidenceHash.create({
      data: {
        evidenceRecordId: record.id,
        calculatedHash: calculatedRecordHash,
        previousHash: record.integrityHash || null,
        verificationStatus: overallValid ? "VALID" : "TAMPERED",
        verifiedAt: new Date(),
      },
    });

    // Append chain event for integrity check
    await chainOfCustodyService.appendChainEvent({
      evidenceRecordId: record.id,
      eventType: "INTEGRITY_CHECK",
      actorId: actor?.id || "SYSTEM_INTEGRITY_DAEMON",
      actorRole: actor?.role || "SYSTEM",
      actorEmail: actor?.email || "integrity@antipiracy.system",
      eventData: {
        isValid: overallValid,
        tamperDetected,
        details: details.length > 0 ? details : ["All hashes & chain verified clean"],
      },
    });

    // Update record verification timestamp & status if tampered
    if (tamperDetected) {
      await prisma.evidenceRecord.update({
        where: { id: record.id },
        data: {
          status: "FLAGGED_TAMPERED" as EvidenceStatus,
          lastVerifiedAt: new Date(),
        },
      });

      // Raise CRITICAL Security Audit Log
      await SecurityAuditService.logEvent({
        eventType: "SUSPICIOUS_ACTIVITY",
        severity: "CRITICAL",
        userId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        theatreId: record.theatreId || undefined,
        showId: record.showId || undefined,
        actionSummary: `CRITICAL: Forensic evidence tampering detected for ${record.evidenceNumber}`,
        isThreat: true,
        threatDetails: JSON.stringify({
          evidenceId: record.id,
          evidenceNumber: record.evidenceNumber,
          issues: details,
        }),
      });

      // Publish Realtime Threat Signal
      await realtimeEventBus.publish({
        eventType: "SUSPICIOUS_ACTIVITY",
        source: "EVIDENCE_INTEGRITY_MONITOR",
        severity: "CRITICAL",
        theatreId: record.theatreId || undefined,
        movieId: record.movieId || undefined,
        showId: record.showId || undefined,
        metadata: {
          alert: "EVIDENCE_TAMPERING_DETECTED",
          evidenceNumber: record.evidenceNumber,
          details,
        },
      });

      logger.error(`[EvidenceIntegrity] Tamper detected on evidence ${record.evidenceNumber}: ${details.join(", ")}`);
    } else {
      await prisma.evidenceRecord.update({
        where: { id: record.id },
        data: {
          lastVerifiedAt: new Date(),
          status: record.status === "COLLECTED" ? ("VERIFIED" as EvidenceStatus) : record.status,
        },
      });
    }

    return {
      evidenceId: record.id,
      evidenceNumber: record.evidenceNumber,
      isValid: overallValid,
      tamperDetected,
      recordHashValid,
      artifactsValid,
      chainValid,
      details: details.length > 0 ? details : ["Forensic integrity verified. No tampering detected."],
      verifiedAt: new Date(),
    };
  }

  /**
   * Scans all active evidence records for cryptographic integrity
   */
  public async verifyAllEvidence(): Promise<{
    totalScanned: number;
    validCount: number;
    tamperedCount: number;
    tamperedEvidence: string[];
  }> {
    const allEvidence = await prisma.evidenceRecord.findMany({
      where: {
        status: { not: "ARCHIVED" as EvidenceStatus },
      },
      select: { id: true, evidenceNumber: true },
    });

    let validCount = 0;
    let tamperedCount = 0;
    const tamperedEvidence: string[] = [];

    for (const item of allEvidence) {
      try {
        const result = await this.verifyEvidenceRecord(item.id);
        if (result.isValid) {
          validCount++;
        } else {
          tamperedCount++;
          tamperedEvidence.push(item.evidenceNumber);
        }
      } catch (err: any) {
        logger.error(`[EvidenceIntegrity] Failed to verify ${item.evidenceNumber}: ${err.message}`);
      }
    }

    return {
      totalScanned: allEvidence.length,
      validCount,
      tamperedCount,
      tamperedEvidence,
    };
  }
}

export const evidenceIntegrityService = new EvidenceIntegrityService();
