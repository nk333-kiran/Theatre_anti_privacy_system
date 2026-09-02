import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import path from "path";
import { prisma, ProcessingStatus } from "@antipiracy/database";
import { videoProcessingQueue } from "../services/videoProcessing/processingQueue";
import { ffmpegService } from "../services/videoProcessing/ffmpegService";
import { ApiResponse, AuthenticatedUser } from "../types";
import { AppError } from "../middleware/errorHandler";

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// POST /api/video-assets/upload - Upload video master and queue HLS transcoding
export const uploadVideoAsset = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const file = req.file;
    if (!file) {
      throw new AppError("Video file is required", 400, "MISSING_FILE");
    }

    const { movieId, title, contentAssetId } = req.body;

    if (!movieId) {
      throw new AppError("movieId is required", 400, "MISSING_MOVIE_ID");
    }

    // 1. Verify Movie & Production Company Ownership
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: { productionCompany: true },
    });

    if (!movie) {
      throw new AppError("Movie not found", 404, "MOVIE_NOT_FOUND");
    }

    if (
      user.role === "PRODUCTION_COMPANY" &&
      user.productionCompanyId &&
      movie.productionCompanyId !== user.productionCompanyId
    ) {
      throw new AppError("You do not have permission to upload assets for this movie", 403, "FORBIDDEN");
    }

    const productionCompanyId =
      movie.productionCompanyId ||
      user.productionCompanyId ||
      (await prisma.productionCompany.findFirst())?.id ||
      "";

    if (!productionCompanyId) {
      throw new AppError("No associated production company found for this movie", 400, "NO_PRODUCTION_COMPANY");
    }

    // 2. Generate Unique Theatrical Delivery Stream Key
    const streamKey = `STRM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2));
    const assetTitle = title || `${movie.title} (Theatrical Master)`;

    // 3. Create ContentAsset record for Phase 7 compatibility
    const contentAsset = await prisma.contentAsset.create({
      data: {
        movieId: movie.id,
        assetType: "FEATURE_FILM_MASTER",
        processingStatus: "QUEUED",
        fileReference: `private_storage/raw/${file.filename}`,
        fileSizeMb: Math.round(fileSizeMb),
        resolution: "Detecting...",
      },
    });

    // 4. Create VideoAsset in PostgreSQL
    const videoAsset = await prisma.videoAsset.create({
      data: {
        title: assetTitle,
        movieId: movie.id,
        contentAssetId: contentAsset.id,
        productionCompanyId,
        state: "PROCESSING",
        processingStatus: "QUEUED",
        processingProgress: 0,
        sourceFilePath: file.path,
        originalFilename: file.originalname,
        fileSizeMb,
        mimeType: file.mimetype,
        streamKey,
        deliveryManifestUrl: `/api/playback/stream/${streamKey}/master.m3u8`,
        processingLogs: `[${new Date().toISOString()}] Upload received: ${file.originalname} (${fileSizeMb} MB). Queued for HLS transcoding.\n`,
      },
      include: {
        movie: { select: { title: true, language: true, durationMinutes: true } },
        productionCompany: { select: { name: true, code: true } },
      },
    });

    // 5. Enqueue Asynchronous FFmpeg Transcoding Pipeline
    await videoProcessingQueue.queueAssetProcessing(videoAsset.id);

    // Sanitize output (never expose filesystem paths)
    const sanitizedAsset = {
      id: videoAsset.id,
      title: videoAsset.title,
      movieId: videoAsset.movieId,
      movieTitle: videoAsset.movie?.title,
      processingStatus: videoAsset.processingStatus,
      processingProgress: videoAsset.processingProgress,
      originalFilename: videoAsset.originalFilename,
      fileSizeMb: videoAsset.fileSizeMb,
      streamKey: videoAsset.streamKey,
      deliveryManifestUrl: videoAsset.deliveryManifestUrl,
      createdAt: videoAsset.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "Video uploaded and queued for HLS transcoding",
      data: sanitizedAsset,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/video-assets - List video assets scoped to authenticated company
export const getVideoAssets = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const { movieId, processingStatus } = req.query;

    const where: any = {};

    if (user.role === "PRODUCTION_COMPANY" && user.productionCompanyId) {
      where.productionCompanyId = user.productionCompanyId;
    }

    if (movieId) {
      where.movieId = String(movieId);
    }

    if (processingStatus) {
      where.processingStatus = String(processingStatus) as ProcessingStatus;
    }

    const assets = await prisma.videoAsset.findMany({
      where,
      include: {
        movie: {
          select: { id: true, title: true, durationMinutes: true, language: true, contentStatus: true },
        },
        productionCompany: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Sanitize sourceFilePath
    const sanitized = assets.map((a) => ({
      id: a.id,
      title: a.title,
      movieId: a.movieId,
      movie: a.movie,
      productionCompany: a.productionCompany,
      state: a.state,
      processingStatus: a.processingStatus,
      processingProgress: a.processingProgress,
      processingError: a.processingError,
      originalFilename: a.originalFilename,
      fileSizeMb: a.fileSizeMb,
      resolution: a.resolution,
      durationSeconds: a.durationSeconds,
      videoCodec: a.videoCodec,
      audioCodec: a.audioCodec,
      streamKey: a.streamKey,
      deliveryManifestUrl: a.deliveryManifestUrl,
      hasThumbnail: !!a.thumbnailPath,
      thumbnailUrl: a.thumbnailPath ? `/api/playback/thumbnail/${a.streamKey}` : null,
      processingStartedAt: a.processingStartedAt,
      processingCompletedAt: a.processingCompletedAt,
      createdAt: a.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/video-assets/:id - Asset details and full logs
export const getVideoAssetById = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const asset = await prisma.videoAsset.findUnique({
      where: { id },
      include: {
        movie: true,
        productionCompany: true,
      },
    });

    if (!asset) {
      throw new AppError("Video asset not found", 404, "ASSET_NOT_FOUND");
    }

    if (
      user?.role === "PRODUCTION_COMPANY" &&
      user.productionCompanyId &&
      asset.productionCompanyId !== user.productionCompanyId
    ) {
      throw new AppError("Unauthorized access to video asset", 403, "FORBIDDEN");
    }

    res.status(200).json({
      success: true,
      data: {
        ...asset,
        sourceFilePath: undefined, // Never expose raw server path
        thumbnailUrl: asset.thumbnailPath ? `/api/playback/thumbnail/${asset.streamKey}` : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/video-assets/:id/process - Trigger processing manually
export const processVideoAsset = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const asset = await prisma.videoAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new AppError("Video asset not found", 404, "ASSET_NOT_FOUND");
    }

    if (
      user?.role === "PRODUCTION_COMPANY" &&
      user.productionCompanyId &&
      asset.productionCompanyId !== user.productionCompanyId
    ) {
      throw new AppError("Unauthorized access to video asset", 403, "FORBIDDEN");
    }

    await videoProcessingQueue.queueAssetProcessing(asset.id);

    res.status(200).json({
      success: true,
      message: "Video processing queued",
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/video-assets/:id/retry - Retry failed video processing
export const retryVideoAssetProcessing = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const asset = await prisma.videoAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new AppError("Video asset not found", 404, "ASSET_NOT_FOUND");
    }

    if (
      user?.role === "PRODUCTION_COMPANY" &&
      user.productionCompanyId &&
      asset.productionCompanyId !== user.productionCompanyId
    ) {
      throw new AppError("Unauthorized access to video asset", 403, "FORBIDDEN");
    }

    await prisma.videoAsset.update({
      where: { id },
      data: {
        processingStatus: "QUEUED",
        processingError: null,
        processingProgress: 0,
        processingLogs: (asset.processingLogs || "") + `\n[${new Date().toISOString()}] Retry requested by user.\n`,
      },
    });

    await videoProcessingQueue.queueAssetProcessing(asset.id);

    res.status(200).json({
      success: true,
      message: "Video asset processing re-queued",
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/video-assets/:id/status - Lightweight progress polling endpoint
export const getVideoAssetStatus = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const asset = await prisma.videoAsset.findUnique({
      where: { id },
      select: {
        id: true,
        processingStatus: true,
        processingProgress: true,
        processingError: true,
        resolution: true,
        durationSeconds: true,
        streamKey: true,
        deliveryManifestUrl: true,
        updatedAt: true,
      },
    });

    if (!asset) {
      throw new AppError("Video asset not found", 404, "ASSET_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/video-assets/diagnostics/ffmpeg - FFmpeg system health
export const getFFmpegDiagnostics = async (
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const diag = await ffmpegService.getDiagnostics();
    res.status(200).json({
      success: true,
      data: diag,
    });
  } catch (error) {
    next(error);
  }
};
