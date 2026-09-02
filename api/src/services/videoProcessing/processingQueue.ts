import path from "path";
import fs from "fs";
import { prisma, ProcessingStatus } from "@antipiracy/database";
import { ffmpegService } from "./ffmpegService";
import { storageManager } from "../storage/localStorage";

export class VideoProcessingQueue {
  private isProcessingMap: Map<string, boolean> = new Map();

  public async queueAssetProcessing(videoAssetId: string): Promise<void> {
    // Avoid double processing
    if (this.isProcessingMap.get(videoAssetId)) {
      return;
    }

    // Trigger async non-blocking execution
    setImmediate(() => {
      this.executeProcessing(videoAssetId).catch((err) => {
        console.error(`Unhandled error during asset processing [${videoAssetId}]:`, err);
      });
    });
  }

  private async executeProcessing(videoAssetId: string): Promise<void> {
    this.isProcessingMap.set(videoAssetId, true);

    const appendLog = async (logLine: string, progress?: number) => {
      const timestamp = new Date().toISOString();
      const formatted = `[${timestamp}] ${logLine}`;
      console.log(`[VideoProcessing][${videoAssetId}] ${formatted}`);

      try {
        const current = await prisma.videoAsset.findUnique({
          where: { id: videoAssetId },
          select: { processingLogs: true },
        });

        const logs = (current?.processingLogs ? current.processingLogs + "\n" : "") + formatted;

        await prisma.videoAsset.update({
          where: { id: videoAssetId },
          data: {
            processingLogs: logs,
            processingProgress: progress !== undefined ? progress : undefined,
          },
        });
      } catch (e) {
        // Non-fatal
      }
    };

    try {
      const asset = await prisma.videoAsset.findUnique({
        where: { id: videoAssetId },
        include: { movie: true },
      });

      if (!asset || !asset.sourceFilePath) {
        throw new Error("Asset or raw source file reference not found.");
      }

      if (!fs.existsSync(asset.sourceFilePath)) {
        throw new Error(`Raw source file not found on disk at: ${asset.sourceFilePath}`);
      }

      // Check FFmpeg availability
      const diag = await ffmpegService.getDiagnostics();
      if (!diag.available) {
        throw new Error(diag.error || "FFmpeg is not installed or available on this system.");
      }

      // Update DB to PROCESSING
      await prisma.videoAsset.update({
        where: { id: videoAssetId },
        data: {
          processingStatus: "PROCESSING",
          state: "PROCESSING",
          processingProgress: 5,
          processingStartedAt: new Date(),
          processingError: null,
        },
      });

      await appendLog("Starting video inspection and FFprobe analysis...", 10);

      // 1. Probe video metadata
      const meta = await ffmpegService.probeVideo(asset.sourceFilePath);
      await appendLog(
        `Metadata detected: ${meta.resolution}, ${meta.durationSeconds}s, Video: ${meta.videoCodec}, Audio: ${meta.audioCodec}`,
        20
      );

      // 2. Prepare output directory
      const outputDir = storageManager.getAssetProcessedDir(videoAssetId);

      // 3. Transcode to multi-bitrate HLS
      const result = await ffmpegService.transcodeToHLS(
        asset.sourceFilePath,
        outputDir,
        async (progress, logMsg) => {
          await appendLog(logMsg, progress);
        }
      );

      // Relative paths from storage root
      const relManifest = path.relative(process.cwd(), result.masterPlaylistPath).replace(/\\/g, "/");
      const relThumbnail = path.relative(process.cwd(), result.thumbnailPath).replace(/\\/g, "/");

      // 4. Update DB to READY
      await prisma.videoAsset.update({
        where: { id: videoAssetId },
        data: {
          processingStatus: "READY",
          state: "READY",
          processingProgress: 100,
          processingCompletedAt: new Date(),
          durationSeconds: meta.durationSeconds,
          resolution: meta.resolution,
          videoCodec: meta.videoCodec,
          audioCodec: meta.audioCodec,
          hlsMasterManifestPath: relManifest,
          thumbnailPath: relThumbnail,
          deliveryManifestUrl: `/api/playback/stream/${asset.streamKey}/master.m3u8`,
        },
      });

      // Update movie duration if not set
      if (asset.movie && (!asset.movie.durationMinutes || asset.movie.durationMinutes === 0)) {
        await prisma.movie.update({
          where: { id: asset.movieId },
          data: {
            durationMinutes: Math.max(1, Math.round(meta.durationSeconds / 60)),
            contentStatus: "READY",
          },
        });
      }

      await appendLog("Asset processing finished successfully. Ready for theatrical HLS delivery.", 100);
    } catch (err: any) {
      console.error(`Asset processing failed for [${videoAssetId}]:`, err);
      const errorMessage = err.message || "Unknown transcoding error occurred.";

      await appendLog(`ERROR: ${errorMessage}`);

      await prisma.videoAsset.update({
        where: { id: videoAssetId },
        data: {
          processingStatus: "FAILED",
          state: "BLOCKED",
          processingError: errorMessage,
        },
      });
    } finally {
      this.isProcessingMap.delete(videoAssetId);
    }
  }
}

export const videoProcessingQueue = new VideoProcessingQueue();
