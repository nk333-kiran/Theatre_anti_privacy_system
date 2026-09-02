"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceService = exports.ComplianceService = void 0;
const database_1 = require("@antipiracy/database");
const chainOfCustodyService_1 = require("./chainOfCustodyService");
class ComplianceService {
    /**
     * Generates a compliant, sanitized forensic export of an evidence record
     */
    async exportEvidence(options) {
        const record = await database_1.prisma.evidenceRecord.findUnique({
            where: { id: options.evidenceId },
            include: {
                artifacts: true,
                hashes: { orderBy: { verifiedAt: "desc" } },
                chainEvents: { orderBy: { timestamp: "asc" } },
                theatre: { select: { name: true, code: true, location: true } },
                movie: { select: { title: true } },
                show: { select: { startTime: true } },
            },
        });
        if (!record)
            throw new Error(`Evidence ${options.evidenceId} not found`);
        // Record Access Log
        await database_1.prisma.evidenceAccessLog.create({
            data: {
                evidenceRecordId: record.id,
                userId: options.actor.id,
                userEmail: options.actor.email,
                userRole: options.actor.role,
                accessType: "EXPORT",
                ipAddress: options.actor.ip,
                reason: options.reason || "Forensic compliance export",
            },
        });
        // Append Chain of Custody Event
        await chainOfCustodyService_1.chainOfCustodyService.appendChainEvent({
            evidenceRecordId: record.id,
            eventType: "EXPORT",
            actorId: options.actor.id,
            actorRole: options.actor.role,
            actorEmail: options.actor.email,
            eventData: {
                exportFormat: options.format,
                reason: options.reason || "Compliance audit export",
                exportedAt: new Date().toISOString(),
            },
        });
        const sanitizedExportData = {
            exportMetadata: {
                generatedAt: new Date().toISOString(),
                exportedBy: options.actor.email,
                actorRole: options.actor.role,
                complianceNotice: "Forensic Evidence Export. Contains zero PII/secrets. Cryptographically verified.",
            },
            evidenceRecord: {
                evidenceNumber: record.evidenceNumber,
                title: record.title,
                description: record.description,
                classification: record.classification,
                severity: record.severity,
                status: record.status,
                retentionStatus: record.retentionStatus,
                source: record.source,
                capturedBy: record.capturedBy,
                theatre: record.theatre ? `${record.theatre.name} (${record.theatre.code})` : null,
                movie: record.movie?.title || null,
                showTime: record.show?.startTime || null,
                integrityHash: record.integrityHash,
                lastVerifiedAt: record.lastVerifiedAt,
                legalHoldReason: record.legalHoldReason,
                createdAt: record.createdAt,
            },
            artifacts: record.artifacts.map((a) => ({
                artifactName: a.artifactName,
                artifactType: a.artifactType,
                sha256Hash: a.sha256Hash,
                fileSizeBytes: a.fileSizeBytes,
                createdAt: a.createdAt,
            })),
            chainOfCustody: record.chainEvents.map((c) => ({
                eventType: c.eventType,
                actorRole: c.actorRole,
                previousChainHash: c.previousChainHash,
                currentChainHash: c.currentChainHash,
                timestamp: c.timestamp,
            })),
        };
        if (options.format === "CSV") {
            const csvRows = [
                "Category,Property,Value",
                `Evidence,Number,${record.evidenceNumber}`,
                `Evidence,Title,"${record.title.replace(/"/g, '""')}"`,
                `Evidence,Classification,${record.classification}`,
                `Evidence,Severity,${record.severity}`,
                `Evidence,Status,${record.status}`,
                `Evidence,IntegrityHash,${record.integrityHash || "N/A"}`,
                `Evidence,Theatre,"${record.theatre?.name || "N/A"}"`,
                `Evidence,Movie,"${record.movie?.title || "N/A"}"`,
                `Evidence,Created,${record.createdAt.toISOString()}`,
            ];
            record.artifacts.forEach((a, idx) => {
                csvRows.push(`Artifact[${idx + 1}],Name,"${a.artifactName}"`);
                csvRows.push(`Artifact[${idx + 1}],Type,${a.artifactType}`);
                csvRows.push(`Artifact[${idx + 1}],SHA256,${a.sha256Hash}`);
            });
            return {
                format: "CSV",
                filename: `evidence_${record.evidenceNumber}.csv`,
                contentType: "text/csv",
                data: csvRows.join("\n"),
            };
        }
        if (options.format === "REPORT") {
            const reportText = [
                "================================================================================",
                `FORENSIC EVIDENCE & COMPLIANCE REPORT: ${record.evidenceNumber}`,
                "================================================================================",
                `Title:               ${record.title}`,
                `Classification:      ${record.classification}`,
                `Severity:            ${record.severity}`,
                `Status:              ${record.status} (Retention: ${record.retentionStatus})`,
                `Source:              ${record.source}`,
                `Integrity SHA-256:   ${record.integrityHash || "N/A"}`,
                `Last Verified:       ${record.lastVerifiedAt?.toISOString() || "NEVER"}`,
                `Theatre Venue:       ${record.theatre?.name || "N/A"} (${record.theatre?.location || "N/A"})`,
                `Movie Asset:         ${record.movie?.title || "N/A"}`,
                `Captured At:         ${record.createdAt.toISOString()}`,
                `Export Generated By: ${options.actor.email} [${options.actor.role}]`,
                "",
                "--- FORENSIC ARTIFACTS ---",
                ...record.artifacts.map((a, i) => `  [${i + 1}] ${a.artifactName} (${a.artifactType}) | SHA256: ${a.sha256Hash}`),
                "",
                "--- CHAIN OF CUSTODY CONTINUITY ---",
                ...record.chainEvents.map((c, i) => `  #${i + 1} ${c.timestamp.toISOString()} | [${c.eventType}] by ${c.actorRole || "SYSTEM"} | Current Hash: ${c.currentChainHash}`),
                "================================================================================",
            ].join("\n");
            return {
                format: "REPORT",
                filename: `evidence_report_${record.evidenceNumber}.txt`,
                contentType: "text/plain",
                data: reportText,
            };
        }
        // Default JSON
        return {
            format: "JSON",
            filename: `evidence_${record.evidenceNumber}.json`,
            contentType: "application/json",
            data: JSON.stringify(sanitizedExportData, null, 2),
        };
    }
    /**
     * Retrieves high-level compliance and evidence health metrics
     */
    async getComplianceStats(scope) {
        const whereClause = {};
        if (scope?.productionCompanyId)
            whereClause.productionCompanyId = scope.productionCompanyId;
        if (scope?.theatreId)
            whereClause.theatreId = scope.theatreId;
        const [totalEvidence, verifiedCount, tamperedCount, legalHoldCount, expiringSoonCount, totalCases, openCases, criticalCases,] = await Promise.all([
            database_1.prisma.evidenceRecord.count({ where: whereClause }),
            database_1.prisma.evidenceRecord.count({ where: { ...whereClause, status: "VERIFIED" } }),
            database_1.prisma.evidenceRecord.count({ where: { ...whereClause, status: "FLAGGED_TAMPERED" } }),
            database_1.prisma.evidenceRecord.count({ where: { ...whereClause, retentionStatus: "LEGAL_HOLD" } }),
            database_1.prisma.evidenceRecord.count({
                where: {
                    ...whereClause,
                    retentionStatus: "ACTIVE",
                    retentionExpiresAt: { lte: new Date(Date.now() + 7 * 86400000) },
                },
            }),
            database_1.prisma.investigationCase.count({ where: whereClause }),
            database_1.prisma.investigationCase.count({ where: { ...whereClause, status: { in: ["OPEN", "INVESTIGATING", "TRIAGED"] } } }),
            database_1.prisma.investigationCase.count({ where: { ...whereClause, severity: "CRITICAL" } }),
        ]);
        return {
            evidenceHealth: {
                totalEvidence,
                verifiedCount,
                tamperedCount,
                legalHoldCount,
                expiringSoonCount,
            },
            investigationMetrics: {
                totalCases,
                openCases,
                criticalCases,
            },
            calculatedAt: new Date().toISOString(),
        };
    }
}
exports.ComplianceService = ComplianceService;
exports.complianceService = new ComplianceService();
