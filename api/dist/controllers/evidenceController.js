"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvidenceStats = exports.exportEvidence = exports.toggleLegalHold = exports.verifyEvidence = exports.getEvidenceChain = exports.getEvidenceById = exports.listEvidence = exports.createEvidence = void 0;
const database_1 = require("@antipiracy/database");
const evidenceHashService_1 = require("../services/evidence/evidenceHashService");
const chainOfCustodyService_1 = require("../services/evidence/chainOfCustodyService");
const evidenceIntegrityService_1 = require("../services/evidence/evidenceIntegrityService");
const retentionPolicyService_1 = require("../services/evidence/retentionPolicyService");
const complianceService_1 = require("../services/evidence/complianceService");
const securityAuditService_1 = require("../services/security/securityAuditService");
const logger_1 = require("../services/logging/logger");
const createEvidence = async (req, res) => {
    try {
        const user = req.user;
        const { title, description, classification, severity = "MEDIUM", source = "FORENSIC_AGENT", theatreId, showId, movieId, productionCompanyId, playbackSessionId, incidentId, securityIncidentId, metadata, artifacts = [], retentionDays, } = req.body;
        if (!title || !classification) {
            res.status(400).json({ error: "title and classification are required" });
            return;
        }
        // Role-based tenant validation
        let resolvedTheatreId = theatreId;
        let resolvedCompanyId = productionCompanyId;
        if (user.role === "THEATRE_STAFF") {
            resolvedTheatreId = user.theatreId;
        }
        else if (user.role === "PRODUCTION_COMPANY") {
            resolvedCompanyId = user.productionCompanyId;
        }
        const evidenceNumber = `EV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const retentionExpiresAt = retentionPolicyService_1.retentionPolicyService.calculateExpirationDate(severity, retentionDays);
        const sanitizedMetadata = metadata ? JSON.stringify(metadata) : null;
        const createdAt = new Date();
        const recordHash = evidenceHashService_1.evidenceHashService.computeEvidenceRecordHash({
            evidenceNumber,
            classification,
            source,
            metadata: sanitizedMetadata,
            theatreId: resolvedTheatreId,
            movieId,
            showId,
            createdAt,
        });
        const record = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber,
                title,
                description,
                classification: classification,
                severity: severity,
                status: "COLLECTED",
                retentionStatus: "ACTIVE",
                theatreId: resolvedTheatreId,
                showId,
                movieId,
                productionCompanyId: resolvedCompanyId,
                playbackSessionId,
                incidentId,
                securityIncidentId,
                source,
                capturedBy: user.email,
                metadata: sanitizedMetadata,
                integrityHash: recordHash,
                retentionExpiresAt,
                createdAt,
            },
        });
        // Create Artifacts & calculate artifact hashes
        for (const art of artifacts) {
            const payloadString = art.payloadData ? (typeof art.payloadData === "string" ? art.payloadData : JSON.stringify(art.payloadData)) : "";
            const sha256Hash = art.sha256Hash || evidenceHashService_1.evidenceHashService.computeSha256(payloadString || art.artifactName);
            await database_1.prisma.evidenceArtifact.create({
                data: {
                    evidenceRecordId: record.id,
                    artifactName: art.artifactName,
                    artifactType: art.artifactType || "LOG_SNIPPET",
                    mimeType: art.mimeType || "application/json",
                    fileSizeBytes: Buffer.byteLength(payloadString, "utf8"),
                    sha256Hash,
                    payloadData: payloadString,
                },
            });
        }
        // Initialize Genesis Chain of Custody block
        await chainOfCustodyService_1.chainOfCustodyService.appendChainEvent({
            evidenceRecordId: record.id,
            eventType: "ACQUISITION",
            actorId: user.id,
            actorRole: user.role,
            actorEmail: user.email,
            eventData: {
                evidenceNumber,
                classification,
                source,
                artifactCount: artifacts.length,
                initialHash: recordHash,
            },
        });
        // Audit log
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: "INFO",
            userId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            theatreId: resolvedTheatreId,
            showId,
            actionSummary: `Forensic Evidence Acquired: ${evidenceNumber} (${title})`,
        });
        const fullRecord = await database_1.prisma.evidenceRecord.findUnique({
            where: { id: record.id },
            include: { artifacts: true, chainEvents: true },
        });
        res.status(201).json(fullRecord);
    }
    catch (err) {
        logger_1.logger.error(`[EvidenceController] Failed to create evidence: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};
exports.createEvidence = createEvidence;
const listEvidence = async (req, res) => {
    try {
        const user = req.user;
        const { classification, severity, status, retentionStatus } = req.query;
        const whereClause = {};
        if (user.role === "THEATRE_STAFF") {
            whereClause.theatreId = user.theatreId;
        }
        else if (user.role === "PRODUCTION_COMPANY") {
            whereClause.productionCompanyId = user.productionCompanyId;
        }
        if (classification)
            whereClause.classification = classification;
        if (severity)
            whereClause.severity = severity;
        if (status)
            whereClause.status = status;
        if (retentionStatus)
            whereClause.retentionStatus = retentionStatus;
        const list = await database_1.prisma.evidenceRecord.findMany({
            where: whereClause,
            include: {
                theatre: { select: { name: true, code: true } },
                movie: { select: { title: true } },
                _count: {
                    select: { artifacts: true, chainEvents: true, investigationLinks: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.listEvidence = listEvidence;
const getEvidenceById = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const record = await database_1.prisma.evidenceRecord.findUnique({
            where: { id },
            include: {
                artifacts: true,
                theatre: true,
                movie: true,
                show: true,
                productionCompany: true,
                hashes: { orderBy: { verifiedAt: "desc" } },
                chainEvents: { orderBy: { timestamp: "asc" } },
                accessLogs: { orderBy: { accessedAt: "desc" }, take: 10 },
                investigationLinks: { include: { case: true } },
            },
        });
        if (!record) {
            res.status(404).json({ error: "Evidence record not found" });
            return;
        }
        // RBAC check
        if (user.role === "THEATRE_STAFF" && record.theatreId !== user.theatreId) {
            res.status(403).json({ error: "Access denied to foreign theatre evidence" });
            return;
        }
        if (user.role === "PRODUCTION_COMPANY" && record.productionCompanyId !== user.productionCompanyId) {
            res.status(403).json({ error: "Access denied to foreign studio evidence" });
            return;
        }
        // Record Access Log
        await database_1.prisma.evidenceAccessLog.create({
            data: {
                evidenceRecordId: record.id,
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                accessType: "VIEW",
                ipAddress: req.ip,
                reason: "Evidence inspection",
            },
        });
        res.json(record);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getEvidenceById = getEvidenceById;
const getEvidenceChain = async (req, res) => {
    try {
        const { id } = req.params;
        const chain = await chainOfCustodyService_1.chainOfCustodyService.getChainHistory(id);
        const verification = await chainOfCustodyService_1.chainOfCustodyService.verifyChainOfCustody(id);
        res.json({ chain, verification });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getEvidenceChain = getEvidenceChain;
const verifyEvidence = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const result = await evidenceIntegrityService_1.evidenceIntegrityService.verifyEvidenceRecord(id, user);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.verifyEvidence = verifyEvidence;
const toggleLegalHold = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { apply, reason = "Mandatory legal preservation hold" } = req.body;
        if (apply) {
            const record = await retentionPolicyService_1.retentionPolicyService.applyLegalHold({
                evidenceId: id,
                reason,
                actor: user,
            });
            res.json({ message: "Legal hold applied successfully", record });
        }
        else {
            const record = await retentionPolicyService_1.retentionPolicyService.releaseLegalHold(id, user, reason);
            res.json({ message: "Legal hold released successfully", record });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.toggleLegalHold = toggleLegalHold;
const exportEvidence = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { format = "JSON", reason } = req.body;
        const result = await complianceService_1.complianceService.exportEvidence({
            evidenceId: id,
            format,
            actor: { id: user.id, email: user.email, role: user.role, ip: req.ip },
            reason,
        });
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.setHeader("Content-Type", result.contentType);
        res.send(result.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.exportEvidence = exportEvidence;
const getEvidenceStats = async (req, res) => {
    try {
        const user = req.user;
        const scope = {};
        if (user.role === "THEATRE_STAFF")
            scope.theatreId = user.theatreId;
        if (user.role === "PRODUCTION_COMPANY")
            scope.productionCompanyId = user.productionCompanyId;
        const stats = await complianceService_1.complianceService.getComplianceStats(scope);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getEvidenceStats = getEvidenceStats;
