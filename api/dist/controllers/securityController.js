"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSessionToken = exports.getActiveThreats = exports.getSecurityAuditLogs = exports.getSecurityStats = void 0;
const database_1 = require("@antipiracy/database");
const threatDetector_1 = require("../services/security/threatDetector");
const tokenService_1 = require("../services/security/tokenService");
const securityAuditService_1 = require("../services/security/securityAuditService");
// GET /api/security/stats - Security Operations Center (SOC) KPI & Metrics
const getSecurityStats = async (_req, res, next) => {
    try {
        const threatMetrics = await threatDetector_1.threatDetector.getThreatMetrics();
        const [totalEvents24h, criticalEventsCount, activeRevokedTokens, uniqueThreatSources,] = await Promise.all([
            database_1.prisma.securityAuditLog.count({
                where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            }),
            database_1.prisma.securityAuditLog.count({
                where: { severity: "CRITICAL", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            }),
            database_1.prisma.revokedToken.count({
                where: { expiresAt: { gte: new Date() } },
            }),
            database_1.prisma.securityAuditLog.groupBy({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getSecurityStats = getSecurityStats;
// GET /api/security/audit-logs - Filterable Unified Audit Log Ledger
const getSecurityAuditLogs = async (req, res, next) => {
    try {
        const { eventType, severity, theatreId, isThreat, limit, offset } = req.query;
        const take = limit ? Math.min(Number(limit), 100) : 50;
        const skip = offset ? Number(offset) : 0;
        const whereClause = {};
        if (eventType)
            whereClause.eventType = eventType;
        if (severity)
            whereClause.severity = severity;
        if (theatreId)
            whereClause.theatreId = String(theatreId);
        if (isThreat !== undefined)
            whereClause.isThreat = isThreat === "true";
        const [logs, totalCount] = await Promise.all([
            database_1.prisma.securityAuditLog.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                take,
                skip,
            }),
            database_1.prisma.securityAuditLog.count({ where: whereClause }),
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
    }
    catch (error) {
        next(error);
    }
};
exports.getSecurityAuditLogs = getSecurityAuditLogs;
// GET /api/security/threats - Recent Security Threats & Anomalies
const getActiveThreats = async (_req, res, next) => {
    try {
        const threats = await database_1.prisma.securityAuditLog.findMany({
            where: { isThreat: true },
            orderBy: { createdAt: "desc" },
            take: 30,
        });
        res.status(200).json({
            success: true,
            data: threats,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveThreats = getActiveThreats;
// POST /api/security/tokens/revoke - Admin manual session revocation
const revokeSessionToken = async (req, res, next) => {
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
        await tokenService_1.TokenService.revokeToken(token, targetUserId, reason || "Manually revoked by administrator");
        await securityAuditService_1.SecurityAuditService.logEvent({
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
    }
    catch (error) {
        next(error);
    }
};
exports.revokeSessionToken = revokeSessionToken;
