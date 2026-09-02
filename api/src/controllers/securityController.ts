import { Request, Response, NextFunction } from "express";
import { prisma, SecurityEventType, SecuritySeverity } from "@antipiracy/database";
import { threatDetector } from "../services/security/threatDetector";
import { TokenService } from "../services/security/tokenService";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { ApiResponse, AuthenticatedRequest } from "../types";

// GET /api/security/stats - Security Operations Center (SOC) KPI & Metrics
export const getSecurityStats = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const threatMetrics = await threatDetector.getThreatMetrics();

    const [
      totalEvents24h,
      criticalEventsCount,
      activeRevokedTokens,
      uniqueThreatSources,
    ] = await Promise.all([
      prisma.securityAuditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.securityAuditLog.count({
        where: { severity: "CRITICAL", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.revokedToken.count({
        where: { expiresAt: { gte: new Date() } },
      }),
      prisma.securityAuditLog.groupBy({
        by: ["ipAddress"],
        where: { isThreat: true, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...threatMetrics,
        totalEvents24h,
        criticalEventsCount,
        activeRevokedTokens,
        uniqueThreatSources24h: uniqueThreatSources.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/security/audit-logs - Filterable Unified Audit Log Ledger
export const getSecurityAuditLogs = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventType, severity, theatreId, isThreat, limit, offset } = req.query;

    const take = limit ? Math.min(Number(limit), 100) : 50;
    const skip = offset ? Number(offset) : 0;

    const whereClause: any = {};
    if (eventType) whereClause.eventType = eventType as SecurityEventType;
    if (severity) whereClause.severity = severity as SecuritySeverity;
    if (theatreId) whereClause.theatreId = String(theatreId);
    if (isThreat !== undefined) whereClause.isThreat = isThreat === "true";

    const [logs, totalCount] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.securityAuditLog.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        totalCount,
        limit: take,
        offset: skip,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/security/threats - Recent Security Threats & Anomalies
export const getActiveThreats = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const threats = await prisma.securityAuditLog.findMany({
      where: { isThreat: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    res.status(200).json({
      success: true,
      data: threats,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/security/tokens/revoke - Admin manual session revocation
export const revokeSessionToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, targetUserId, reason } = req.body;

    if (!token || !targetUserId) {
      res.status(400).json({
        success: false,
        message: "Token string and targetUserId are required",
        errorCode: "MISSING_PARAMS",
      });
      return;
    }

    await TokenService.revokeToken(token, targetUserId, reason || "Manually revoked by administrator");

    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: "MEDIUM",
      userId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      actionSummary: `Admin ${req.user?.email} manually revoked session token for user ID ${targetUserId}`,
    });

    res.status(200).json({
      success: true,
      message: "Session token successfully blacklisted and revoked",
    });
  } catch (error) {
    next(error);
  }
};
