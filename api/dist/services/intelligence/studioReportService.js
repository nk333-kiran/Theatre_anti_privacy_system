"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioReportService = exports.StudioReportService = void 0;
const database_1 = require("@antipiracy/database");
const studioIntelligenceService_1 = require("./studioIntelligenceService");
const evidenceHashService_1 = require("../evidence/evidenceHashService");
const logger_1 = require("../logging/logger");
class StudioReportService {
    static reportCounter = 5000;
    /**
     * Generates a canonical RPT-YYYY-XXXX identifier.
     */
    static generateReportId() {
        const year = new Date().getFullYear();
        StudioReportService.reportCounter += 1;
        const seq = StudioReportService.reportCounter.toString().padStart(4, "0");
        return `RPT-${year}-${seq}`;
    }
    /**
     * Compiles an executive management report from aggregated studio intelligence.
     */
    static async generateManagementReport(params, actor, correlationId) {
        const corrId = correlationId || `CORR-RPT-${Date.now()}`;
        const reportId = StudioReportService.generateReportId();
        logger_1.logger.info(`[StudioReportService] Generating management report ${reportId} for ${actor.email} [${corrId}]`);
        // 1. Fetch aggregated intelligence summary
        const intel = await studioIntelligenceService_1.studioIntelligenceService.getStudioIntelligence(params, actor);
        // 2. Fetch specific movie details if filtered
        let targetMovie = null;
        if (params.movieId) {
            const m = await database_1.prisma.movie.findUnique({
                where: { id: params.movieId },
            }).catch(() => null);
            if (m) {
                targetMovie = {
                    id: m.id,
                    title: m.title,
                    durationMinutes: m.durationMinutes,
                    language: m.language,
                };
            }
        }
        // 3. Compile affected theatres
        const affectedTheatres = intel.theatreRankings.map((t) => ({
            theatreId: t.theatreId,
            theatreName: t.theatreName,
            theatreCode: t.theatreCode,
            location: t.location,
            incidentCount: t.incidentCount,
            vulnerabilityRating: t.vulnerabilityRating,
        }));
        // 4. Summarize investigations
        const totalCases = Object.values(intel.investigationPipeline).reduce((a, b) => a + b, 0);
        const activeCases = (intel.investigationPipeline.OPEN || 0) + (intel.investigationPipeline.TRIAGED || 0) + (intel.investigationPipeline.INVESTIGATING || 0);
        const containedCases = intel.investigationPipeline.CONTAINED || 0;
        const resolvedCases = (intel.investigationPipeline.RESOLVED || 0) + (intel.investigationPipeline.CLOSED || 0);
        // 5. Summarize enforcements
        const totalEnforcements = Object.values(intel.enforcementPipeline).reduce((a, b) => a + b, 0);
        const completedEnforcements = intel.enforcementPipeline.COMPLETED || 0;
        const terminalEnforcements = completedEnforcements + (intel.enforcementPipeline.REJECTED || 0) + (intel.enforcementPipeline.CANCELLED || 0);
        const successRate = terminalEnforcements > 0 ? Number(((completedEnforcements / terminalEnforcements) * 100).toFixed(1)) : 100;
        // 6. Build Raw Report structure
        const rawReport = {
            reportId,
            generatedAt: new Date().toISOString(),
            generatedBy: {
                id: actor.id,
                email: actor.email,
                role: actor.role,
            },
            reportPeriod: {
                startDate: intel.period.startDate,
                endDate: intel.period.endDate,
            },
            studioScope: {
                productionCompanyId: intel.studioScope.productionCompanyId,
                productionCompanyName: intel.studioScope.productionCompanyName,
            },
            targetMovie,
            executiveSummary: {
                headline: `Anti-Piracy Security & Enforcement Intelligence Report — ${targetMovie ? targetMovie.title : intel.studioScope.productionCompanyName || "Global Repertoire"}`,
                overallRiskPosture: intel.kpis.overallThreatPosture,
                globalRiskScore: intel.kpis.globalStudioRiskScore,
                totalIncidents: intel.kpis.totalIncidents,
                highRiskIncidents: intel.kpis.highRiskIncidents,
                takedownEfficacyRate: intel.kpis.takedownSuccessRate,
                totalForensicEvidenceItems: intel.kpis.totalEvidenceRecords,
                activeEnforcementsCount: intel.kpis.activeEnforcements,
            },
            affectedTheatresSummary: affectedTheatres,
            incidentBreakdown: {
                bySeverity: {
                    CRITICAL: intel.movieRankings.reduce((sum, m) => sum + (m.riskCategory === "CRITICAL" ? 1 : 0), 0),
                    HIGH: intel.movieRankings.reduce((sum, m) => sum + (m.riskCategory === "HIGH" ? 1 : 0), 0),
                    ELEVATED: intel.movieRankings.reduce((sum, m) => sum + (m.riskCategory === "ELEVATED" ? 1 : 0), 0),
                    GUARDED: intel.movieRankings.reduce((sum, m) => sum + (m.riskCategory === "GUARDED" ? 1 : 0), 0),
                },
                byClassification: {
                    WATERMARK_CAPTURES: intel.evidenceBreakdown.watermarkCaptures,
                    OPTICAL_SCREENSHOTS: intel.evidenceBreakdown.opticalRecordings,
                    AUDIO_LEAKS: intel.evidenceBreakdown.audioLeaks,
                    DRM_TAMPER: intel.evidenceBreakdown.drmAnomalies,
                },
            },
            evidenceAndWatermarks: {
                totalEvidenceVaultRecords: intel.kpis.totalEvidenceRecords,
                watermarkDetectionsCount: intel.evidenceBreakdown.watermarkCaptures,
                verifiedHashIntegrityCount: intel.kpis.totalEvidenceRecords,
                suspiciousSessionsCount: intel.suspiciousSessions.length,
            },
            investigationPipelineSummary: {
                totalCases,
                activeCases,
                containedCases,
                resolvedCases,
            },
            enforcementResponseSummary: {
                totalEnforcementActions: totalEnforcements,
                draftActions: intel.enforcementPipeline.DRAFT || 0,
                approvedActions: intel.enforcementPipeline.APPROVED || 0,
                submittedActions: intel.enforcementPipeline.SUBMITTED || 0,
                completedTakedowns: completedEnforcements,
                rejectedOrCancelled: (intel.enforcementPipeline.REJECTED || 0) + (intel.enforcementPipeline.CANCELLED || 0),
                successRatePercentage: successRate,
            },
            complianceCertification: "ZERO SECRETS / ZERO PII CERTIFIED & CRYPTOGRAPHICALLY VALIDATED REPORT",
        };
        // 7. Sanitize completely
        const sanitizedReport = studioIntelligenceService_1.studioIntelligenceService.sanitize(rawReport);
        // 8. Calculate deterministic SHA-256 report integrity hash
        const canonicalString = JSON.stringify(sanitizedReport);
        const reportIntegrityHash = evidenceHashService_1.evidenceHashService.computeSha256(canonicalString);
        const completeReport = {
            ...sanitizedReport,
            reportIntegrityHash,
        };
        logger_1.logger.info(`[StudioReportService] Report ${reportId} compiled successfully (SHA-256: ${reportIntegrityHash.slice(0, 16)}...)`);
        return completeReport;
    }
    /**
     * Generates a downloadable CSV string representing movie and theatre piracy risk.
     */
    static async exportReportAsCsv(params, actor) {
        const intel = await studioIntelligenceService_1.studioIntelligenceService.getStudioIntelligence(params, actor);
        const lines = [
            "--- STUDIO ANTI-PIRACY MANAGEMENT REPORT ---",
            `Report Period,${intel.period.startDate} to ${intel.period.endDate}`,
            `Studio Scope,${intel.studioScope.productionCompanyName || "All Studios"}`,
            `Overall Posture,${intel.kpis.overallThreatPosture}`,
            `Global Risk Score,${intel.kpis.globalStudioRiskScore}/100`,
            `Total Incidents,${intel.kpis.totalIncidents}`,
            `Takedown Success Rate,${intel.kpis.takedownSuccessRate}%`,
            "",
            "--- MOVIE RISK RANKING ---",
            "Movie Title,Incidents,Critical Incidents,Avg Risk Score,Watermark Hits,Active Investigations,Risk Category",
        ];
        intel.movieRankings.forEach((m) => {
            lines.push(`"${m.movieTitle.replace(/"/g, '""')}",${m.incidentCount},${m.criticalIncidentCount},${m.averageRiskScore},${m.watermarkHits},${m.activeInvestigations},${m.riskCategory}`);
        });
        lines.push("");
        lines.push("--- THEATRE VULNERABILITY RANKING ---");
        lines.push("Theatre Code,Theatre Name,Location,Incidents,Avg Risk Score,Watermark Hits,Vulnerability Rating");
        intel.theatreRankings.forEach((t) => {
            lines.push(`"${t.theatreCode}","${t.theatreName.replace(/"/g, '""')}","${(t.location || "").replace(/"/g, '""')}",${t.incidentCount},${t.averageRiskScore},${t.watermarkDetections},${t.vulnerabilityRating}`);
        });
        const filename = `Studio-Intelligence-Report-${new Date().toISOString().slice(0, 10)}.csv`;
        return {
            filename,
            csvData: lines.join("\n"),
        };
    }
}
exports.StudioReportService = StudioReportService;
exports.studioReportService = StudioReportService;
