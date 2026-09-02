"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakGlassService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const realtimeEventBus_1 = require("../realtime/realtimeEventBus");
const governanceAuditService_1 = require("./governanceAuditService");
class BreakGlassService {
    /**
     * Generate canonical BG-YYYY-XXXX session identifier.
     */
    static async generateSessionIdentifier() {
        const year = new Date().getFullYear();
        const count = await database_1.prisma.breakGlassSession.count();
        const seq = (count + 1).toString().padStart(4, "0");
        return `BG-${year}-${seq}`;
    }
    /**
     * Activate an emergency Break-Glass session.
     */
    static async startSession(params) {
        if (!params.reason || params.reason.trim().length < 10) {
            throw new Error("A comprehensive emergency justification reason (min 10 characters) is required for Break-Glass access");
        }
        const duration = Math.min(120, Math.max(5, params.durationMinutes || 60)); // 5 to 120 mins
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);
        const sessionIdentifier = await this.generateSessionIdentifier();
        const correlationId = params.correlationId || `BG-${Date.now()}`;
        const session = await database_1.prisma.breakGlassSession.create({
            data: {
                sessionIdentifier,
                activatedBy: params.activatedBy,
                activatorEmail: params.activatorEmail,
                reason: params.reason,
                isActive: true,
                expiresAt,
                postReviewRequired: true,
                postReviewCompleted: false,
                correlationId,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            },
        });
        // 1. Immutable Audit Log
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.BREAK_GLASS_ACTIVATED,
            severity: client_1.SecuritySeverity.CRITICAL,
            actorId: params.activatedBy,
            actorEmail: params.activatorEmail,
            targetType: "BREAK_GLASS",
            targetId: session.id,
            actionSummary: `BREAK-GLASS EMERGENCY ACCESS ACTIVATED: ${sessionIdentifier} (${params.reason})`,
            correlationId,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });
        // 2. Real-Time SOC Alert
        realtimeEventBus_1.realtimeEventBus.publish({
            eventType: "BREAK_GLASS_EMERGENCY_ACTIVE",
            source: "BREAK_GLASS_SERVICE",
            severity: "CRITICAL",
            metadata: {
                sessionId: session.id,
                sessionIdentifier,
                activator: params.activatorEmail || params.activatedBy,
                reason: params.reason,
                expiresAt: expiresAt.toISOString(),
            },
        });
        return session;
    }
    /**
     * Explicitly close an active Break-Glass session.
     */
    static async closeSession(params) {
        const existing = await database_1.prisma.breakGlassSession.findUnique({
            where: { id: params.sessionId },
        });
        if (!existing) {
            throw new Error("Break-Glass session not found");
        }
        const updated = await database_1.prisma.breakGlassSession.update({
            where: { id: existing.id },
            data: {
                isActive: false,
                closedAt: new Date(),
                closedBy: params.closedByEmail || params.closedBy,
            },
        });
        await governanceAuditService_1.GovernanceAuditService.logEvent({
            eventType: client_1.GovernanceEventType.BREAK_GLASS_CLOSED,
            severity: client_1.SecuritySeverity.HIGH,
            actorId: params.closedBy,
            actorEmail: params.closedByEmail,
            targetType: "BREAK_GLASS",
            targetId: existing.id,
            actionSummary: `Break-Glass session ${existing.sessionIdentifier} CLOSED by ${params.closedByEmail || params.closedBy}`,
            correlationId: existing.correlationId,
        });
        return updated;
    }
    /**
     * Submit post-incident compliance review for a Break-Glass session.
     */
    static async submitPostReview(params) {
        const existing = await database_1.prisma.breakGlassSession.findUnique({
            where: { id: params.sessionId },
        });
        if (!existing) {
            throw new Error("Break-Glass session not found");
        }
        const updated = await database_1.prisma.breakGlassSession.update({
            where: { id: existing.id },
            data: {
                postReviewCompleted: true,
                postReviewCompletedAt: new Date(),
                postReviewCompletedBy: params.reviewerEmail || params.reviewerId,
                postReviewNotes: params.reviewNotes,
            },
        });
        return updated;
    }
    /**
     * Scan and expire outdated active sessions.
     */
    static async evaluateExpirations() {
        const now = new Date();
        const expiredSessions = await database_1.prisma.breakGlassSession.findMany({
            where: {
                isActive: true,
                expiresAt: { lte: now },
            },
        });
        for (const s of expiredSessions) {
            await database_1.prisma.breakGlassSession.update({
                where: { id: s.id },
                data: {
                    isActive: false,
                    closedAt: now,
                    closedBy: "SYSTEM_EXPIRATION",
                },
            });
            await governanceAuditService_1.GovernanceAuditService.logEvent({
                eventType: client_1.GovernanceEventType.BREAK_GLASS_EXPIRED,
                severity: client_1.SecuritySeverity.MEDIUM,
                targetType: "BREAK_GLASS",
                targetId: s.id,
                actionSummary: `Break-Glass session ${s.sessionIdentifier} automatically expired`,
                correlationId: s.correlationId,
            });
        }
        return { expiredCount: expiredSessions.length };
    }
    /**
     * Check if user has an active, unexpired Break-Glass session.
     */
    static async hasActiveSession(userId) {
        const active = await database_1.prisma.breakGlassSession.findFirst({
            where: {
                activatedBy: userId,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
        });
        return !!active;
    }
    /**
     * List Break-Glass sessions.
     */
    static async listSessions(params) {
        const where = {};
        if (params?.isActive !== undefined) {
            where.isActive = params.isActive;
        }
        return database_1.prisma.breakGlassSession.findMany({
            where,
            orderBy: { activatedAt: "desc" },
            take: 50,
        });
    }
}
exports.BreakGlassService = BreakGlassService;
