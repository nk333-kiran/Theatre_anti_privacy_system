import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma, DeviceStatus } from "@antipiracy/database";
import { ApiResponse } from "../types";
import { AppError } from "../middleware/errorHandler";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { logger } from "../services/logging/logger";

/**
 * GET /api/devices
 * List theatre playback devices with filters
 */
export const listPlaybackDevices = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { theatreId, status, limit, offset } = req.query;

    const where: any = {};
    if (theatreId) where.theatreId = String(theatreId);
    if (status && Object.values(DeviceStatus).includes(status as DeviceStatus)) {
      where.status = status as DeviceStatus;
    }

    const take = limit ? Math.min(parseInt(String(limit), 10), 100) : 50;
    const skip = offset ? parseInt(String(offset), 10) : 0;

    const [devices, totalCount] = await Promise.all([
      prisma.playbackDevice.findMany({
        where,
        take,
        skip,
        orderBy: { registeredAt: "desc" },
        include: {
          theatre: { select: { id: true, name: true, code: true, location: true } },
          screen: { select: { id: true, screenNumber: true, name: true } },
        },
      }),
      prisma.playbackDevice.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: { devices, totalCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/devices/:id
 */
export const getPlaybackDeviceDetails = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const device = await prisma.playbackDevice.findFirst({
      where: {
        OR: [{ id }, { deviceId: id }],
      },
      include: {
        theatre: true,
        screen: true,
      },
    });

    if (!device) {
      throw new AppError(`PlaybackDevice ${id} not found`, 404, "DEVICE_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/devices/register
 */
export const registerPlaybackDevice = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, theatreId, screenId, softwareVersion, deviceFingerprint, ipAddress } = req.body;
    const actorUser = (req as any).user;

    const deviceId = `DEV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const device = await prisma.playbackDevice.create({
      data: {
        deviceId,
        name: name || "Auditorium Projector Terminal",
        status: "REGISTERED",
        theatreId,
        screenId,
        softwareVersion: softwareVersion || "2.4.0",
        deviceFingerprint,
        ipAddress,
        lastHeartbeatAt: new Date(),
      },
      include: {
        theatre: true,
        screen: true,
      },
    });

    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: "INFO",
      userId: actorUser?.id,
      actorEmail: actorUser?.email,
      theatreId,
      actionSummary: `Registered Playback Device ${device.deviceId} for Screen ${device.screen?.screenNumber || "1"}`,
    });

    res.status(201).json({
      success: true,
      message: `Playback Device ${device.deviceId} registered successfully.`,
      data: device,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/devices/:id/heartbeat
 */
export const recordDeviceHeartbeat = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { softwareVersion, ipAddress } = req.body;

    const device = await prisma.playbackDevice.findFirst({
      where: { OR: [{ id }, { deviceId: id }] },
    });

    if (!device) {
      throw new AppError(`Device ${id} not found`, 404, "DEVICE_NOT_FOUND");
    }

    if (device.status === "BLOCKED") {
      throw new AppError(`Device ${device.deviceId} is BLOCKED`, 403, "DEVICE_BLOCKED");
    }

    const updated = await prisma.playbackDevice.update({
      where: { id: device.id },
      data: {
        status: "ACTIVE",
        lastHeartbeatAt: new Date(),
        softwareVersion: softwareVersion || device.softwareVersion,
        ipAddress: ipAddress || device.ipAddress,
      },
    });

    res.status(200).json({
      success: true,
      message: "Device heartbeat recorded.",
      data: {
        deviceId: updated.deviceId,
        status: updated.status,
        lastHeartbeatAt: updated.lastHeartbeatAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/devices/:id/block
 */
export const blockPlaybackDevice = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const actorUser = (req as any).user;

    const device = await prisma.playbackDevice.findFirst({
      where: { OR: [{ id }, { deviceId: id }] },
    });

    if (!device) throw new AppError(`Device ${id} not found`, 404, "NOT_FOUND");

    const updated = await prisma.playbackDevice.update({
      where: { id: device.id },
      data: { status: "BLOCKED" },
    });

    await SecurityAuditService.logEvent({
      eventType: "SUSPICIOUS_ACTIVITY",
      severity: "CRITICAL",
      userId: actorUser?.id,
      theatreId: device.theatreId,
      actionSummary: `BLOCKED Playback Device ${device.deviceId}`,
      isThreat: true,
    });

    res.status(200).json({
      success: true,
      message: `Playback Device ${device.deviceId} BLOCKED.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/devices/:id/retire
 */
export const retirePlaybackDevice = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const device = await prisma.playbackDevice.findFirst({
      where: { OR: [{ id }, { deviceId: id }] },
    });

    if (!device) throw new AppError(`Device ${id} not found`, 404, "NOT_FOUND");

    const updated = await prisma.playbackDevice.update({
      where: { id: device.id },
      data: { status: "RETIRED" },
    });

    res.status(200).json({
      success: true,
      message: `Playback Device ${device.deviceId} RETIRED.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
