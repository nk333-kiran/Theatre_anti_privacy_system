"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Film,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  FileVideo,
  Layers,
  Cpu,
  Clock,
  Sparkles,
  Terminal,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  X,
  RefreshCw,
  Key,
} from "lucide-react";
import {
  MovieItem,
  VideoAssetItem,
  FFmpegDiagnostics,
  uploadVideoAsset,
  fetchVideoAssets,
  fetchVideoAssetById,
  retryVideoAssetProcessing,
  fetchFFmpegDiagnostics,
  prepareAssetDrm,
} from "../../lib/api";

interface VideoUploadManagerProps {
  movies: MovieItem[];
  onAssetReady?: (asset: VideoAssetItem) => void;
  onPreviewAsset?: (asset: VideoAssetItem) => void;
}

export const VideoUploadManager: React.FC<VideoUploadManagerProps> = ({
  movies = [],
  onAssetReady,
  onPreviewAsset,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload State
  const [selectedMovieId, setSelectedMovieId] = useState<string>("");
  const [assetTitle, setAssetTitle] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Asset List & Diagnostics State
  const [assets, setAssets] = useState<VideoAssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(true);
  const [selectedAssetForLogs, setSelectedAssetForLogs] = useState<VideoAssetItem | null>(null);
  const [ffmpegDiag, setFfmpegDiag] = useState<FFmpegDiagnostics | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Auto-select first movie if available
  useEffect(() => {
    if (movies.length > 0 && !selectedMovieId) {
      setSelectedMovieId(movies[0].id);
    }
  }, [movies, selectedMovieId]);

  // Load assets & diagnostics
  const loadData = async () => {
    try {
      const [assetsData, diagData] = await Promise.all([
        fetchVideoAssets().catch(() => []),
        fetchFFmpegDiagnostics().catch(() => null),
      ]);
      setAssets(assetsData);
      setFfmpegDiag(diagData);
    } catch (err) {
      console.error("Error loading video assets:", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Polling for processing assets (every 3 seconds if any asset is QUEUED or PROCESSING)
  useEffect(() => {
    const hasActiveJobs = assets.some(
      (a) => a.processingStatus === "QUEUED" || a.processingStatus === "PROCESSING"
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(async () => {
      try {
        const updated = await fetchVideoAssets();
        setAssets(updated);

        // If inspecting an active asset, refresh logs
        if (selectedAssetForLogs) {
          const fresh = updated.find((a) => a.id === selectedAssetForLogs.id);
          if (fresh) setSelectedAssetForLogs(fresh);
        }
      } catch (e) {
        // Non-fatal
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [assets, selectedAssetForLogs]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!assetTitle) {
        setAssetTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!assetTitle) {
        setAssetTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Submit Upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a video file to upload.");
      return;
    }
    if (!selectedMovieId) {
      setUploadError("Please select a target movie for this video master.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("movieId", selectedMovieId);
    if (assetTitle) formData.append("title", assetTitle);

    try {
      const res = await uploadVideoAsset(formData, (percent) => {
        setUploadProgress(percent);
      });

      if (res.success && res.data) {
        setSelectedFile(null);
        setAssetTitle("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadData();
      } else {
        setUploadError(res.message || "Upload failed. Please check file format.");
      }
    } catch (err: any) {
      setUploadError(err.message || "Network error during upload.");
    } finally {
      setUploading(false);
    }
  };

  // Handle Retry
  const handleRetry = async (assetId: string) => {
    setRetryingId(assetId);
    try {
      const res = await retryVideoAssetProcessing(assetId);
      if (res.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  // Handle DRM Packaging Preparation
  const [packagingDrmId, setPackagingDrmId] = useState<string | null>(null);
  const handlePrepareDrm = async (assetId: string) => {
    setPackagingDrmId(assetId);
    try {
      const res = await prepareAssetDrm(assetId);
      if (res.success) {
        await loadData();
        alert("DRM packaging completed successfully. Asset is now ready for secure EME licensing.");
      } else {
        alert(res.message || "Failed to prepare DRM packaging");
      }
    } catch (err: any) {
      alert(`Error preparing DRM: ${err.message}`);
    } finally {
      setPackagingDrmId(null);
    }
  };

  const selectedMovie = movies.find((m) => m.id === selectedMovieId);

  return (
    <div className="space-y-8">
      {/* FFmpeg System Health Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              ffmpegDiag?.available
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
            }`}
          >
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <span>HLS Transcoding Pipeline</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  ffmpegDiag?.available
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {ffmpegDiag?.available ? "FFmpeg Engine Ready" : "FFmpeg Required"}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-[11px] truncate max-w-lg mt-0.5">
              {ffmpegDiag?.available
                ? ffmpegDiag.version || "FFmpeg multi-bitrate HLS segmentation active"
                : ffmpegDiag?.error || "Detecting FFmpeg..."}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid: Upload Form (Left 5 cols) + Processing Stream Manager (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* UPLOAD MASTER VIDEO FORM (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              Upload Movie Master Video
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload source video for automated multi-bitrate HLS segmentation (1080p, 720p, 480p).
            </p>
          </div>

          {/* Movie Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Movie *</label>
            <select
              value={selectedMovieId}
              onChange={(e) => setSelectedMovieId(e.target.value)}
              disabled={uploading}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {movies.length === 0 ? (
                <option value="">No registered movies found</option>
              ) : (
                movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.language} &bull; {m.durationMinutes}m)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Asset Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Asset Label / Title</label>
            <input
              type="text"
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              placeholder={selectedMovie ? `${selectedMovie.title} (Theatrical DCI Master)` : "e.g. Master DCP Feed"}
              disabled={uploading}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Video File (MP4, MKV, MOV) *</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-800 hover:border-indigo-500/40 bg-slate-950/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mkv,.mp4,.mov,.webm,.avi"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-slate-200 text-xs truncate max-w-[240px] mx-auto">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to Upload
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-300">
                    Drag and drop source movie file here, or click to browse
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supports MP4, MOV, MKV, WEBM up to 5 GB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  Uploading Master Video...
                </span>
                <span className="text-slate-300 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !selectedMovieId}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading & Queueing Pipeline...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload & Start HLS Transcoding</span>
              </>
            )}
          </button>
        </div>

        {/* PROCESSING PIPELINE & ASSETS LIST (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Film className="w-5 h-5 text-indigo-400" />
                  Video Delivery Assets & HLS Readiness
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Private storage references and multi-bitrate HLS streams
                </p>
              </div>

              <span className="text-xs font-mono text-indigo-400 font-semibold">
                {assets.length} Assets
              </span>
            </div>

            {loadingAssets ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading video assets...</div>
            ) : assets.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No video assets uploaded yet. Upload a movie file to begin.
              </div>
            ) : (
              <div className="space-y-4">
                {assets.map((asset) => {
                  const isProcessing =
                    asset.processingStatus === "PROCESSING" || asset.processingStatus === "QUEUED";
                  const isReady = asset.processingStatus === "READY";
                  const isFailed = asset.processingStatus === "FAILED";

                  return (
                    <div
                      key={asset.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isProcessing
                          ? "bg-slate-950/80 border-indigo-500/40 ring-1 ring-indigo-500/20"
                          : isReady
                          ? "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          : "bg-rose-950/10 border-rose-500/30"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-sm">{asset.title}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                isReady
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : isProcessing
                                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {asset.processingStatus}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 font-medium">
                            {asset.movie?.title || "Movie"} &bull;{" "}
                            <span className="text-slate-500 font-mono">
                              {asset.fileSizeMb ? `${asset.fileSizeMb} MB` : "File"}{" "}
                              {asset.resolution && `• ${asset.resolution}`}{" "}
                              {asset.durationSeconds ? `• ${asset.durationSeconds}s` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {isFailed && (
                            <button
                              onClick={() => handleRetry(asset.id)}
                              disabled={retryingId === asset.id}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{retryingId === asset.id ? "Retrying..." : "Retry"}</span>
                            </button>
                          )}

                          {isReady && (
                            <button
                              onClick={() => handlePrepareDrm(asset.id)}
                              disabled={packagingDrmId === asset.id}
                              className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>{packagingDrmId === asset.id ? "Packaging..." : "Prepare DRM"}</span>
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setSelectedAssetForLogs(
                                selectedAssetForLogs?.id === asset.id ? null : asset
                              )
                            }
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Logs</span>
                          </button>
                        </div>
                      </div>

                      {/* Processing Progress Bar */}
                      {isProcessing && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                            <span className="flex items-center gap-1.5">
                              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              Transcoding multi-bitrate HLS streams...
                            </span>
                            <span>{asset.processingProgress || 10}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(10, asset.processingProgress || 10)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Banner */}
                      {isFailed && asset.processingError && (
                        <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-mono">
                          {asset.processingError}
                        </div>
                      )}

                      {/* HLS Stream Key & Technical Footnote */}
                      {isReady && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> HLS Ready
                            </span>
                            <span className="text-slate-600">&bull;</span>
                            <span className="text-slate-300 truncate max-w-[180px]">
                              {asset.deliveryManifestUrl}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-500">
                            <span>{asset.videoCodec || "h264"}</span>
                            <span>/</span>
                            <span>{asset.audioCodec || "aac"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Logs Drawer */}
          {selectedAssetForLogs && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Pipeline Execution Logs: {selectedAssetForLogs.title}</span>
                </div>
                <button
                  onClick={() => setSelectedAssetForLogs(null)}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-900/90 rounded-xl p-4 max-h-60 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 whitespace-pre-wrap leading-relaxed">
                {selectedAssetForLogs.processingLogs || "No logs recorded yet."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
