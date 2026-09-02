"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligenceExpirationService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
class IntelligenceExpirationService {
    /**
     * Scans all active indicators and transitions expired ones to EXPIRED status.
     * Skips indicators linked to EvidenceRecords currently under LEGAL_HOLD.
     */
    static async evaluateExpiration() {
        const now = new Date();
        // Fetch active indicators whose expiration date has passed
        const expiredCandidates = await database_1.prisma.threatIntelIndicator.findMany({
            where: {
                status: client_1.ThreatIntelIndicatorStatus.ACTIVE,
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
            const hasLegalHold = ind.matches.some((m) => m.evidenceRecord?.retentionStatus === client_1.RetentionStatus.LEGAL_HOLD);
            if (hasLegalHold) {
                preservedUnderLegalHold++;
                continue;
            }
            await database_1.prisma.threatIntelIndicator.update({
                where: { id: ind.id },
                data: {
                    status: client_1.ThreatIntelIndicatorStatus.EXPIRED,
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
exports.IntelligenceExpirationService = IntelligenceExpirationService;
