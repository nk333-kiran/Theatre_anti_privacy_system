"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPackageIntegrity = exports.cancelEnforcementAction = exports.completeEnforcementAction = exports.submitEnforcementAction = exports.rejectEnforcementAction = exports.approveEnforcementAction = exports.submitForReview = exports.generateEnforcementPackage = exports.getEnforcementActionById = exports.listEnforcementActions = exports.createEnforcementAction = void 0;
const enforcementService_1 = require("../services/enforcement/enforcementService");
const enforcementEvidenceService_1 = require("../services/enforcement/enforcementEvidenceService");
const logger_1 = require("../services/logging/logger");
const createEnforcementAction = async (req, res) => {
    try {
        const user = req.user;
        const { caseId, title, description, actionType, targetEntity, targetJurisdiction, severity, correlationId, } = req.body;
        if (!caseId || !title || !actionType) {
            res.status(400).json({ error: "caseId, title, and actionType are required" });
            return;
        }
        const created = await enforcementService_1.enforcementService.createEnforcement({
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
    }
    catch (err) {
        logger_1.logger.error(`[EnforcementController] Failed to create enforcement: ${err.message}`);
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.createEnforcementAction = createEnforcementAction;
const listEnforcementActions = async (req, res) => {
    try {
        const user = req.user;
        const { status, severity, theatreId, caseId, productionCompanyId } = req.query;
        const enforcements = await enforcementService_1.enforcementService.getEnforcements({
            status: status,
            severity: severity,
            theatreId: theatreId,
            caseId: caseId,
            productionCompanyId: productionCompanyId,
        }, user);
        res.json(enforcements);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.listEnforcementActions = listEnforcementActions;
const getEnforcementActionById = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const enforcement = await enforcementService_1.enforcementService.getEnforcementById(id, user);
        res.json(enforcement);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.getEnforcementActionById = getEnforcementActionById;
const generateEnforcementPackage = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const enforcement = await enforcementService_1.enforcementService.getEnforcementById(id, user);
        const pkg = await enforcementEvidenceService_1.EnforcementEvidenceService.generatePackage(enforcement.caseId, user, enforcement.correlationId);
        res.json(pkg);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.generateEnforcementPackage = generateEnforcementPackage;
const submitForReview = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { notes, correlationId } = req.body;
        const updated = await enforcementService_1.enforcementService.submitForReview(id, user, notes, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.submitForReview = submitForReview;
const approveEnforcementAction = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { notes, correlationId } = req.body;
        const updated = await enforcementService_1.enforcementService.processApproval(id, "APPROVE", user, notes, undefined, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.approveEnforcementAction = approveEnforcementAction;
const rejectEnforcementAction = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { reason, notes, correlationId } = req.body;
        if (!reason && !notes) {
            res.status(400).json({ error: "Rejection reason is mandatory when rejecting enforcement action" });
            return;
        }
        const updated = await enforcementService_1.enforcementService.processApproval(id, "REJECT", user, notes, reason, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.rejectEnforcementAction = rejectEnforcementAction;
const submitEnforcementAction = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { submissionReference, notes, correlationId } = req.body;
        const updated = await enforcementService_1.enforcementService.submitEnforcement(id, user, submissionReference, notes, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.submitEnforcementAction = submitEnforcementAction;
const completeEnforcementAction = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { resolutionSummary = "Action successfully resolved and verified", correlationId } = req.body;
        const updated = await enforcementService_1.enforcementService.completeEnforcement(id, user, resolutionSummary, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.completeEnforcementAction = completeEnforcementAction;
const cancelEnforcementAction = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { cancellationReason = "Cancelled by authorized security staff", correlationId } = req.body;
        const updated = await enforcementService_1.enforcementService.cancelEnforcement(id, user, cancellationReason, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.cancelEnforcementAction = cancelEnforcementAction;
const verifyPackageIntegrity = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const enforcement = await enforcementService_1.enforcementService.getEnforcementById(id, user);
        if (!enforcement.package) {
            res.status(404).json({ error: "No package attached to this enforcement action" });
            return;
        }
        const result = enforcementEvidenceService_1.EnforcementEvidenceService.verifyPackageIntegrity(enforcement.package);
        res.json({
            enforcementId: enforcement.id,
            enforcementNumber: enforcement.enforcementNumber,
            packageId: enforcement.package.packageId,
            ...result,
        });
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.verifyPackageIntegrity = verifyPackageIntegrity;
