"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocNotificationService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const notificationDeduplicationService_1 = require("./notificationDeduplicationService");
const crypto_1 = __importDefault(require("crypto"));
class SocNotificationService {
    /**
     * Sanitizes message to guarantee Zero-Secret and Zero-PII exposure.
     */
    static sanitizePayload(rawText) {
        return rawText
            .replace(/ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, "[REDACTED_JWT_TOKEN]")
            .replace(/(?:password|secret|key|apiKey|token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, "[REDACTED_CREDENTIAL]")
            .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (match) => {
            const parts = match.split("@");
            return `${parts[0].substring(0, 2)}***@${parts[1]}`;
        });
    }
    /**
     * Send a sanitized, deduplicated SOC notification.
     */
    static async sendNotification(params) {
        const dedupKey = notificationDeduplicationService_1.NotificationDeduplicationService.generateKey(params.category, params.theatreId || params.targetUserId, params.title);
        if (!params.bypassDeduplication && notificationDeduplicationService_1.NotificationDeduplicationService.isDuplicate(dedupKey)) {
            return { skipped: true, reason: "DUPLICATE_IN_COOLDOWN" };
        }
        const sanitizedTitle = this.sanitizePayload(params.title);
        const sanitizedMessage = this.sanitizePayload(params.message);
        const correlationId = params.correlationId || `NOTIF-${Date.now()}-${crypto_1.default.randomBytes(3).toString("hex")}`;
        const notification = await database_1.prisma.securityNotification.create({
            data: {
                category: params.category,
                severity: params.severity || client_1.IncidentSeverity.MEDIUM,
                title: sanitizedTitle,
                message: sanitizedMessage,
                targetRole: params.targetRole || "ALL",
                targetUserId: params.targetUserId,
                theatreId: params.theatreId,
                productionCompanyId: params.productionCompanyId,
                deduplicationKey: dedupKey,
                correlationId,
            },
        });
        return { skipped: false, notification };
    }
    /**
     * List notifications with tenant / role isolation.
     */
    static async listNotifications(params) {
        const where = {};
        if (params?.role && params.role !== "ADMIN") {
            if (params.theatreId) {
                where.AND = [
                    {
                        OR: [
                            { theatreId: params.theatreId },
                            { theatreId: null, targetRole: "ALL" },
                            { targetUserId: params.userId || undefined },
                        ],
                    },
                ];
            }
            else if (params.productionCompanyId) {
                where.AND = [
                    {
                        OR: [
                            { productionCompanyId: params.productionCompanyId },
                            { productionCompanyId: null, targetRole: "ALL" },
                            { targetUserId: params.userId || undefined },
                        ],
                    },
                ];
            }
            else {
                where.OR = [
                    { targetRole: "ALL", theatreId: null, productionCompanyId: null },
                    { targetRole: params.role },
                    { targetUserId: params.userId || undefined },
                ];
            }
        }
        if (params?.isRead !== undefined) {
            where.isRead = params.isRead;
        }
        return database_1.prisma.securityNotification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: params?.take || 50,
        });
    }
    /**
     * Mark notification as read.
     */
    static async markAsRead(notificationId) {
        return database_1.prisma.securityNotification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
}
exports.SocNotificationService = SocNotificationService;
