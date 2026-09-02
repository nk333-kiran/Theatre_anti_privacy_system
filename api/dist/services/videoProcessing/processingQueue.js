"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoProcessingQueue = exports.VideoProcessingQueue = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("@antipiracy/database");
const ffmpegService_1 = require("./ffmpegService");
const localStorage_1 = require("../storage/localStorage");
class VideoProcessingQueue {
    isProcessingMap = new Map();
    async queueAssetProcessing(videoAssetId) {
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
    async executeProcessing(videoAssetId) {
        this.isProcessingMap.set(videoAssetId, true);
        const appendLog = async (logLine, progress) => {
            const timestamp = new Date().toISOString();
            const formatted = `[${timestamp}] ${logLine}`;
            console.log(`[VideoProcessing][${videoAssetId}] ${formatted}`);
            try {
                const current = await database_1.prisma.videoAsset.findUnique({
                    where: { id: videoAssetId },
                    select: { processingLogs: true },
                });
                const logs = (current?.processingLogs ? current.processingLogs + "\n" : "") + formatted;
                await database_1.prisma.videoAsset.update({
                    where: { id: videoAssetId },
                    data: {
                        processingLogs: logs,
                        processingProgress: progress !== undefined ? progress : undefined,
                    },
                });
            }
            catch (e) {
                // Non-fatal
            }
        };
        try {
            const asset = await database_1.prisma.videoAsset.findUnique({
                where: { id: videoAssetId },
                include: { movie: true },
            });
            if (!asset || !asset.sourceFilePath) {
                throw new Error("Asset or raw source file reference not found.");
            }
            if (!fs_1.default.existsSync(asset.sourceFilePath)) {
                throw new Error(`Raw source file not found on disk at: ${asset.sourceFilePath}`);
            }
            // Check FFmpeg availability
            const diag = await ffmpegService_1.ffmpegService.getDiagnostics();
            if (!diag.available) {
                throw new Error(diag.error || "FFmpeg is not installed or available on this system.");
            }
            // Update DB to PROCESSING
            await database_1.prisma.videoAsset.update({
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
            const meta = await ffmpegService_1.ffmpegService.probeVideo(asset.sourceFilePath);
            await appendLog(`Metadata detected: ${meta.resolution}, ${meta.durationSeconds}s, Video: ${meta.videoCodec}, Audio: ${meta.audioCodec}`, 20);
            // 2. Prepare output directory
            const outputDir = localStorage_1.storageManager.getAssetProcessedDir(videoAssetId);
            // 3. Transcode to multi-bitrate HLS
            const result = await ffmpegService_1.ffmpegService.transcodeToHLS(asset.sourceFilePath, outputDir, async (progress, logMsg) => {
                await appendLog(logMsg, progress);
            });
            // Relative paths from storage root
            const relManifest = path_1.default.relative(process.cwd(), result.masterPlaylistPath).replace(/\\/g, "/");
            const relThumbnail = path_1.default.relative(process.cwd(), result.thumbnailPath).replace(/\\/g, "/");
            // 4. Update DB to READY
            await database_1.prisma.videoAsset.update({
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
                await database_1.prisma.movie.update({
                    where: { id: asset.movieId },
                    data: {
                        durationMinutes: Math.max(1, Math.round(meta.durationSeconds / 60)),
                        contentStatus: "READY",
                    },
                });
            }
            await appendLog("Asset processing finished successfully. Ready for theatrical HLS delivery.", 100);
        }
        catch (err) {
            console.error(`Asset processing failed for [${videoAssetId}]:`, err);
            const errorMessage = err.message || "Unknown transcoding error occurred.";
            await appendLog(`ERROR: ${errorMessage}`);
            await database_1.prisma.videoAsset.update({
                where: { id: videoAssetId },
                data: {
                    processingStatus: "FAILED",
                    state: "BLOCKED",
                    processingError: errorMessage,
                },
            });
        }
        finally {
            this.isProcessingMap.delete(videoAssetId);
        }
    }
}
exports.VideoProcessingQueue = VideoProcessingQueue;
exports.videoProcessingQueue = new VideoProcessingQueue();
