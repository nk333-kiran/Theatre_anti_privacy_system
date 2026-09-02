import { Request, Response, NextFunction } from "express";
import path from "path";
import { prisma, DrmProviderType, DrmStatus, DrmLicenseStatus } from "@antipiracy/database";
import { activeDrmProvider, drmServiceManager } from "../services/drm/drmManager";
import { storageManager } from "../services/storage/localStorage";
import { ApiResponse, AuthenticatedUser } from "../types";
import { AppError } from "../middleware/errorHandler";

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// GET /api/drm/status - Safe DRM provider & engine health
export const getDrmStatus = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const status = await drmServiceManager.getSafeStatus();
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/drm/assets/:assetId/prepare - Prepare DRM packaging for a processed HLS asset
export const prepareAssetDrm = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { assetId } = req.params;
    const user = req.user;

    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const videoAsset = await prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        movie: true,
        productionCompany: true,
        drmAsset: true,
      },
    });

    if (!videoAsset) {
      throw new AppError("Video asset not found", 404, "ASSET_NOT_FOUND");
    }

    // Studio RBAC Check
    if (
      user.role === "PRODUCTION_COMPANY" &&
      user.productionCompanyId &&
      videoAsset.productionCompanyId !== user.productionCompanyId
    ) {
      throw new AppError("You do not own this video asset", 403, "FORBIDDEN");
    }

    if (videoAsset.processingStatus !== "READY") {
      throw new AppError(
        `Video asset is in "${videoAsset.processingStatus}" state. DRM preparation requires a READY HLS asset.`,
        400,
        "ASSET_NOT_READY"
      );
    }

    const outputDir = storageManager.getAssetProcessedDir(videoAsset.id);
    const inputManifestPath = videoAsset.hlsMasterManifestPath
      ? path.resolve(process.cwd(), videoAsset.hlsMasterManifestPath)
      : path.join(outputDir, "master.m3u8");

    // Execute DRM packaging via active provider
    const drmResult = await activeDrmProvider.prepareDrmAsset({
      assetId: videoAsset.id,
      movieTitle: videoAsset.movie.title,
      movieId: videoAsset.movieId,
      streamKey: videoAsset.streamKey,
      inputManifestPath,
      outputDir,
    });

    const providerEnum = drmResult.provider.toUpperCase() as DrmProviderType;

    // Upsert DrmAsset record in PostgreSQL
    const drmAsset = await prisma.drmAsset.upsert({
      where: { videoAssetId: videoAsset.id },
      create: {
        videoAssetId: videoAsset.id,
        provider: providerEnum,
        drmScheme: drmResult.scheme,
        keyId: drmResult.keyId,
        encryptedManifestUrl: drmResult.encryptedManifestUrl,
        licenseServerUrl: drmResult.licenseServerUrl,
        status: "READY",
        statusMessage: "DRM packaging configured and ready for theatrical license authorization.",
        encryptionProgress: 100,
        metadata: JSON.stringify(drmResult.metadata),
      },
      update: {
        provider: providerEnum,
        drmScheme: drmResult.scheme,
        keyId: drmResult.keyId,
        encryptedManifestUrl: drmResult.encryptedManifestUrl,
        licenseServerUrl: drmResult.licenseServerUrl,
        status: "READY",
        statusMessage: "DRM packaging updated and active.",
        encryptionProgress: 100,
        metadata: JSON.stringify(drmResult.metadata),
      },
    });

    // Update VideoAsset DRM Scheme
    await prisma.videoAsset.update({
      where: { id: videoAsset.id },
      data: { drmScheme: drmResult.scheme },
    });

    res.status(200).json({
      success: true,
      message: "DRM asset prepared and ready for secure playback licensing",
      data: {
        id: drmAsset.id,
        videoAssetId: drmAsset.videoAssetId,
        provider: drmAsset.provider,
        drmScheme: drmAsset.drmScheme,
        keyId: drmAsset.keyId,
        status: drmAsset.status,
        licenseServerUrl: drmAsset.licenseServerUrl,
        createdAt: drmAsset.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/drm/assets/:assetId/status - Status of DRM packaging
export const getAssetDrmStatus = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { assetId } = req.params;

    const drmAsset = await prisma.drmAsset.findUnique({
      where: { videoAssetId: assetId },
      include: {
        videoAsset: { select: { title: true, movieId: true } },
      },
    });

    if (!drmAsset) {
      res.status(200).json({
        success: true,
        data: {
          configured: false,
          status: "NOT_CONFIGURED",
          statusMessage: "DRM has not been configured for this video asset.",
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        configured: true,
        id: drmAsset.id,
        videoAssetId: drmAsset.videoAssetId,
        provider: drmAsset.provider,
        drmScheme: drmAsset.drmScheme,
        keyId: drmAsset.keyId,
        status: drmAsset.status,
        statusMessage: drmAsset.statusMessage,
        licenseServerUrl: drmAsset.licenseServerUrl,
        updatedAt: drmAsset.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/drm/assets/:assetId/revoke - Revoke DRM asset and associated licenses
export const revokeAssetDrm = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { assetId } = req.params;
    const { reason } = req.body;

    const drmAsset = await prisma.drmAsset.findUnique({
      where: { videoAssetId: assetId },
    });

    if (drmAsset) {
      await prisma.drmAsset.update({
        where: { id: drmAsset.id },
        data: {
          status: "REVOKED",
          statusMessage: reason || "Revoked by studio administrator",
        },
      });

      // Invalidate all active licenses for this DRM asset
      await prisma.drmLicense.updateMany({
        where: { drmAssetId: drmAsset.id, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revocationReason: reason || "Asset DRM revoked",
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "DRM asset and all associated licenses revoked",
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/drm/license - 10-Point Validated Protected DRM License Request
export const requestDrmLicense = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionToken, keyId, challenge } = req.body;

    if (!sessionToken) {
      throw new AppError("Playback sessionToken is required for DRM licensing", 400, "MISSING_SESSION_TOKEN");
    }

    const now = new Date();
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = (req.headers["user-agent"] as string) || "theatre-drm-player";

    // 1. Resolve & Validate PlaybackSession
    const session = await prisma.playbackSession.findUnique({
      where: { sessionToken },
      include: {
        activation: {
          include: {
            ticket: {
              include: {
                show: {
                  include: {
                    movie: true,
                    theatre: true,
                  },
                },
              },
            },
          },
        },
        videoAsset: {
          include: {
            drmAsset: true,
          },
        },
        theatre: true,
        show: true,
      },
    });

    // Helper for logging DRM License Denial
    const denyAndFail = async (reason: string, errorCode: string, statusCode = 403) => {
      if (session) {
        await prisma.protectionEvent.create({
          data: {
            activationId: session.activationId,
            theatreId: session.theatreId,
            showId: session.showId,
            eventType: "DRM_LICENSE_DENIED",
            metadata: JSON.stringify({ reason, errorCode, sessionToken }),
            ipAddress: clientIp,
            userAgent,
          },
        });
      }
      throw new AppError(reason, statusCode, errorCode);
    };

    if (!session) {
      throw new AppError("Invalid or unrecognized playback session token", 404, "SESSION_NOT_FOUND");
    }

    // 2. Validate Activation Status
    if (session.activation.status !== "ACTIVE") {
      await denyAndFail(`Activation is not active (${session.activation.status})`, "ACTIVATION_NOT_ACTIVE");
    }

    // 3. Validate Activation Expiry
    if (session.activation.expiresAt && now > new Date(session.activation.expiresAt)) {
      await denyAndFail("Activation session has expired", "ACTIVATION_EXPIRED");
    }

    // 4. Validate Ticket Status
    if (session.activation.ticket.status === "CANCELLED") {
      await denyAndFail("Ticket has been cancelled", "TICKET_CANCELLED");
    }

    // 5. Validate Show Status
    if (session.show.status === "CANCELLED") {
      await denyAndFail("Show screening has been cancelled", "SHOW_CANCELLED");
    }

    // 6. Validate PlaybackSession Expiry
    if (session.status === "TERMINATED" || session.status === "EXPIRED" || now > new Date(session.expiresAt)) {
      await denyAndFail("Playback authorization session has expired or terminated", "PLAYBACK_SESSION_EXPIRED");
    }

    // 7. Validate VideoAsset State
    if (session.videoAsset.state === "BLOCKED" || session.videoAsset.state === "ARCHIVED") {
      await denyAndFail("Video stream asset is locked or archived", "ASSET_BLOCKED");
    }

    // 8. Validate DRM Asset Readiness
    const drmAsset = session.videoAsset.drmAsset;
    if (!drmAsset || drmAsset.status === "REVOKED") {
      await denyAndFail("DRM license configuration is revoked or unavailable for this movie", "DRM_NOT_READY");
      return;
    }

    // 9. Issue DRM License via Active Provider
    const resolvedKeyId = keyId || drmAsset.keyId;
    const licenseResult = await activeDrmProvider.issueLicense({
      keyId: resolvedKeyId,
      activationId: session.activationId,
      playbackToken: session.sessionToken,
      ticketNumber: session.activation.ticket.ticketNumber,
      seatNumber: session.activation.ticket.seatNumber,
      theatreCode: session.theatre.code,
      showId: session.showId,
      clientIp,
      userAgent,
      challenge,
    });

    // 10. Record DrmLicense in PostgreSQL
    const drmLicense = await prisma.drmLicense.create({
      data: {
        drmAssetId: drmAsset.id,
        playbackSessionId: session.id,
        activationId: session.activationId,
        theatreId: session.theatreId,
        showId: session.showId,
        licenseToken: licenseResult.licenseToken,
        status: "ACTIVE",
        expiresAt: licenseResult.expiresAt,
        clientIp,
        userAgent,
      },
    });

    // 11. Log DRM_LICENSE_AUTHORIZED Protection Event
    await prisma.protectionEvent.create({
      data: {
        activationId: session.activationId,
        theatreId: session.theatreId,
        showId: session.showId,
        eventType: "DRM_LICENSE_AUTHORIZED",
        metadata: JSON.stringify({
          drmLicenseId: drmLicense.id,
          licenseToken: licenseResult.licenseToken,
          scheme: licenseResult.scheme,
          provider: drmAsset.provider,
        }),
        ipAddress: clientIp,
        userAgent,
      },
    });

    res.status(200).json({
      success: true,
      message: "DRM license authorized and issued",
      data: {
        authorized: true,
        licenseToken: licenseResult.licenseToken,
        keyId: licenseResult.keyId,
        licensePayload: licenseResult.licensePayload,
        scheme: licenseResult.scheme,
        expiresAt: licenseResult.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/drm/monitoring/stats - DRM Telemetry and KPI metrics
export const getDrmMonitoringStats = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const [providerStatus, drmReadyCount, pendingCount, activeLicensesCount, revokedLicensesCount, expiredLicensesCount, deniedCount] =
      await Promise.all([
        drmServiceManager.getSafeStatus(),
        prisma.drmAsset.count({ where: { status: "READY" } }),
        prisma.drmAsset.count({ where: { status: { in: ["NOT_CONFIGURED", "QUEUED", "PROCESSING"] } } }),
        prisma.drmLicense.count({ where: { status: "ACTIVE" } }),
        prisma.drmLicense.count({ where: { status: "REVOKED" } }),
        prisma.drmLicense.count({ where: { status: "EXPIRED" } }),
        prisma.protectionEvent.count({ where: { eventType: "DRM_LICENSE_DENIED" } }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        providerStatus,
        drmReadyAssets: drmReadyCount,
        pendingDrmAssets: pendingCount,
        activeLicenses: activeLicensesCount,
        revokedLicenses: revokedLicensesCount,
        expiredLicenses: expiredLicensesCount,
        deniedLicenseRequests: deniedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/drm/monitoring/licenses - Real-time DRM license ledger
export const getDrmLicenses = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, theatreId, limit } = req.query;

    const licenses = await prisma.drmLicense.findMany({
      where: {
        status: status ? (String(status) as DrmLicenseStatus) : undefined,
        theatreId: theatreId ? String(theatreId) : undefined,
      },
      include: {
        drmAsset: {
          include: {
            videoAsset: {
              include: {
                movie: { select: { title: true } },
                productionCompany: { select: { name: true, code: true } },
              },
            },
          },
        },
        theatre: { select: { name: true, code: true } },
        show: { select: { id: true, startTime: true } },
        activation: {
          include: {
            ticket: { select: { ticketNumber: true, seatNumber: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
      take: limit ? Number(limit) : 50,
    });

    res.status(200).json({
      success: true,
      data: licenses,
    });
  } catch (error) {
    next(error);
  }
};
