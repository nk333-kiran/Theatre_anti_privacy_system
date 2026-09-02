import { prisma } from "@antipiracy/database";
import { ThreatIntelIndicatorStatus, RetentionStatus } from "@prisma/client";

export class IntelligenceExpirationService {
  /**
   * Scans all active indicators and transitions expired ones to EXPIRED status.
   * Skips indicators linked to EvidenceRecords currently under LEGAL_HOLD.
   */
  public static async evaluateExpiration(): Promise<{
    evaluatedCount: number;
    expiredCount: number;
    preservedUnderLegalHold: number;
  }> {
    const now = new Date();

    // Fetch active indicators whose expiration date has passed
    const expiredCandidates = await prisma.threatIntelIndicator.findMany({
      where: {
        status: ThreatIntelIndicatorStatus.ACTIVE,
        expiresAt: {
          lte: now,
        },
      },
      include: {
        matches: {
          include: {
            evidenceRecord: true,
          },
        },
      },
    });

    let expiredCount = 0;
    let preservedUnderLegalHold = 0;

    for (const ind of expiredCandidates) {
      // Check if any match is linked to an evidence record under legal hold
      const hasLegalHold = ind.matches.some(
        (m) => m.evidenceRecord?.retentionStatus === RetentionStatus.LEGAL_HOLD
      );

      if (hasLegalHold) {
        preservedUnderLegalHold++;
        continue;
      }

      await prisma.threatIntelIndicator.update({
        where: { id: ind.id },
        data: {
          status: ThreatIntelIndicatorStatus.EXPIRED,
        },
      });
      expiredCount++;
    }

    return {
      evaluatedCount: expiredCandidates.length,
      expiredCount,
      preservedUnderLegalHold,
    };
  }
}
