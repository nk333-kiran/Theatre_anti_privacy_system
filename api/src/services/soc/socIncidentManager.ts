import { prisma } from "@antipiracy/database";
import { SecurityIncidentStatus, IncidentSeverity, IncidentSource } from "@prisma/client";
import { IncidentTimelineService } from "./incidentTimelineService";
import { SecurityWorkflowEngine } from "./securityWorkflowEngine";
import crypto from "crypto";

export interface CreateSocIncidentParams {
  title: string;
  description?: string;
  severity?: IncidentSeverity;
  source?: IncidentSource;
  theatreId?: string;
  showId?: string;
  movieId?: string;
  playbackSessionId?: string;
  riskScore?: number;
  assignedToId?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
}

export class SocIncidentManager {
  /**
   * Generate canonical INC-YYYY-XXXX incident identifier with collision avoidance.
   */
  private static async generateIncidentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const baseCount = await prisma.securityIncident.count();
    let attempt = 0;
    while (attempt < 50) {
      const seq = (baseCount + attempt + 1).toString().padStart(4, "0");
      const randSuffix = attempt > 2 ? `-${crypto.randomBytes(2).toString("hex").toUpperCase()}` : "";
      const candidate = `INC-${year}-${seq}${randSuffix}`;
      const exists = await prisma.securityIncident.findUnique({ where: { incidentNumber: candidate } });
      if (!exists) return candidate;
      attempt++;
    }
    return `INC-${year}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  }

  /**
   * Create a new security incident and trigger automated workflow evaluation.
   */
  public static async createIncident(params: CreateSocIncidentParams) {
    const incidentNumber = await this.generateIncidentNumber();
    const riskScore = params.riskScore !== undefined ? params.riskScore : 50;

    const incident = await prisma.securityIncident.create({
      data: {
        incidentNumber,
        title: params.title,
        description: params.description,
        severity: params.severity || IncidentSeverity.MEDIUM,
        status: SecurityIncidentStatus.DETECTED,
        source: params.source || IncidentSource.THREAT_ENGINE,
        theatreId: params.theatreId,
        showId: params.showId,
        movieId: params.movieId,
        playbackSessionId: params.playbackSessionId,
        riskScore,
        assignedToId: params.assignedToId,
      },
    });

    // 1. Append Timeline event
    await IncidentTimelineService.appendTimelineEvent({
      incidentId: incident.id,
      eventType: "STATUS_CHANGE",
      description: `Incident detected and logged as ${incident.incidentNumber} (${incident.severity}, risk: ${riskScore}/100)`,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      newStatus: "DETECTED",
    });

    // 2. Trigger Automated Workflows
    await SecurityWorkflowEngine.processEvent({
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
  public static async assignAnalyst(params: {
    incidentId: string;
    analystId: string;
    analystEmail?: string;
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
  }) {
    const updated = await prisma.securityIncident.update({
      where: { id: params.incidentId },
      data: {
        assignedToId: params.analystId,
        status: SecurityIncidentStatus.TRIAGED,
      },
    });

    await IncidentTimelineService.appendTimelineEvent({
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
  public static async listIncidents(params?: {
    severity?: IncidentSeverity;
    status?: SecurityIncidentStatus;
    theatreId?: string;
    movieId?: string;
    search?: string;
    take?: number;
  }) {
    const where: any = {};
    if (params?.severity) where.severity = params.severity;
    if (params?.status) where.status = params.status;
    if (params?.theatreId) where.theatreId = params.theatreId;
    if (params?.movieId) where.movieId = params.movieId;
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { incidentNumber: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return prisma.securityIncident.findMany({
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
  public static async getIncidentDetails(incidentId: string) {
    return prisma.securityIncident.findUnique({
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
