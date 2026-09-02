import { Request, Response } from "express";
import { InvestigationCaseStatus, InvestigationCaseSeverity } from "@antipiracy/database";
import { investigationService } from "../services/evidence/investigationService";
import { logger } from "../services/logging/logger";

export const createCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const {
      title,
      description,
      severity,
      threatClassification,
      theatreId,
      showId,
      movieId,
      productionCompanyId,
      playbackSessionId,
      incidentId,
      securityIncidentId,
      assignedAnalystId,
      correlationId,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: "Title is required for investigation case" });
      return;
    }

    let resolvedTheatreId = theatreId;
    let resolvedCompanyId = productionCompanyId;
    if (user.role === "THEATRE_STAFF") resolvedTheatreId = user.theatreId;
    if (user.role === "PRODUCTION_COMPANY") resolvedCompanyId = user.productionCompanyId;

    const newCase = await investigationService.createCase({
      title,
      description,
      severity: severity as InvestigationCaseSeverity,
      threatClassification,
      theatreId: resolvedTheatreId,
      showId,
      movieId,
      productionCompanyId: resolvedCompanyId,
      playbackSessionId,
      incidentId,
      securityIncidentId,
      assignedAnalystId,
      correlationId,
      creator: user,
    });

    res.status(201).json(newCase);
  } catch (err: any) {
    logger.error(`[InvestigationController] Failed to create case: ${err.message}`);
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const listCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, severity, theatreId } = req.query;

    const scope: any = {};
    if (user.role === "THEATRE_STAFF") {
      scope.theatreId = user.theatreId;
    } else if (theatreId) {
      scope.theatreId = theatreId as string;
    }

    if (user.role === "PRODUCTION_COMPANY") scope.productionCompanyId = user.productionCompanyId;
    if (status) scope.status = status as string;
    if (severity) scope.severity = severity as string;

    const cases = await investigationService.getCases(scope);
    res.json(cases);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const getCaseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const item = await investigationService.getCaseById(id, user);
    res.json(item);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const updateCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { title, description, severity, threatClassification } = req.body;

    const target = await investigationService.getCaseById(id, user);
    if (user.role === "THEATRE_STAFF" && target.theatreId && user.theatreId && target.theatreId !== user.theatreId) {
      res.status(403).json({ error: "Access denied to foreign theatre case", code: "UNAUTHORIZED_THEATRE" });
      return;
    }

    const updated = await investigationService.updateCaseStatus(
      id,
      target.status,
      user,
      "Case details modified"
    );

    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const assignAnalyst = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { analystId, notes, correlationId } = req.body;

    if (!analystId) {
      res.status(400).json({ error: "analystId is required" });
      return;
    }

    const updated = await investigationService.assignAnalyst(id, analystId, user, notes, correlationId);
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status, reason, correlationId } = req.body;

    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }

    const updated = await investigationService.updateCaseStatus(
      id,
      status as InvestigationCaseStatus,
      user,
      reason,
      correlationId
    );
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const addNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { content, isInternal = true, correlationId } = req.body;

    if (!content) {
      res.status(400).json({ error: "content is required for note" });
      return;
    }

    const note = await investigationService.addNote(id, content, user, isInternal, correlationId);
    res.status(201).json(note);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const linkEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { evidenceRecordId, evidenceNumber, watermarkId, relevance, correlationId } = req.body;

    if (!evidenceRecordId && !evidenceNumber && !watermarkId) {
      res.status(400).json({ error: "evidenceRecordId, evidenceNumber, or watermarkId is required" });
      return;
    }

    const link = await investigationService.linkEvidence({
      caseId: id,
      evidenceRecordId,
      evidenceNumber,
      watermarkId,
      relevance,
      actor: user,
      correlationId,
    });
    res.status(201).json(link);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const requestContainment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { actionType = "REVOKE_PLAYBACK_SESSION", reason, correlationId } = req.body;

    const result = await investigationService.requestContainment(
      id,
      actionType,
      user,
      reason || "Analyst requested session containment",
      correlationId
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const resolveCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { resolution = "Case investigation resolved successfully", correlationId } = req.body;

    const resolved = await investigationService.resolveCase(id, resolution, user, correlationId);
    res.json(resolved);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const closeCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { closureReason = "Case investigation concluded", correlationId } = req.body;

    const closed = await investigationService.closeCase(id, closureReason, user, correlationId);
    res.json(closed);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const verifyCaseIntegrity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { AutomatedEvidenceService } = await import("../services/evidence/automatedEvidenceService");
    const result = await AutomatedEvidenceService.verifyCaseEvidenceIntegrity(id);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const createAutomatedPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { sessionId, signalType = "SCREEN_CAPTURE_SIGNAL", riskScore = 75, severity = "HIGH" } = req.body;

    const { AutomatedEvidenceService } = await import("../services/evidence/automatedEvidenceService");
    const targetCase = await investigationService.getCaseById(id, user);

    const result = await AutomatedEvidenceService.processSuspiciousEvent({
      sessionId: sessionId || targetCase.playbackSessionId || "SESSION-ACTIVE",
      theatreId: targetCase.theatreId,
      showId: targetCase.showId,
      movieId: targetCase.movieId,
      signalType,
      riskScore,
      severity: severity as any,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

