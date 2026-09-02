import { Request, Response } from "express";
import { enforcementService } from "../services/enforcement/enforcementService";
import { EnforcementEvidenceService } from "../services/enforcement/enforcementEvidenceService";
import { logger } from "../services/logging/logger";

export const createEnforcementAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const {
      caseId,
      title,
      description,
      actionType,
      targetEntity,
      targetJurisdiction,
      severity,
      correlationId,
    } = req.body;

    if (!caseId || !title || !actionType) {
      res.status(400).json({ error: "caseId, title, and actionType are required" });
      return;
    }

    const created = await enforcementService.createEnforcement({
      caseId,
      title,
      description,
      actionType,
      targetEntity,
      targetJurisdiction,
      severity,
      correlationId,
      actor: user,
    });

    res.status(201).json(created);
  } catch (err: any) {
    logger.error(`[EnforcementController] Failed to create enforcement: ${err.message}`);
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const listEnforcementActions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, severity, theatreId, caseId, productionCompanyId } = req.query;

    const enforcements = await enforcementService.getEnforcements(
      {
        status: status as string,
        severity: severity as string,
        theatreId: theatreId as string,
        caseId: caseId as string,
        productionCompanyId: productionCompanyId as string,
      },
      user
    );

    res.json(enforcements);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const getEnforcementActionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const enforcement = await enforcementService.getEnforcementById(id, user);
    res.json(enforcement);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const generateEnforcementPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const enforcement = await enforcementService.getEnforcementById(id, user);
    const pkg = await EnforcementEvidenceService.generatePackage(
      enforcement.caseId,
      user,
      enforcement.correlationId
    );

    res.json(pkg);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const submitForReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { notes, correlationId } = req.body;

    const updated = await enforcementService.submitForReview(id, user, notes, correlationId);
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const approveEnforcementAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { notes, correlationId } = req.body;

    const updated = await enforcementService.processApproval(
      id,
      "APPROVE",
      user,
      notes,
      undefined,
      correlationId
    );
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const rejectEnforcementAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { reason, notes, correlationId } = req.body;

    if (!reason && !notes) {
      res.status(400).json({ error: "Rejection reason is mandatory when rejecting enforcement action" });
      return;
    }

    const updated = await enforcementService.processApproval(
      id,
      "REJECT",
      user,
      notes,
      reason,
      correlationId
    );
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const submitEnforcementAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { submissionReference, notes, correlationId } = req.body;

    const updated = await enforcementService.submitEnforcement(
      id,
      user,
      submissionReference,
      notes,
      correlationId
    );
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const completeEnforcementAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { resolutionSummary = "Action successfully resolved and verified", correlationId } = req.body;

    const updated = await enforcementService.completeEnforcement(
      id,
      user,
      resolutionSummary,
      correlationId
    );
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const cancelEnforcementAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { cancellationReason = "Cancelled by authorized security staff", correlationId } = req.body;

    const updated = await enforcementService.cancelEnforcement(
      id,
      user,
      cancellationReason,
      correlationId
    );
    res.json(updated);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};

export const verifyPackageIntegrity = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const enforcement = await enforcementService.getEnforcementById(id, user);
    if (!enforcement.package) {
      res.status(404).json({ error: "No package attached to this enforcement action" });
      return;
    }

    const result = EnforcementEvidenceService.verifyPackageIntegrity(enforcement.package);
    res.json({
      enforcementId: enforcement.id,
      enforcementNumber: enforcement.enforcementNumber,
      packageId: enforcement.package.packageId,
      ...result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
};
