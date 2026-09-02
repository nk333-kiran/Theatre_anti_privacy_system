"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocIncidentManager = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const incidentTimelineService_1 = require("./incidentTimelineService");
const securityWorkflowEngine_1 = require("./securityWorkflowEngine");
class SocIncidentManager {
    /**
     * Generate canonical INC-YYYY-XXXX incident identifier.
     */
    static async generateIncidentNumber() {
        const year = new Date().getFullYear();
        const count = await database_1.prisma.securityIncident.count();
        const seq = (count + 1).toString().padStart(4, "0");
        return `INC-${year}-${seq}`;
    }
    /**
     * Create a new security incident and trigger automated workflow evaluation.
     */
    static async createIncident(params) {
        const incidentNumber = await this.generateIncidentNumber();
        const riskScore = params.riskScore !== undefined ? params.riskScore : 50;
        const incident = await database_1.prisma.securityIncident.create({
            data: {
                incidentNumber,
                title: params.title,
                description: params.description,
                severity: params.severity || client_1.IncidentSeverity.MEDIUM,
                status: client_1.SecurityIncidentStatus.DETECTED,
                source: params.source || client_1.IncidentSource.THREAT_ENGINE,
                theatreId: params.theatreId,
                showId: params.showId,
                movieId: params.movieId,
                playbackSessionId: params.playbackSessionId,
                riskScore,
                assignedToId: params.assignedToId,
            },
        });
        // 1. Append Timeline event
        await incidentTimelineService_1.IncidentTimelineService.appendTimelineEvent({
            incidentId: incident.id,
            eventType: "STATUS_CHANGE",
            description: `Incident detected and logged as ${incident.incidentNumber} (${incident.severity}, risk: ${riskScore}/100)`,
            actorId: params.actorId,
            actorEmail: params.actorEmail,
            actorRole: params.actorRole,
            newStatus: "DETECTED",
        });
        // 2. Trigger Automated Workflows
        await securityWorkflowEngine_1.SecurityWorkflowEngine.processEvent({
            triggerType: "THREAT_RISK_THRESHOLD",
            incidentId: incident.id,
            theatreId: params.theatreId,
            movieId: params.movieId,
            riskScore,
            reason: params.title,
            actorId: params.actorId,
            actorEmail: params.actorEmail,
        });
        return incident;
    }
    /**
     * Assign an incident to a security analyst.
     */
    static async assignAnalyst(params) {
        const updated = await database_1.prisma.securityIncident.update({
            where: { id: params.incidentId },
            data: {
                assignedToId: params.analystId,
                status: client_1.SecurityIncidentStatus.TRIAGED,
            },
        });
        await incidentTimelineService_1.IncidentTimelineService.appendTimelineEvent({
            incidentId: params.incidentId,
            eventType: "ANALYST_ASSIGNED",
            description: `Assigned to analyst ${params.analystEmail || params.analystId}`,
            actorId: params.actorId,
            actorEmail: params.actorEmail,
            actorRole: params.actorRole,
            newStatus: "TRIAGED",
        });
        return updated;
    }
    /**
     * List incidents with filters and pagination.
     */
    static async listIncidents(params) {
        const where = {};
        if (params?.severity)
            where.severity = params.severity;
        if (params?.status)
            where.status = params.status;
        if (params?.theatreId)
            where.theatreId = params.theatreId;
        if (params?.movieId)
            where.movieId = params.movieId;
        if (params?.search) {
            where.OR = [
                { title: { contains: params.search, mode: "insensitive" } },
                { incidentNumber: { contains: params.search, mode: "insensitive" } },
            ];
        }
        return database_1.prisma.securityIncident.findMany({
            where,
            orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
            take: params?.take || 50,
            include: {
                theatre: { select: { name: true, code: true } },
                movie: { select: { title: true } },
                assignedTo: { select: { name: true, email: true } },
            },
        });
    }
    /**
     * Get full details of an incident including timeline and escalations.
     */
    static async getIncidentDetails(incidentId) {
        return database_1.prisma.securityIncident.findUnique({
            where: { id: incidentId },
            include: {
                theatre: true,
                movie: true,
                show: true,
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                timeline: { orderBy: { timestamp: "asc" } },
                escalations: { orderBy: { createdAt: "desc" } },
                actions: { orderBy: { createdAt: "desc" } },
                evidenceItems: true,
            },
        });
    }
}
exports.SocIncidentManager = SocIncidentManager;
