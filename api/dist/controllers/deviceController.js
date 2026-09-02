"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retirePlaybackDevice = exports.blockPlaybackDevice = exports.recordDeviceHeartbeat = exports.registerPlaybackDevice = exports.getPlaybackDeviceDetails = exports.listPlaybackDevices = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../middleware/errorHandler");
const securityAuditService_1 = require("../services/security/securityAuditService");
/**
 * GET /api/devices
 * List theatre playback devices with filters
 */
const listPlaybackDevices = async (req, res, next) => {
    try {
        const { theatreId, status, limit, offset } = req.query;
        const where = {};
        if (theatreId)
            where.theatreId = String(theatreId);
        if (status && Object.values(database_1.DeviceStatus).includes(status)) {
            where.status = status;
        }
        const take = limit ? Math.min(parseInt(String(limit), 10), 100) : 50;
        const skip = offset ? parseInt(String(offset), 10) : 0;
        const [devices, totalCount] = await Promise.all([
            database_1.prisma.playbackDevice.findMany({
                where,
                take,
                skip,
                orderBy: { registeredAt: "desc" },
                include: {
                    theatre: { select: { id: true, name: true, code: true, location: true } },
                    screen: { select: { id: true, screenNumber: true, name: true } },
                },
            }),
            database_1.prisma.playbackDevice.count({ where }),
        ]);
        res.status(200).json({
            success: true,
            data: { devices, totalCount },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listPlaybackDevices = listPlaybackDevices;
/**
 * GET /api/devices/:id
 */
const getPlaybackDeviceDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const device = await database_1.prisma.playbackDevice.findFirst({
            where: {
                OR: [{ id }, { deviceId: id }],
            },
            include: {
                theatre: true,
                screen: true,
            },
        });
        if (!device) {
            throw new errorHandler_1.AppError(`PlaybackDevice ${id} not found`, 404, "DEVICE_NOT_FOUND");
        }
        res.status(200).json({
            success: true,
            data: device,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPlaybackDeviceDetails = getPlaybackDeviceDetails;
/**
 * POST /api/devices/register
 */
const registerPlaybackDevice = async (req, res, next) => {
    try {
        const { name, theatreId, screenId, softwareVersion, deviceFingerprint, ipAddress } = req.body;
        const actorUser = req.user;
        const deviceId = `DEV-${Date.now().toString(36).toUpperCase()}-${crypto_1.default.randomBytes(2).toString("hex").toUpperCase()}`;
        const device = await database_1.prisma.playbackDevice.create({
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
        await securityAuditService_1.SecurityAuditService.logEvent({
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
    }
    catch (error) {
        next(error);
    }
};
exports.registerPlaybackDevice = registerPlaybackDevice;
/**
 * POST /api/devices/:id/heartbeat
 */
const recordDeviceHeartbeat = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { softwareVersion, ipAddress } = req.body;
        const device = await database_1.prisma.playbackDevice.findFirst({
            where: { OR: [{ id }, { deviceId: id }] },
        });
        if (!device) {
            throw new errorHandler_1.AppError(`Device ${id} not found`, 404, "DEVICE_NOT_FOUND");
        }
        if (device.status === "BLOCKED") {
            throw new errorHandler_1.AppError(`Device ${device.deviceId} is BLOCKED`, 403, "DEVICE_BLOCKED");
        }
        const updated = await database_1.prisma.playbackDevice.update({
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
    }
    catch (error) {
        next(error);
    }
};
exports.recordDeviceHeartbeat = recordDeviceHeartbeat;
/**
 * POST /api/devices/:id/block
 */
const blockPlaybackDevice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const actorUser = req.user;
        const device = await database_1.prisma.playbackDevice.findFirst({
            where: { OR: [{ id }, { deviceId: id }] },
        });
        if (!device)
            throw new errorHandler_1.AppError(`Device ${id} not found`, 404, "NOT_FOUND");
        const updated = await database_1.prisma.playbackDevice.update({
            where: { id: device.id },
            data: { status: "BLOCKED" },
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
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
    }
    catch (error) {
        next(error);
    }
};
exports.blockPlaybackDevice = blockPlaybackDevice;
/**
 * POST /api/devices/:id/retire
 */
const retirePlaybackDevice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const device = await database_1.prisma.playbackDevice.findFirst({
            where: { OR: [{ id }, { deviceId: id }] },
        });
        if (!device)
            throw new errorHandler_1.AppError(`Device ${id} not found`, 404, "NOT_FOUND");
        const updated = await database_1.prisma.playbackDevice.update({
            where: { id: device.id },
            data: { status: "RETIRED" },
        });
        res.status(200).json({
            success: true,
            message: `Playback Device ${device.deviceId} RETIRED.`,
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.retirePlaybackDevice = retirePlaybackDevice;
