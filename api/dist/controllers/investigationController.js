"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAutomatedPackage = exports.verifyCaseIntegrity = exports.closeCase = exports.resolveCase = exports.requestContainment = exports.linkEvidence = exports.addNote = exports.updateStatus = exports.assignAnalyst = exports.updateCase = exports.getCaseById = exports.listCases = exports.createCase = void 0;
const investigationService_1 = require("../services/evidence/investigationService");
const logger_1 = require("../services/logging/logger");
const createCase = async (req, res) => {
    try {
        const user = req.user;
        const { title, description, severity, threatClassification, theatreId, showId, movieId, productionCompanyId, playbackSessionId, incidentId, securityIncidentId, assignedAnalystId, correlationId, } = req.body;
        if (!title) {
            res.status(400).json({ error: "Title is required for investigation case" });
            return;
        }
        let resolvedTheatreId = theatreId;
        let resolvedCompanyId = productionCompanyId;
        if (user.role === "THEATRE_STAFF")
            resolvedTheatreId = user.theatreId;
        if (user.role === "PRODUCTION_COMPANY")
            resolvedCompanyId = user.productionCompanyId;
        const newCase = await investigationService_1.investigationService.createCase({
            title,
            description,
            severity: severity,
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
    }
    catch (err) {
        logger_1.logger.error(`[InvestigationController] Failed to create case: ${err.message}`);
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.createCase = createCase;
const listCases = async (req, res) => {
    try {
        const user = req.user;
        const { status, severity, theatreId } = req.query;
        const scope = {};
        if (user.role === "THEATRE_STAFF") {
            scope.theatreId = user.theatreId;
        }
        else if (theatreId) {
            scope.theatreId = theatreId;
        }
        if (user.role === "PRODUCTION_COMPANY")
            scope.productionCompanyId = user.productionCompanyId;
        if (status)
            scope.status = status;
        if (severity)
            scope.severity = severity;
        const cases = await investigationService_1.investigationService.getCases(scope);
        res.json(cases);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.listCases = listCases;
const getCaseById = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const item = await investigationService_1.investigationService.getCaseById(id, user);
        res.json(item);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.getCaseById = getCaseById;
const updateCase = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { title, description, severity, threatClassification } = req.body;
        const target = await investigationService_1.investigationService.getCaseById(id, user);
        if (user.role === "THEATRE_STAFF" && target.theatreId && user.theatreId && target.theatreId !== user.theatreId) {
            res.status(403).json({ error: "Access denied to foreign theatre case", code: "UNAUTHORIZED_THEATRE" });
            return;
        }
        const updated = await investigationService_1.investigationService.updateCaseStatus(id, target.status, user, "Case details modified");
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.updateCase = updateCase;
const assignAnalyst = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { analystId, notes, correlationId } = req.body;
        if (!analystId) {
            res.status(400).json({ error: "analystId is required" });
            return;
        }
        const updated = await investigationService_1.investigationService.assignAnalyst(id, analystId, user, notes, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.assignAnalyst = assignAnalyst;
const updateStatus = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { status, reason, correlationId } = req.body;
        if (!status) {
            res.status(400).json({ error: "status is required" });
            return;
        }
        const updated = await investigationService_1.investigationService.updateCaseStatus(id, status, user, reason, correlationId);
        res.json(updated);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.updateStatus = updateStatus;
const addNote = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { content, isInternal = true, correlationId } = req.body;
        if (!content) {
            res.status(400).json({ error: "content is required for note" });
            return;
        }
        const note = await investigationService_1.investigationService.addNote(id, content, user, isInternal, correlationId);
        res.status(201).json(note);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.addNote = addNote;
const linkEvidence = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { evidenceRecordId, evidenceNumber, watermarkId, relevance, correlationId } = req.body;
        if (!evidenceRecordId && !evidenceNumber && !watermarkId) {
            res.status(400).json({ error: "evidenceRecordId, evidenceNumber, or watermarkId is required" });
            return;
        }
        const link = await investigationService_1.investigationService.linkEvidence({
            caseId: id,
            evidenceRecordId,
            evidenceNumber,
            watermarkId,
            relevance,
            actor: user,
            correlationId,
        });
        res.status(201).json(link);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.linkEvidence = linkEvidence;
const requestContainment = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { actionType = "REVOKE_PLAYBACK_SESSION", reason, correlationId } = req.body;
        const result = await investigationService_1.investigationService.requestContainment(id, actionType, user, reason || "Analyst requested session containment", correlationId);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.requestContainment = requestContainment;
const resolveCase = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { resolution = "Case investigation resolved successfully", correlationId } = req.body;
        const resolved = await investigationService_1.investigationService.resolveCase(id, resolution, user, correlationId);
        res.json(resolved);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.resolveCase = resolveCase;
const closeCase = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { closureReason = "Case investigation concluded", correlationId } = req.body;
        const closed = await investigationService_1.investigationService.closeCase(id, closureReason, user, correlationId);
        res.json(closed);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.closeCase = closeCase;
const verifyCaseIntegrity = async (req, res) => {
    try {
        const { id } = req.params;
        const { AutomatedEvidenceService } = await Promise.resolve().then(() => __importStar(require("../services/evidence/automatedEvidenceService")));
        const result = await AutomatedEvidenceService.verifyCaseEvidenceIntegrity(id);
        res.json(result);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.verifyCaseIntegrity = verifyCaseIntegrity;
const createAutomatedPackage = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { sessionId, signalType = "SCREEN_CAPTURE_SIGNAL", riskScore = 75, severity = "HIGH" } = req.body;
        const { AutomatedEvidenceService } = await Promise.resolve().then(() => __importStar(require("../services/evidence/automatedEvidenceService")));
        const targetCase = await investigationService_1.investigationService.getCaseById(id, user);
        const result = await AutomatedEvidenceService.processSuspiciousEvent({
            sessionId: sessionId || targetCase.playbackSessionId || "SESSION-ACTIVE",
            theatreId: targetCase.theatreId,
            showId: targetCase.showId,
            movieId: targetCase.movieId,
            signalType,
            riskScore,
            severity: severity,
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
        });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
};
exports.createAutomatedPackage = createAutomatedPackage;
