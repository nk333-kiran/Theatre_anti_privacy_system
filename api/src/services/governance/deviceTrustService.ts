import { prisma } from "@antipiracy/database";
import { DeviceTrustStatus, SecuritySeverity, GovernanceEventType } from "@prisma/client";
import crypto from "crypto";

export interface DeviceAssessmentResult {
  deviceId: string;
  fingerprintHash: string;
  trustStatus: DeviceTrustStatus;
  trustScore: number;
  isBlocked: boolean;
  isSuspicious: boolean;
  riskFactors: string[];
}

export class DeviceTrustService {
  /**
   * Hashes a raw device fingerprint to preserve user privacy (zero raw fingerprint persistence).
   */
  public static hashFingerprint(rawFingerprint: string): string {
    return crypto.createHash("sha256").update(rawFingerprint.trim()).digest("hex");
  }

  /**
   * Lookup or initialize a device trust record using hashed fingerprint.
   */
  public static async getOrCreateDevice(
    rawFingerprint: string,
    clientIp?: string,
    deviceName?: string
  ): Promise<DeviceAssessmentResult> {
    const fingerprintHash = this.hashFingerprint(rawFingerprint);

    let record = await prisma.deviceTrustRecord.findUnique({
      where: { deviceFingerprintHash: fingerprintHash },
    });

    if (!record) {
      record = await prisma.deviceTrustRecord.create({
        data: {
          deviceFingerprintHash: fingerprintHash,
          deviceName: deviceName || "Unknown Endpoint",
          trustStatus: DeviceTrustStatus.UNKNOWN,
          lastSeenIp: clientIp,
          trustScore: 50,
          observationCount: 1,
        },
      });
    } else {
      // Update last seen and observation count
      record = await prisma.deviceTrustRecord.update({
        where: { id: record.id },
        data: {
          lastSeenAt: new Date(),
          lastSeenIp: clientIp || record.lastSeenIp,
          observationCount: { increment: 1 },
        },
      });
    }

    let riskFactors: string[] = [];
    try {
      if (record.riskFactors) {
        riskFactors = JSON.parse(record.riskFactors);
      }
    } catch {
      riskFactors = [];
    }

    return {
      deviceId: record.id,
      fingerprintHash: record.deviceFingerprintHash,
      trustStatus: record.trustStatus,
      trustScore: record.trustScore,
      isBlocked: record.trustStatus === DeviceTrustStatus.BLOCKED,
      isSuspicious: record.trustStatus === DeviceTrustStatus.SUSPICIOUS,
      riskFactors,
    };
  }

  /**
   * Update device trust status (Administrator action).
   */
  public static async setDeviceTrustStatus(params: {
    deviceId: string;
    trustStatus: DeviceTrustStatus;
    reason: string;
    adminId: string;
    adminEmail?: string;
  }) {
    const updated = await prisma.deviceTrustRecord.update({
      where: { id: params.deviceId },
      data: {
        trustStatus: params.trustStatus,
        trustScore:
          params.trustStatus === DeviceTrustStatus.TRUSTED
            ? 90
            : params.trustStatus === DeviceTrustStatus.SUSPICIOUS
            ? 30
            : params.trustStatus === DeviceTrustStatus.BLOCKED
            ? 0
            : 50,
        trustRevokedAt:
          params.trustStatus === DeviceTrustStatus.BLOCKED || params.trustStatus === DeviceTrustStatus.SUSPICIOUS
            ? new Date()
            : null,
        trustRevokedReason: params.reason,
        trustGrantedBy: params.adminEmail || params.adminId,
      },
    });

    // Governance audit log
    await prisma.governanceAuditEvent.create({
      data: {
        eventType: GovernanceEventType.DEVICE_TRUST_UPDATED,
        severity:
          params.trustStatus === DeviceTrustStatus.BLOCKED
            ? SecuritySeverity.HIGH
            : SecuritySeverity.INFO,
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
  public static async listDevices(params?: {
    status?: DeviceTrustStatus;
    search?: string;
  }) {
    const where: any = {};
    if (params?.status) {
      where.trustStatus = params.status;
    }
    if (params?.search) {
      where.OR = [
        { deviceName: { contains: params.search, mode: "insensitive" } },
        { deviceFingerprintHash: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return prisma.deviceTrustRecord.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      take: 100,
    });
  }
}
