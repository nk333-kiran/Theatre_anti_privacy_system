"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retentionPolicyService = exports.RetentionPolicyService = void 0;
const database_1 = require("@antipiracy/database");
const chainOfCustodyService_1 = require("./chainOfCustodyService");
const logger_1 = require("../logging/logger");
class RetentionPolicyService {
    static DEFAULT_RETENTION_DAYS = 90;
    static CRITICAL_RETENTION_DAYS = 365;
    /**
     * Calculates retention expiration date based on classification & severity
     */
    calculateExpirationDate(severity, retentionDaysOverride) {
        const days = retentionDaysOverride || (severity === "CRITICAL" ? RetentionPolicyService.CRITICAL_RETENTION_DAYS : RetentionPolicyService.DEFAULT_RETENTION_DAYS);
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    }
    /**
     * Applies Legal Hold to an Evidence Record (prevents any automated deletion/archival)
     */
    async applyLegalHold(params) {
        const record = await database_1.prisma.evidenceRecord.findUnique({
            where: { id: params.evidenceId },
        });
        if (!record)
            throw new Error(`Evidence ${params.evidenceId} not found`);
        const updated = await database_1.prisma.evidenceRecord.update({
            where: { id: record.id },
            data: {
                retentionStatus: "LEGAL_HOLD",
                status: "LEGAL_HOLD",
                legalHoldReason: params.reason,
            },
        });
        await chainOfCustodyService_1.chainOfCustodyService.appendChainEvent({
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
        logger_1.logger.info(`[RetentionPolicy] Applied LEGAL_HOLD on ${record.evidenceNumber} by ${params.actor.email}`);
        return updated;
    }
    /**
     * Releases Legal Hold on an Evidence Record
     */
    async releaseLegalHold(evidenceId, actor, releaseNotes) {
        const record = await database_1.prisma.evidenceRecord.findUnique({
            where: { id: evidenceId },
        });
        if (!record)
            throw new Error(`Evidence ${evidenceId} not found`);
        if (record.retentionStatus !== "LEGAL_HOLD") {
            throw new Error(`Evidence ${record.evidenceNumber} is not on legal hold`);
        }
        const now = new Date();
        const isExpired = record.retentionExpiresAt ? record.retentionExpiresAt < now : false;
        const newRetentionStatus = isExpired ? "EXPIRED" : "ACTIVE";
        const newStatus = isExpired ? "ARCHIVED" : "VERIFIED";
        const updated = await database_1.prisma.evidenceRecord.update({
            where: { id: record.id },
            data: {
                retentionStatus: newRetentionStatus,
                status: newStatus,
                legalHoldReason: null,
            },
        });
        await chainOfCustodyService_1.chainOfCustodyService.appendChainEvent({
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
        logger_1.logger.info(`[RetentionPolicy] Released LEGAL_HOLD on ${record.evidenceNumber} by ${actor.email}`);
        return updated;
    }
    /**
     * Evaluates all active evidence for expiration and updates status safely
     */
    async runRetentionEvaluation() {
        const records = await database_1.prisma.evidenceRecord.findMany({
            where: {
                retentionStatus: { not: "ARCHIVED" },
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
                await database_1.prisma.evidenceRecord.update({
                    where: { id: record.id },
                    data: {
                        retentionStatus: "EXPIRED",
                        status: "ARCHIVED",
                    },
                });
                expiredCount++;
            }
            else {
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
exports.RetentionPolicyService = RetentionPolicyService;
exports.retentionPolicyService = new RetentionPolicyService();
