"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceTrustService = void 0;
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
class DeviceTrustService {
    /**
     * Hashes a raw device fingerprint to preserve user privacy (zero raw fingerprint persistence).
     */
    static hashFingerprint(rawFingerprint) {
        return crypto_1.default.createHash("sha256").update(rawFingerprint.trim()).digest("hex");
    }
    /**
     * Lookup or initialize a device trust record using hashed fingerprint.
     */
    static async getOrCreateDevice(rawFingerprint, clientIp, deviceName) {
        const fingerprintHash = this.hashFingerprint(rawFingerprint);
        let record = await database_1.prisma.deviceTrustRecord.findUnique({
            where: { deviceFingerprintHash: fingerprintHash },
        });
        if (!record) {
            record = await database_1.prisma.deviceTrustRecord.create({
                data: {
                    deviceFingerprintHash: fingerprintHash,
                    deviceName: deviceName || "Unknown Endpoint",
                    trustStatus: client_1.DeviceTrustStatus.UNKNOWN,
                    lastSeenIp: clientIp,
                    trustScore: 50,
                    observationCount: 1,
                },
            });
        }
        else {
            // Update last seen and observation count
            record = await database_1.prisma.deviceTrustRecord.update({
                where: { id: record.id },
                data: {
                    lastSeenAt: new Date(),
                    lastSeenIp: clientIp || record.lastSeenIp,
                    observationCount: { increment: 1 },
                },
            });
        }
        let riskFactors = [];
        try {
            if (record.riskFactors) {
                riskFactors = JSON.parse(record.riskFactors);
            }
        }
        catch {
            riskFactors = [];
        }
        return {
            deviceId: record.id,
            fingerprintHash: record.deviceFingerprintHash,
            trustStatus: record.trustStatus,
            trustScore: record.trustScore,
            isBlocked: record.trustStatus === client_1.DeviceTrustStatus.BLOCKED,
            isSuspicious: record.trustStatus === client_1.DeviceTrustStatus.SUSPICIOUS,
            riskFactors,
        };
    }
    /**
     * Update device trust status (Administrator action).
     */
    static async setDeviceTrustStatus(params) {
        const updated = await database_1.prisma.deviceTrustRecord.update({
            where: { id: params.deviceId },
            data: {
                trustStatus: params.trustStatus,
                trustScore: params.trustStatus === client_1.DeviceTrustStatus.TRUSTED
                    ? 90
                    : params.trustStatus === client_1.DeviceTrustStatus.SUSPICIOUS
                        ? 30
                        : params.trustStatus === client_1.DeviceTrustStatus.BLOCKED
                            ? 0
                            : 50,
                trustRevokedAt: params.trustStatus === client_1.DeviceTrustStatus.BLOCKED || params.trustStatus === client_1.DeviceTrustStatus.SUSPICIOUS
                    ? new Date()
                    : null,
                trustRevokedReason: params.reason,
                trustGrantedBy: params.adminEmail || params.adminId,
            },
        });
        // Governance audit log
        await database_1.prisma.governanceAuditEvent.create({
            data: {
                eventType: client_1.GovernanceEventType.DEVICE_TRUST_UPDATED,
                severity: params.trustStatus === client_1.DeviceTrustStatus.BLOCKED
                    ? client_1.SecuritySeverity.HIGH
                    : client_1.SecuritySeverity.INFO,
                actorId: params.adminId,
                actorEmail: params.adminEmail,
                targetType: "DEVICE",
                targetId: params.deviceId,
                actionSummary: `Device trust status updated to ${params.trustStatus}: ${params.reason}`,
                correlationId: `DEV-${Date.now()}`,
            },
        });
        return updated;
    }
    /**
     * List all device trust records with filtering.
     */
    static async listDevices(params) {
        const where = {};
        if (params?.status) {
            where.trustStatus = params.status;
        }
        if (params?.search) {
            where.OR = [
                { deviceName: { contains: params.search, mode: "insensitive" } },
                { deviceFingerprintHash: { contains: params.search, mode: "insensitive" } },
            ];
        }
        return database_1.prisma.deviceTrustRecord.findMany({
            where,
            orderBy: { lastSeenAt: "desc" },
            take: 100,
        });
    }
}
exports.DeviceTrustService = DeviceTrustService;
