import { prisma } from "@antipiracy/database";
import { IntelligenceFeedItem } from "./types";

export class IntelligenceFeedService {
  /**
   * Returns normalized threat intelligence overview
   */
  public async getOverview() {
    const [
      totalIncidents,
      criticalCount,
      highCount,
      suspiciousSessionsCount,
      drmAnomaliesCount,
      recentIncidents,
    ] = await Promise.all([
      prisma.threatIntelligenceIncident.count(),
      prisma.threatIntelligenceIncident.count({ where: { severity: "CRITICAL", status: { not: "CLOSED" } } }),
      prisma.threatIntelligenceIncident.count({ where: { severity: "HIGH", status: { not: "CLOSED" } } }),
      prisma.playbackSession.count({ where: { status: { in: ["TERMINATED", "DENIED"] } } }),
      prisma.drmLicense.count({ where: { status: "REVOKED" } }),
      prisma.threatIntelligenceIncident.findMany({
        take: 20,
        orderBy: { lastDetectedAt: "desc" },
        include: {
          theatre: { select: { name: true } },
          show: { select: { movie: { select: { title: true } } } },
          signals: true,
          actions: true,
        },
      }),
    ]);

    // Calculate Threat Posture: NORMAL | GUARDED | ELEVATED | HIGH | CRITICAL
    let threatPosture: "NORMAL" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL" = "NORMAL";
    if (criticalCount > 0) threatPosture = "CRITICAL";
    else if (highCount >= 2) threatPosture = "HIGH";
    else if (highCount === 1 || suspiciousSessionsCount > 3) threatPosture = "ELEVATED";
    else if (totalIncidents > 0) threatPosture = "GUARDED";

    // Risk distribution calculation
    const allIncidents = await prisma.threatIntelligenceIncident.findMany({
      select: { riskScore: true },
    });

    const riskDistribution = {
      "0-20": allIncidents.filter((i) => i.riskScore <= 20).length,
      "21-40": allIncidents.filter((i) => i.riskScore > 20 && i.riskScore <= 40).length,
      "41-60": allIncidents.filter((i) => i.riskScore > 40 && i.riskScore <= 60).length,
      "61-80": allIncidents.filter((i) => i.riskScore > 60 && i.riskScore <= 80).length,
      "81-100": allIncidents.filter((i) => i.riskScore > 80).length,
    };

    const normalizedFeed: IntelligenceFeedItem[] = recentIncidents.map((inc) => ({
      incidentId: inc.id,
      incidentCode: inc.incidentCode,
      title: inc.title,
      severity: inc.severity,
      riskScore: inc.riskScore,
      confidenceScore: inc.confidenceScore,
      status: inc.status,
      theatreId: inc.theatreId,
      theatreName: inc.theatre?.name,
      showId: inc.showId,
      movieTitle: inc.show?.movie?.title,
      signalCount: inc.signals.length,
      recommendedAction: inc.actions[0]?.actionType || "FLAG_SESSION",
      explanations: inc.signals.map((s) => s.signalValue),
      firstDetectedAt: inc.firstDetectedAt.toISOString(),
      lastDetectedAt: inc.lastDetectedAt.toISOString(),
    }));

    return {
      threatPosture,
      kpis: {
        activeIncidents: totalIncidents,
        criticalThreats: criticalCount,
        highThreats: highCount,
        suspiciousSessions: suspiciousSessionsCount,
        drmAnomalies: drmAnomaliesCount,
        correlatedSignals: recentIncidents.reduce((acc, inc) => acc + inc.signals.length, 0),
      },
      riskDistribution,
      feed: normalizedFeed,
    };
  }
}

export const intelligenceFeedService = new IntelligenceFeedService();
