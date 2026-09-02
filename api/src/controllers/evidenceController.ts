import { Request, Response } from "express";
import { prisma, EvidenceClassification, IncidentSeverity, EvidenceStatus, RetentionStatus } from "@antipiracy/database";
import { evidenceHashService } from "../services/evidence/evidenceHashService";
import { chainOfCustodyService } from "../services/evidence/chainOfCustodyService";
import { evidenceIntegrityService } from "../services/evidence/evidenceIntegrityService";
import { retentionPolicyService } from "../services/evidence/retentionPolicyService";
import { complianceService } from "../services/evidence/complianceService";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { logger } from "../services/logging/logger";

export const createEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const {
      title,
      description,
      classification,
      severity = "MEDIUM",
      source = "FORENSIC_AGENT",
      theatreId,
      showId,
      movieId,
      productionCompanyId,
      playbackSessionId,
      incidentId,
      securityIncidentId,
      metadata,
      artifacts = [],
      retentionDays,
    } = req.body;

    if (!title || !classification) {
      res.status(400).json({ error: "title and classification are required" });
      return;
    }

    // Role-based tenant validation
    let resolvedTheatreId = theatreId;
    let resolvedCompanyId = productionCompanyId;
    if (user.role === "THEATRE_STAFF") {
      resolvedTheatreId = user.theatreId;
    } else if (user.role === "PRODUCTION_COMPANY") {
      resolvedCompanyId = user.productionCompanyId;
    }

    const evidenceNumber = `EV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const retentionExpiresAt = retentionPolicyService.calculateExpirationDate(severity, retentionDays);
    const sanitizedMetadata = metadata ? JSON.stringify(metadata) : null;
    const createdAt = new Date();

    const recordHash = evidenceHashService.computeEvidenceRecordHash({
      evidenceNumber,
      classification,
      source,
      metadata: sanitizedMetadata,
      theatreId: resolvedTheatreId,
      movieId,
      showId,
      createdAt,
    });

    const record = await prisma.evidenceRecord.create({
      data: {
        evidenceNumber,
        title,
        description,
        classification: classification as EvidenceClassification,
        severity: severity as IncidentSeverity,
        status: "COLLECTED" as EvidenceStatus,
        retentionStatus: "ACTIVE" as RetentionStatus,
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
      const sha256Hash = art.sha256Hash || evidenceHashService.computeSha256(payloadString || art.artifactName);

      await prisma.evidenceArtifact.create({
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
    await chainOfCustodyService.appendChainEvent({
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
    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: "INFO",
      userId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      theatreId: resolvedTheatreId,
      showId,
      actionSummary: `Forensic Evidence Acquired: ${evidenceNumber} (${title})`,
    });

    const fullRecord = await prisma.evidenceRecord.findUnique({
      where: { id: record.id },
      include: { artifacts: true, chainEvents: true },
    });

    res.status(201).json(fullRecord);
  } catch (err: any) {
    logger.error(`[EvidenceController] Failed to create evidence: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

export const listEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { classification, severity, status, retentionStatus } = req.query;

    const whereClause: any = {};
    if (user.role === "THEATRE_STAFF") {
      whereClause.theatreId = user.theatreId;
    } else if (user.role === "PRODUCTION_COMPANY") {
      whereClause.productionCompanyId = user.productionCompanyId;
    }

    if (classification) whereClause.classification = classification as EvidenceClassification;
    if (severity) whereClause.severity = severity as IncidentSeverity;
    if (status) whereClause.status = status as EvidenceStatus;
    if (retentionStatus) whereClause.retentionStatus = retentionStatus as RetentionStatus;

    const list = await prisma.evidenceRecord.findMany({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getEvidenceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const record = await prisma.evidenceRecord.findUnique({
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
    await prisma.evidenceAccessLog.create({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getEvidenceChain = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const chain = await chainOfCustodyService.getChainHistory(id);
    const verification = await chainOfCustodyService.verifyChainOfCustody(id);
    res.json({ chain, verification });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const verifyEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const result = await evidenceIntegrityService.verifyEvidenceRecord(id, user);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleLegalHold = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { apply, reason = "Mandatory legal preservation hold" } = req.body;

    if (apply) {
      const record = await retentionPolicyService.applyLegalHold({
        evidenceId: id,
        reason,
        actor: user,
      });
      res.json({ message: "Legal hold applied successfully", record });
    } else {
      const record = await retentionPolicyService.releaseLegalHold(id, user, reason);
      res.json({ message: "Legal hold released successfully", record });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const exportEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { format = "JSON", reason } = req.body;

    const result = await complianceService.exportEvidence({
      evidenceId: id,
      format,
      actor: { id: user.id, email: user.email, role: user.role, ip: req.ip },
      reason,
    });

    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.setHeader("Content-Type", result.contentType);
    res.send(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getEvidenceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const scope: any = {};
    if (user.role === "THEATRE_STAFF") scope.theatreId = user.theatreId;
    if (user.role === "PRODUCTION_COMPANY") scope.productionCompanyId = user.productionCompanyId;

    const stats = await complianceService.getComplianceStats(scope);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
