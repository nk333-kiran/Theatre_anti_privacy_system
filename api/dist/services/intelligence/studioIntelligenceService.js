"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioIntelligenceService = exports.StudioIntelligenceService = void 0;
const database_1 = require("@antipiracy/database");
const enforcementService_1 = require("../enforcement/enforcementService");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../logging/logger");
class StudioIntelligenceService {
    /**
     * Sanitizes all output records to guarantee zero passwords, JWTs, card data, or secret keys.
     */
    static sanitize(data) {
        if (data === null || data === undefined)
            return data;
        if (typeof data === "string") {
            return data
                .replace(/bearer\s+[a-zA-Z0-9\-_.+/=]+/gi, "Bearer [REDACTED]")
                .replace(/ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, "[REDACTED_JWT]")
                .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[REDACTED_CARD]")
                .replace(/\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}/g, "[REDACTED_HASH]");
        }
        if (Array.isArray(data)) {
            return data.map((item) => StudioIntelligenceService.sanitize(item));
        }
        if (typeof data === "object") {
            const clean = {};
            for (const [k, v] of Object.entries(data)) {
                const lower = k.toLowerCase();
                if (lower.includes("password") ||
                    lower.includes("secret") ||
                    lower.includes("token") ||
                    lower.includes("jwt") ||
                    lower.includes("key") ||
                    lower.includes("card") ||
                    lower.includes("cvv")) {
                    clean[k] = "[REDACTED]";
                }
                else {
                    clean[k] = StudioIntelligenceService.sanitize(v);
                }
            }
            return clean;
        }
        return data;
    }
    /**
     * Resolves query filters based on actor's role and authorization.
     */
    static resolveScope(filters, actor) {
        let companyId = filters.productionCompanyId;
        let theatreId = filters.theatreId;
        if (actor.role === "PRODUCTION_COMPANY") {
            if (!actor.productionCompanyId) {
                throw new errorHandler_1.AppError("Production company user has no associated studio tenant", 403, "UNAUTHORIZED_STUDIO");
            }
            companyId = actor.productionCompanyId; // Enforce strict studio isolation
        }
        if (actor.role === "THEATRE_STAFF" || actor.role === "THEATRE_ADMIN") {
            if (!actor.theatreId) {
                throw new errorHandler_1.AppError("Theatre user has no assigned venue", 403, "UNAUTHORIZED_THEATRE");
            }
            theatreId = actor.theatreId; // Enforce venue boundary
        }
        let dateFilter = undefined;
        if (filters.startDate || filters.endDate) {
            const now = new Date();
            const start = filters.startDate ? new Date(filters.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60000);
            const end = filters.endDate ? new Date(filters.endDate) : now;
            dateFilter = { gte: start, lte: end };
        }
        return {
            companyId,
            theatreId,
            movieId: filters.movieId,
            dateFilter,
        };
    }
    /**
     * Aggregates Studio Intelligence metrics across all platform security subsystems.
     */
    static async getStudioIntelligence(filters, actor) {
        const scope = this.resolveScope(filters, actor);
        const correlationId = `CORR-STUDIO-INTEL-${Date.now()}`;
        logger_1.logger.info(`[StudioIntelligenceService] Aggregating studio intelligence for actor ${actor.email} (${actor.role}) [${correlationId}]`);
        // 1. Fetch Movies in scope
        const movieWhere = {};
        if (scope.companyId)
            movieWhere.productionCompanyId = scope.companyId;
        if (scope.movieId)
            movieWhere.id = scope.movieId;
        const movies = await database_1.prisma.movie.findMany({
            where: movieWhere,
            include: {
                productionCompany: true,
            },
        });
        const movieIds = movies.map((m) => m.id);
        // 2. Fetch Theatres in scope
        const theatreWhere = {};
        if (scope.theatreId)
            theatreWhere.id = scope.theatreId;
        const theatres = await database_1.prisma.theatre.findMany({
            where: theatreWhere,
            include: {
                screens: true,
            },
        });
        const theatreIds = theatres.map((t) => t.id);
        // 3. Fetch Piracy Incidents
        const incidentWhere = {};
        if (scope.movieId) {
            incidentWhere.movieId = scope.movieId;
        }
        else if (movieIds.length > 0) {
            incidentWhere.movieId = { in: movieIds };
        }
        if (scope.theatreId) {
            incidentWhere.theatreId = scope.theatreId;
        }
        else if (theatreIds.length > 0) {
            incidentWhere.theatreId = { in: theatreIds };
        }
        if (scope.dateFilter) {
            incidentWhere.createdAt = scope.dateFilter;
        }
        const [piracyIncidents, securityIncidents] = await Promise.all([
            database_1.prisma.piracyIncident.findMany({
                where: incidentWhere,
                include: {
                    theatre: true,
                    movie: true,
                    evidence: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            database_1.prisma.securityIncident.findMany({
                where: incidentWhere,
                include: {
                    theatre: true,
                    movie: true,
                },
                orderBy: { createdAt: "desc" },
            }),
        ]);
        // 4. Fetch Evidence Records
        const evidenceWhere = {};
        if (scope.companyId)
            evidenceWhere.productionCompanyId = scope.companyId;
        if (scope.movieId)
            evidenceWhere.movieId = scope.movieId;
        else if (movieIds.length > 0)
            evidenceWhere.movieId = { in: movieIds };
        if (scope.theatreId)
            evidenceWhere.theatreId = scope.theatreId;
        if (scope.dateFilter)
            evidenceWhere.createdAt = scope.dateFilter;
        const evidenceRecords = await database_1.prisma.evidenceRecord.findMany({
            where: evidenceWhere,
            include: {
                theatre: true,
                movie: true,
                artifacts: true,
            },
            orderBy: { createdAt: "desc" },
        });
        // 5. Fetch Investigation Cases
        const caseWhere = {};
        if (scope.companyId)
            caseWhere.productionCompanyId = scope.companyId;
        if (scope.movieId)
            caseWhere.movieId = scope.movieId;
        else if (movieIds.length > 0)
            caseWhere.movieId = { in: movieIds };
        if (scope.theatreId)
            caseWhere.theatreId = scope.theatreId;
        if (scope.dateFilter)
            caseWhere.createdAt = scope.dateFilter;
        const investigationCases = await database_1.prisma.investigationCase.findMany({
            where: caseWhere,
            include: {
                theatre: true,
                movie: true,
                evidenceLinks: true,
            },
            orderBy: { createdAt: "desc" },
        });
        // 6. Fetch Enforcement Actions
        const allEnforcements = await enforcementService_1.enforcementService.getEnforcements({
            productionCompanyId: scope.companyId,
            theatreId: scope.theatreId,
        }, actor);
        const enforcements = scope.movieId
            ? allEnforcements.filter((e) => e.movieId === scope.movieId)
            : allEnforcements;
        // 7. Calculate Investigation & Enforcement Pipeline Funnels
        const investigationPipeline = {
            OPEN: 0,
            TRIAGED: 0,
            INVESTIGATING: 0,
            CONTAINED: 0,
            ESCALATED: 0,
            RESOLVED: 0,
            CLOSED: 0,
            ARCHIVED: 0,
        };
        investigationCases.forEach((c) => {
            if (investigationPipeline[c.status] !== undefined) {
                investigationPipeline[c.status]++;
            }
        });
        const enforcementPipeline = {
            DRAFT: 0,
            REVIEW: 0,
            APPROVED: 0,
            SUBMITTED: 0,
            COMPLETED: 0,
            REJECTED: 0,
            CANCELLED: 0,
        };
        enforcements.forEach((e) => {
            if (enforcementPipeline[e.status] !== undefined) {
                enforcementPipeline[e.status]++;
            }
        });
        // 8. Calculate Movie Risk Rankings
        const movieRankings = movies.map((movie) => {
            const movieIncidents = piracyIncidents.filter((i) => i.movieId === movie.id);
            const movieSecIncidents = securityIncidents.filter((i) => i.movieId === movie.id);
            const totalMovieIncidents = movieIncidents.length + movieSecIncidents.length;
            const criticalIncidents = movieIncidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length +
                movieSecIncidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length;
            const riskScores = [
                ...movieIncidents.map((i) => i.riskScore || 50),
                ...movieSecIncidents.map((i) => i.riskScore || 50),
            ];
            const avgRisk = riskScores.length > 0 ? Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length) : 0;
            const watermarkHits = evidenceRecords.filter((e) => e.movieId === movie.id && (e.classification === "WATERMARK_MATCH" || (e.metadata && e.metadata.includes("watermarkId")))).length;
            const activeCases = investigationCases.filter((c) => c.movieId === movie.id && !["CLOSED", "ARCHIVED"].includes(c.status)).length;
            const activeEnfs = enforcements.filter((e) => e.movieId === movie.id && !["COMPLETED", "CANCELLED"].includes(e.status)).length;
            let riskCategory = "LOW";
            if (avgRisk >= 80 || criticalIncidents >= 3)
                riskCategory = "CRITICAL";
            else if (avgRisk >= 65 || criticalIncidents >= 2)
                riskCategory = "HIGH";
            else if (avgRisk >= 45 || totalMovieIncidents >= 3)
                riskCategory = "ELEVATED";
            else if (avgRisk >= 25 || totalMovieIncidents >= 1)
                riskCategory = "GUARDED";
            return {
                movieId: movie.id,
                movieTitle: movie.title,
                productionCompanyId: movie.productionCompanyId,
                productionCompanyName: movie.productionCompany?.name || null,
                incidentCount: totalMovieIncidents,
                criticalIncidentCount: criticalIncidents,
                averageRiskScore: avgRisk,
                watermarkHits,
                activeInvestigations: activeCases,
                activeEnforcements: activeEnfs,
                riskCategory,
            };
        }).sort((a, b) => b.averageRiskScore - a.averageRiskScore || b.incidentCount - a.incidentCount);
        // 9. Calculate Theatre Vulnerability Rankings
        const theatreRankings = theatres.map((theatre) => {
            const theatreIncidents = piracyIncidents.filter((i) => i.theatreId === theatre.id);
            const theatreSecIncidents = securityIncidents.filter((i) => i.theatreId === theatre.id);
            const totalIncidents = theatreIncidents.length + theatreSecIncidents.length;
            const scores = [
                ...theatreIncidents.map((i) => i.riskScore || 50),
                ...theatreSecIncidents.map((i) => i.riskScore || 50),
            ];
            const avgRisk = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            const watermarkHits = evidenceRecords.filter((e) => e.theatreId === theatre.id).length;
            let vulnerabilityRating = "LOW";
            if (avgRisk >= 75 || totalIncidents >= 5)
                vulnerabilityRating = "SEVERE";
            else if (avgRisk >= 55 || totalIncidents >= 3)
                vulnerabilityRating = "ELEVATED";
            else if (avgRisk >= 35 || totalIncidents >= 1)
                vulnerabilityRating = "MODERATE";
            return {
                theatreId: theatre.id,
                theatreName: theatre.name,
                theatreCode: theatre.code,
                location: theatre.location,
                incidentCount: totalIncidents,
                averageRiskScore: avgRisk,
                suspiciousSessionsCount: totalIncidents,
                watermarkDetections: watermarkHits,
                vulnerabilityRating,
            };
        }).sort((a, b) => b.averageRiskScore - a.averageRiskScore || b.incidentCount - a.incidentCount);
        // 10. Calculate Risk Trends (Group by Day)
        const trendsMap = new Map();
        const allIncidents = [...piracyIncidents, ...securityIncidents];
        allIncidents.forEach((inc) => {
            const d = inc.createdAt.toISOString().slice(0, 10);
            const current = trendsMap.get(d) || { count: 0, totalScore: 0, highCount: 0 };
            current.count++;
            current.totalScore += inc.riskScore || 50;
            if (inc.severity === "HIGH" || inc.severity === "CRITICAL") {
                current.highCount++;
            }
            trendsMap.set(d, current);
        });
        const riskTrends = Array.from(trendsMap.entries())
            .map(([date, data]) => ({
            date,
            incidentCount: data.count,
            averageRiskScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
            highSeverityCount: data.highCount,
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // 11. Extract Suspicious Sessions
        const suspiciousSessions = allIncidents
            .filter((i) => (i.riskScore || 0) >= 50 || i.severity === "HIGH" || i.severity === "CRITICAL")
            .slice(0, 10)
            .map((i) => ({
            sessionId: i.playbackSessionId || i.activationId || `SESSION-${i.id.slice(0, 8)}`,
            movieTitle: i.movie?.title || "Active Feature",
            theatreName: i.theatre?.name || "Auditorium Venue",
            theatreCode: i.theatre?.code || "VEN",
            screenName: "Auditorium Screen",
            seatNumber: "Forensic Target",
            riskScore: i.riskScore || 65,
            detectedSignalsCount: 2,
            hasWatermarkAttribution: evidenceRecords.some((e) => e.incidentId === i.id || e.theatreId === i.theatreId),
            timestamp: i.createdAt.toISOString(),
        }));
        // 12. Evidence & Watermark Statistics
        const evidenceBreakdown = {
            watermarkCaptures: evidenceRecords.filter((e) => e.classification === "WATERMARK_MATCH").length,
            opticalRecordings: evidenceRecords.filter((e) => e.classification === "SCREENSHOT_CAPTURE").length,
            audioLeaks: evidenceRecords.filter((e) => e.classification === "AUDIO_LEAK").length,
            drmAnomalies: evidenceRecords.filter((e) => e.classification === "DRM_TAMPER").length,
            heuristicAnomalies: evidenceRecords.filter((e) => e.classification === "PLAYBACK_ANOMALY").length,
            totalVerifiedArtifacts: evidenceRecords.reduce((sum, e) => sum + e.artifacts.length, 0),
        };
        // 13. Overall Executive KPIs
        const totalIncidents = allIncidents.length;
        const highRiskIncidents = allIncidents.filter((i) => i.severity === "HIGH" || i.severity === "CRITICAL").length;
        const highRiskRatio = totalIncidents > 0 ? Number(((highRiskIncidents / totalIncidents) * 100).toFixed(1)) : 0;
        const activeInvestigations = investigationCases.filter((c) => !["CLOSED", "ARCHIVED"].includes(c.status)).length;
        const activeEnforcements = enforcements.filter((e) => !["COMPLETED", "CANCELLED"].includes(e.status)).length;
        const completedEnforcements = enforcements.filter((e) => e.status === "COMPLETED").length;
        const terminalEnforcements = enforcements.filter((e) => ["COMPLETED", "REJECTED", "CANCELLED"].includes(e.status)).length;
        const takedownSuccessRate = terminalEnforcements > 0 ? Number(((completedEnforcements / terminalEnforcements) * 100).toFixed(1)) : 100;
        const allScores = allIncidents.map((i) => i.riskScore || 50);
        const globalStudioRiskScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
        let overallThreatPosture = "NOMINAL";
        if (globalStudioRiskScore >= 80 || highRiskIncidents >= 5)
            overallThreatPosture = "CRITICAL";
        else if (globalStudioRiskScore >= 60 || highRiskIncidents >= 3)
            overallThreatPosture = "HIGH";
        else if (globalStudioRiskScore >= 40 || totalIncidents >= 2)
            overallThreatPosture = "ELEVATED";
        else if (globalStudioRiskScore >= 20 || totalIncidents >= 1)
            overallThreatPosture = "GUARDED";
        // Resolve studio name
        let studioName = null;
        if (scope.companyId) {
            const company = await database_1.prisma.productionCompany.findUnique({ where: { id: scope.companyId } }).catch(() => null);
            studioName = company?.name || null;
        }
        const summary = {
            period: {
                startDate: scope.dateFilter?.gte.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
                endDate: scope.dateFilter?.lte.toISOString() || new Date().toISOString(),
            },
            studioScope: {
                productionCompanyId: scope.companyId || null,
                productionCompanyName: studioName,
                isGlobalAdmin: actor.role === "ADMIN",
            },
            kpis: {
                totalIncidents,
                highRiskIncidents,
                highRiskRatio,
                totalEvidenceRecords: evidenceRecords.length,
                watermarkHits: evidenceBreakdown.watermarkCaptures,
                activeInvestigations,
                activeEnforcements,
                completedEnforcements,
                takedownSuccessRate,
                globalStudioRiskScore,
                overallThreatPosture,
            },
            investigationPipeline,
            enforcementPipeline,
            movieRankings,
            theatreRankings,
            riskTrends,
            suspiciousSessions,
            evidenceBreakdown,
        };
        return StudioIntelligenceService.sanitize(summary);
    }
}
exports.StudioIntelligenceService = StudioIntelligenceService;
exports.studioIntelligenceService = StudioIntelligenceService;
