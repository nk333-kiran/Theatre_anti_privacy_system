"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocAggregationService = void 0;
const database_1 = require("@antipiracy/database");
const socMetricsService_1 = require("./socMetricsService");
class SocAggregationService {
    /**
     * Aggregate unified operational state across all Phase 10–20 security subsystems.
     */
    static async getUnifiedSummary() {
        const [metrics, activeIncidents, threatAlerts, iocMatches, pendingApprovals, activeBreakGlass, tamperingLogs,] = await Promise.all([
            socMetricsService_1.SocMetricsService.calculateMetrics(),
            database_1.prisma.securityIncident.findMany({
                where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
                orderBy: [{ severity: "desc" }, { riskScore: "desc" }],
                take: 10,
                include: { theatre: { select: { name: true } }, movie: { select: { title: true } } },
            }),
            database_1.prisma.threatAlert.findMany({
                where: { status: "ACTIVE" },
                orderBy: { detectedAt: "desc" },
                take: 5,
            }),
            database_1.prisma.threatIntelMatch.findMany({
                orderBy: { matchedAt: "desc" },
                take: 5,
                include: { indicator: true, campaign: true },
            }),
            database_1.prisma.privilegedActionRequest.findMany({
                where: { approvalStatus: "PENDING_APPROVAL" },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            database_1.prisma.breakGlassSession.findMany({
                where: { isActive: true, expiresAt: { gt: new Date() } },
                orderBy: { activatedAt: "desc" },
            }),
            database_1.prisma.securityNotification.findMany({
                where: { category: "EVIDENCE_TAMPERING" },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);
        // Calculate Global Threat Risk Score (0 - 100)
        let baseScore = 20;
        if (metrics.criticalIncidentsCount > 0)
            baseScore += Math.min(40, metrics.criticalIncidentsCount * 15);
        if (metrics.highIncidentsCount > 0)
            baseScore += Math.min(25, metrics.highIncidentsCount * 8);
        if (metrics.breakGlassActiveCount > 0)
            baseScore += 15;
        if (metrics.evidenceTamperingAlertsCount > 0)
            baseScore += 20;
        if (metrics.iocCorrelationsCount > 0)
            baseScore += Math.min(15, metrics.iocCorrelationsCount * 3);
        const globalThreatRiskScore = Math.min(100, Math.max(5, baseScore));
        let overallPosture = "OPTIMAL";
        if (globalThreatRiskScore >= 80 || metrics.criticalIncidentsCount > 0 || metrics.breakGlassActiveCount > 0) {
            overallPosture = "CRITICAL";
        }
        else if (globalThreatRiskScore >= 60 || metrics.highIncidentsCount > 0) {
            overallPosture = "ELEVATED";
        }
        else if (globalThreatRiskScore >= 40) {
            overallPosture = "GUARDED";
        }
        // Formulate explainable recommendations
        const recommendations = [];
        for (const inc of activeIncidents) {
            if (inc.severity === "CRITICAL" || inc.riskScore >= 80) {
                recommendations.push({
                    id: `REC-INC-${inc.id.substring(0, 8)}`,
                    category: "CRITICAL_INCIDENT_CONTAINMENT",
                    why: `Incident ${inc.incidentNumber} exhibits critical risk score (${inc.riskScore}/100) on active venue screening.`,
                    evidence: `Telemetry alert from source '${inc.source}' detected at ${new Date(inc.detectedAt).toLocaleTimeString()}.`,
                    risk: "High likelihood of active stream extraction or unauthorized hardware decryption.",
                    recommendedAction: "Initiate screening investigation and execute ticket activation audit.",
                    requiredApproval: "ADMIN_APPROVAL",
                    targetResource: `INCIDENT_${inc.incidentNumber}`,
                    targetResourceId: inc.id,
                });
            }
        }
        for (const match of iocMatches) {
            recommendations.push({
                id: `REC-IOC-${match.id.substring(0, 8)}`,
                category: "EXTERNAL_IOC_CORRELATION",
                why: `Observed external threat indicator '${match.indicator?.value}' correlated with internal venue stream.`,
                evidence: `Match confidence score: ${match.confidence}%. Correlated against internal security audit logs.`,
                risk: "Active leak destination known to distribution piracy networks.",
                recommendedAction: "Increase forensic watermark embedding density and verify staff checkpoint QR logs.",
                requiredApproval: "STANDARD_STAFF",
                targetResource: `INDICATOR_${match.indicatorId}`,
                targetResourceId: match.indicatorId,
            });
        }
        if (activeBreakGlass.length > 0) {
            recommendations.push({
                id: `REC-BG-${activeBreakGlass[0].id.substring(0, 8)}`,
                category: "BREAK_GLASS_COMPLIANCE",
                why: `Active Break-Glass emergency session ${activeBreakGlass[0].sessionIdentifier} is running with elevated privileges.`,
                evidence: `Session activated by ${activeBreakGlass[0].activatorEmail || activeBreakGlass[0].activatedBy} at ${new Date(activeBreakGlass[0].activatedAt).toLocaleTimeString()}.`,
                risk: "Elevated administrative authorization bypass active.",
                recommendedAction: "Prepare post-incident compliance review notes and close session upon operational recovery.",
                requiredApproval: "ADMIN_APPROVAL",
                targetResource: `BREAK_GLASS_${activeBreakGlass[0].sessionIdentifier}`,
                targetResourceId: activeBreakGlass[0].id,
            });
        }
        return {
            globalThreatRiskScore,
            overallPosture,
            metrics,
            activeIncidents,
            recentThreatAlerts: threatAlerts,
            recentIocMatches: iocMatches,
            recentEvidenceViolations: tamperingLogs,
            pendingPrivilegedApprovals: pendingApprovals,
            activeBreakGlassSessions: activeBreakGlass,
            recommendations,
        };
    }
}
exports.SocAggregationService = SocAggregationService;
