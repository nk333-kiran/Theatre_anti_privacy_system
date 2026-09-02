import path from "path";
import fs from "fs";
import { execFile, exec } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  resolution: string;
  videoCodec: string;
  audioCodec: string;
  bitrateKbps: number;
  sizeBytes: number;
  formatName: string;
}

export interface FFmpegDiagnostics {
  available: boolean;
  ffmpegPath?: string;
  ffprobePath?: string;
  version?: string;
  error?: string;
}

export class FFmpegService {
  private ffmpegPath: string | null = null;
  private ffprobePath: string | null = null;
  private diagnosticsCache: FFmpegDiagnostics | null = null;

  constructor() {
    this.initPaths();
  }

  private initPaths() {
    // 1. Check environment variables
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
      this.ffmpegPath = process.env.FFMPEG_PATH;
    }
    if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
      this.ffprobePath = process.env.FFPROBE_PATH;
    }

    // 2. Check ffmpeg-static & ffprobe-static npm modules
    if (!this.ffmpegPath) {
      try {
        const ffmpegStatic = require("ffmpeg-static");
        if (ffmpegStatic && typeof ffmpegStatic === "string" && fs.existsSync(ffmpegStatic)) {
          this.ffmpegPath = ffmpegStatic;
        }
      } catch (e) {
        // Not installed or unavailable
      }
    }

    if (!this.ffprobePath) {
      try {
        const ffprobeStatic = require("ffprobe-static");
        if (ffprobeStatic && ffprobeStatic.path && fs.existsSync(ffprobeStatic.path)) {
          this.ffprobePath = ffprobeStatic.path;
        }
      } catch (e) {
        // Not installed or unavailable
      }
    }
  }

  public async getDiagnostics(): Promise<FFmpegDiagnostics> {
    if (this.diagnosticsCache) return this.diagnosticsCache;

    try {
      this.initPaths();
      const binary = this.ffmpegPath || "ffmpeg";
      const { stdout } = await execAsync(`"${binary}" -version`);
      const firstLine = stdout.split("\n")[0];

      this.diagnosticsCache = {
        available: true,
        ffmpegPath: this.ffmpegPath || "system PATH (ffmpeg)",
        ffprobePath: this.ffprobePath || "system PATH (ffprobe)",
        version: firstLine,
      };
    } catch (err: any) {
      this.diagnosticsCache = {
        available: false,
        error: `FFmpeg binary not detected. Please install FFmpeg on the server or set FFMPEG_PATH. Error: ${err.message}`,
      };
    }

    return this.diagnosticsCache;
  }

  public async probeVideo(inputFilePath: string): Promise<VideoMetadata> {
    const diag = await this.getDiagnostics();
    if (!diag.available) {
      throw new Error(diag.error || "FFmpeg/FFprobe is not available on this server.");
    }

    const ffprobeBin = this.ffprobePath || "ffprobe";
    const args = [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      inputFilePath,
    ];

    const { stdout } = await execFileAsync(ffprobeBin, args);
    const info = JSON.parse(stdout);

    const videoStream = info.streams?.find((s: any) => s.codec_type === "video");
    const audioStream = info.streams?.find((s: any) => s.codec_type === "audio");
    const format = info.format || {};

    const duration = parseFloat(format.duration || videoStream?.duration || "0");
    const width = videoStream?.width || 1920;
    const height = videoStream?.height || 1080;
    const resolution = `${width}x${height}`;
    const videoCodec = videoStream?.codec_name || "unknown";
    const audioCodec = audioStream?.codec_name || "none";
    const bitrate = Math.round(parseInt(format.bit_rate || "0", 10) / 1000);
    const sizeBytes = parseInt(format.size || "0", 10);

    return {
      durationSeconds: Math.round(duration),
      width,
      height,
      resolution,
      videoCodec,
      audioCodec,
      bitrateKbps: bitrate,
      sizeBytes,
      formatName: format.format_name || "unknown",
    };
  }

  public async generateThumbnail(
    inputFilePath: string,
    outputThumbnailPath: string,
    timeOffsetSec = 2
  ): Promise<string> {
    const diag = await this.getDiagnostics();
    if (!diag.available) {
      throw new Error(diag.error || "FFmpeg is not available.");
    }

    const ffmpegBin = this.ffmpegPath || "ffmpeg";
    const args = [
      "-y",
      "-ss",
      String(timeOffsetSec),
      "-i",
      inputFilePath,
      "-vframes",
      "1",
      "-q:v",
      "2",
      "-vf",
      "scale=640:-1",
      outputThumbnailPath,
    ];

    await execFileAsync(ffmpegBin, args);
    return outputThumbnailPath;
  }

  public async transcodeToHLS(
    inputFilePath: string,
    outputDir: string,
    onProgress?: (percent: number, logLine: string) => void
  ): Promise<{ masterPlaylistPath: string; thumbnailPath: string; bitrates: string[] }> {
    const diag = await this.getDiagnostics();
    if (!diag.available) {
      throw new Error(diag.error || "FFmpeg is not available.");
    }

    const ffmpegBin = this.ffmpegPath || "ffmpeg";

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (onProgress) onProgress(10, "Extracting video metadata and generating poster thumbnail...");

    // 1. Generate poster thumbnail
    const thumbnailPath = path.join(outputDir, "thumbnail.jpg");
    try {
      await this.generateThumbnail(inputFilePath, thumbnailPath, 1);
    } catch (e) {
      console.warn("Thumbnail generation warning:", e);
    }

    if (onProgress) onProgress(25, "Initiating multi-bitrate HLS segmentation (1080p, 720p, 480p)...");

    // 2. Multi-bitrate HLS profiles
    const profiles = [
      { name: "1080p", width: 1920, height: 1080, vBitrate: "4500k", aBitrate: "128k", maxrate: "4800k", bufsize: "9000k" },
      { name: "720p", width: 1280, height: 720, vBitrate: "2200k", aBitrate: "128k", maxrate: "2400k", bufsize: "4500k" },
      { name: "480p", width: 854, height: 480, vBitrate: "900k", aBitrate: "96k", maxrate: "1000k", bufsize: "2000k" },
    ];

    let currentProgress = 30;

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      const streamPlaylist = path.join(outputDir, `${p.name}.m3u8`);
      const segmentPattern = path.join(outputDir, `${p.name}_%04d.ts`);

      if (onProgress) {
        onProgress(
          currentProgress,
          `Encoding HLS stream [${p.name}] (${p.width}x${p.height} @ ${p.vBitrate})...`
        );
      }

      const args = [
        "-y",
        "-i",
        inputFilePath,
        "-vf",
        `scale=w=${p.width}:h=${p.height}:force_original_aspect_ratio=decrease,pad=${p.width}:${p.height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-b:v",
        p.vBitrate,
        "-maxrate",
        p.maxrate,
        "-bufsize",
        p.bufsize,
        "-c:a",
        "aac",
        "-b:a",
        p.aBitrate,
        "-ar",
        "48000",
        "-hls_time",
        "4",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        segmentPattern,
        streamPlaylist,
      ];

      await execFileAsync(ffmpegBin, args);
      currentProgress += 20;
    }

    if (onProgress) onProgress(90, "Writing master HLS variant playlist (master.m3u8)...");

    // 3. Write Master HLS Playlist
    const masterPlaylistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4800000,RESOLUTION=1920x1080,NAME="1080p Full HD"
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2400000,RESOLUTION=1280x720,NAME="720p HD"
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,NAME="480p SD"
480p.m3u8
`;

    const masterPlaylistPath = path.join(outputDir, "master.m3u8");
    fs.writeFileSync(masterPlaylistPath, masterPlaylistContent, "utf-8");

    if (onProgress) onProgress(100, "HLS encoding completed successfully. Master manifest generated.");

    return {
      masterPlaylistPath,
      thumbnailPath,
      bitrates: ["1080p", "720p", "480p"],
    };
  }
}

export const ffmpegService = new FFmpegService();
