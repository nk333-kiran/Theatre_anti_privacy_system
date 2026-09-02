"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoProcessingWorker = exports.VideoProcessingWorker = void 0;
const database_1 = require("@antipiracy/database");
const jobQueue_1 = require("./jobQueue");
const logger_1 = require("../logging/logger");
class VideoProcessingWorker {
    constructor() {
        this.registerHandlers();
    }
    registerHandlers() {
        // 1. Video Transcoding Job
        jobQueue_1.jobQueue.registerHandler("VIDEO_TRANSCODE", async (job) => {
            const { videoAssetId } = job.data;
            logger_1.logger.info(`[Worker:Transcode] Starting transcode job for asset ${videoAssetId}`);
            await database_1.prisma.videoAsset.update({
                where: { id: videoAssetId },
                data: {
                    processingStatus: "PROCESSING",
                    processingStartedAt: new Date(),
                    processingProgress: 25,
                },
            });
            // Simulated multi-stage transcoding
            job.progress = 50;
            const updated = await database_1.prisma.videoAsset.update({
                where: { id: videoAssetId },
                data: {
                    processingStatus: "READY",
                    state: "READY",
                    processingProgress: 100,
                    processingCompletedAt: new Date(),
                    resolution: "1920x1080",
                    durationSeconds: 7200,
                    videoCodec: "h264",
                    audioCodec: "aac",
                    bitrates: "1080p (5000kbps), 720p (2500kbps), 480p (1000kbps)",
                },
            });
            return { videoAssetId, status: updated.state };
        });
        // 2. HLS / DASH Packaging Job
        jobQueue_1.jobQueue.registerHandler("HLS_PACKAGING", async (job) => {
            const { videoAssetId } = job.data;
            logger_1.logger.info(`[Worker:Packaging] Packaging encrypted HLS playlist for ${videoAssetId}`);
            const manifestPath = `/storage/hls/${videoAssetId}/master.m3u8`;
            await database_1.prisma.videoAsset.update({
                where: { id: videoAssetId },
                data: {
                    deliveryManifestUrl: manifestPath,
                    hlsMasterManifestPath: manifestPath,
                },
            });
            return { videoAssetId, manifestUrl: manifestPath };
        });
        // 3. DRM Packaging Job
        jobQueue_1.jobQueue.registerHandler("DRM_PACKAGING", async (job) => {
            const { videoAssetId, drmScheme } = job.data;
            logger_1.logger.info(`[Worker:DRM] Binding DRM packaging scheme ${drmScheme || "AES-128"} for ${videoAssetId}`);
            const drmAsset = await database_1.prisma.drmAsset.upsert({
                where: { videoAssetId },
                create: {
                    videoAssetId,
                    drmScheme: drmScheme || "AES-128-ENCRYPTED",
                    keyId: `kid_${videoAssetId.slice(0, 8)}_${Date.now()}`,
                    status: "READY",
                    encryptedManifestUrl: `/storage/hls/${videoAssetId}/encrypted_master.m3u8`,
                    licenseServerUrl: `/api/drm/license`,
                },
                update: {
                    status: "READY",
                    encryptedManifestUrl: `/storage/hls/${videoAssetId}/encrypted_master.m3u8`,
                },
            });
            return { videoAssetId, keyId: drmAsset.keyId, status: drmAsset.status };
        });
        // 4. Asset Validation Job
        jobQueue_1.jobQueue.registerHandler("ASSET_VALIDATION", async (job) => {
            const { videoAssetId } = job.data;
            const asset = await database_1.prisma.videoAsset.findUnique({ where: { id: videoAssetId } });
            if (!asset)
                throw new Error(`VideoAsset ${videoAssetId} not found`);
            return { valid: true, videoAssetId: asset.id, title: asset.title };
        });
    }
    async queueAssetProcessing(videoAssetId) {
        await jobQueue_1.jobQueue.add("VIDEO_TRANSCODE", { videoAssetId });
        await jobQueue_1.jobQueue.add("HLS_PACKAGING", { videoAssetId });
        await jobQueue_1.jobQueue.add("DRM_PACKAGING", { videoAssetId, drmScheme: "AES-128-ENCRYPTED" });
    }
}
exports.VideoProcessingWorker = VideoProcessingWorker;
exports.videoProcessingWorker = new VideoProcessingWorker();
