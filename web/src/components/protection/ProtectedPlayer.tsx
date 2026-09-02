"use client";

import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  Tv,
  Film,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Key,
  Layers,
  CheckCircle2,
  Video,
} from "lucide-react";
import { Watermark } from "./Watermark";
import {
  ProtectionSessionInfo,
  ProtectionEventType,
  PlaybackAuthorizationResponse,
  DrmMetadata,
  authorizePlayback,
  startPlaybackStreamSession,
  sendPlaybackHeartbeat,
  terminatePlaybackStreamSession,
  recordProtectionEvent,
  requestDrmLicense,
} from "../../lib/api";

interface ProtectedPlayerProps {
  session: ProtectionSessionInfo;
  authTokenOrId?: string;
  onSessionTerminated?: (reason: string) => void;
  className?: string;
}

export const ProtectedPlayer: React.FC<ProtectedPlayerProps> = ({
  session,
  authTokenOrId,
  onSessionTerminated,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Player & Stream state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(180);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [useHlsStream, setUseHlsStream] = useState<boolean>(false);

  // Phase 8 & 9A Secure Playback Authorization state
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [playbackToken, setPlaybackToken] = useState<string | null>(null);
  const [drmMetadata, setDrmMetadata] = useState<DrmMetadata | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);
  const [authExpiresAt, setAuthExpiresAt] = useState<string | null>(null);

  // Security & Heartbeat state
  const [sessionActive, setSessionActive] = useState<boolean>(session.status === "ACTIVE");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [heartbeatTick, setHeartbeatTick] = useState<number>(0);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [privacyShieldActive, setPrivacyShieldActive] = useState<boolean>(false);

  const [drmLicenseToken, setDrmLicenseToken] = useState<string | null>(null);
  const [detectedEmeSystem, setDetectedEmeSystem] = useState<string>("Mock / Software EME");

  // Detect Device EME DRM Capabilities
  useEffect(() => {
    const detectEme = async () => {
      if (typeof window === "undefined" || !navigator.requestMediaKeySystemAccess) {
        setDetectedEmeSystem("Standard HTML5 / AES-128");
        return;
      }
      try {
        const config = [{ initDataTypes: ["cenc", "keyids"], videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }] }];
        if (await navigator.requestMediaKeySystemAccess("com.widevine.alpha", config).then(() => true).catch(() => false)) {
          setDetectedEmeSystem("Google Widevine (CENC)");
        } else if (await navigator.requestMediaKeySystemAccess("com.microsoft.playready", config).then(() => true).catch(() => false)) {
          setDetectedEmeSystem("Microsoft PlayReady (CENC)");
        } else if (await navigator.requestMediaKeySystemAccess("com.apple.fps", config).then(() => true).catch(() => false)) {
          setDetectedEmeSystem("Apple FairPlay (FPS)");
        } else {
          setDetectedEmeSystem("Mock DRM (Development Only)");
        }
      } catch {
        setDetectedEmeSystem("Mock DRM (Development Only)");
      }
    };
    detectEme();
  }, []);

  // 1. Initial Request for Secure Playback Authorization (Phase 8 & 9A/9B)
  const requestPlaybackAuth = async () => {
    setIsAuthorizing(true);
    setSessionError(null);

    const lookupToken = authTokenOrId || session.activationId || session.ticketNumber;
    try {
      const res = await authorizePlayback(lookupToken);
      if (res.success && res.data) {
        const token = res.data.playbackToken;
        setPlaybackToken(token);
        setDrmMetadata(res.data.drmMetadata);
        setManifestUrl(res.data.deliveryManifestUrl);
        setAuthExpiresAt(res.data.expiresAt);
        setSessionActive(true);

        // Phase 9B: Request 10-Point Validated DRM License
        try {
          const licRes = await requestDrmLicense(token, res.data.drmMetadata?.keyId);
          if (licRes.success && licRes.data) {
            setDrmLicenseToken(licRes.data.licenseToken);
          }
        } catch (licErr: any) {
          console.warn("DRM license exchange note:", licErr.message);
        }
      } else {
        setSessionActive(false);
        setIsPlaying(false);
        setSessionError(res.message || "Theatrical playback authorization denied by DRM server.");
        if (onSessionTerminated) onSessionTerminated("DENIED");
      }
    } catch (err: any) {
      setSessionActive(false);
      setIsPlaying(false);
      setSessionError(err.message || "Secure delivery server connection failed.");
      if (onSessionTerminated) onSessionTerminated("ERROR");
    } finally {
      setIsAuthorizing(false);
    }
  };

  useEffect(() => {
    requestPlaybackAuth();
  }, [authTokenOrId, session.activationId]);

  // 2. HLS.js Stream Engine Initialization (Phase 9A)
  useEffect(() => {
    if (!manifestUrl || !playbackToken || !sessionActive || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const streamSource = `${manifestUrl}?token=${playbackToken}`;

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(streamSource);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setUseHlsStream(true);
        if (video.duration) setDuration(video.duration);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          // If manifest is fallback or segment not yet transcoded, fallback to canvas demo
          setUseHlsStream(false);
          hls.destroy();
          hlsRef.current = null;
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple HLS (Safari / iOS)
      video.src = streamSource;
      video.addEventListener("loadedmetadata", () => {
        setUseHlsStream(true);
        if (video.duration) setDuration(video.duration);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [manifestUrl, playbackToken, sessionActive]);

  // 3. Playback Heartbeat Loop (every 12 seconds)
  useEffect(() => {
    if (!sessionActive || !playbackToken || !session.activationId) return;

    const interval = setInterval(async () => {
      try {
        const res = await sendPlaybackHeartbeat(playbackToken, session.activationId);
        if (res.success && res.data?.active) {
          setHeartbeatTick((t) => t + 1);
        } else {
          // Playback Heartbeat failed -> Session Expired or Revoked
          const reason = res.data?.reason || "EXPIRED";
          setSessionActive(false);
          setIsPlaying(false);
          setPlaybackToken(null);
          setSessionError(`Viewing authorization has been ${reason.toLowerCase()}. Secure stream terminated.`);
          if (onSessionTerminated) onSessionTerminated(reason);
        }
      } catch (err) {
        console.warn("Playback heartbeat ping warning:", err);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [sessionActive, playbackToken, session.activationId, onSessionTerminated]);

  // 4. Security Event Logger Helper
  const logEvent = async (eventType: ProtectionEventType, metadata?: string) => {
    if (!session.activationId) return;
    try {
      await recordProtectionEvent(session.activationId, eventType, metadata);
    } catch (e) {
      // Non-fatal
    }
  };

  // 5. Browser-Level Capture & Focus Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setPrivacyShieldActive(true);
        if (isPlaying) {
          setIsPlaying(false);
          if (videoRef.current) videoRef.current.pause();
          logEvent("PLAYBACK_STOPPED", "Window backgrounded / tab switched");
        }
      } else {
        setPrivacyShieldActive(false);
      }
    };

    const handleWindowBlur = () => {
      setPrivacyShieldActive(true);
    };

    const handleWindowFocus = () => {
      setPrivacyShieldActive(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5"))
      ) {
        setSecurityAlert("Screen capture shortcut detected. Protective watermark synchronized.");
        logEvent("SCREENSHOT_ATTEMPT_DETECTED", `Captured key: ${e.key}`);
        setTimeout(() => setSecurityAlert(null), 4000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("keyup", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("keyup", handleKeyDown);
    };
  }, [isPlaying]);

  // 6. Canvas Cinema Reel Visualizer Fallback
  useEffect(() => {
    if (useHlsStream) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;

    const renderCinemaReel = () => {
      if (!isPlaying || !sessionActive || !playbackToken) {
        return;
      }

      frame++;
      const time = currentTime + 0.033;
      if (time >= duration) {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
        return;
      }
      setCurrentTime(time);
      setProgress((time / duration) * 100);

      const w = canvas.width;
      const h = canvas.height;

      // Dark cinematic dynamic gradient background
      const grad = ctx.createRadialGradient(
        w / 2 + Math.sin(frame * 0.02) * 80,
        h / 2 + Math.cos(frame * 0.02) * 50,
        40,
        w / 2,
        h / 2,
        w * 0.75
      );
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(0.5, "#0f172a");
      grad.addColorStop(1, "#020617");

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Render Cinema Film Waves
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${230 + i * 25 + Math.sin(frame * 0.01) * 30}, 80%, 65%, 0.45)`;
        for (let x = 0; x < w; x += 10) {
          const y =
            h / 2 +
            Math.sin((x + frame * 4 + i * 80) * 0.008) * 60 * (1 + i * 0.2) +
            Math.cos((x - frame * 2) * 0.012) * 30;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Feature Film Title Graphic Center
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(session.movieTitle.toUpperCase(), w / 2, h / 2 - 20);

      ctx.fillStyle = "#818cf8";
      ctx.font = "600 13px monospace";
      ctx.fillText(`SECURE HLS STREAM • ${session.screenName.toUpperCase()}`, w / 2, h / 2 + 10);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.fillText(`DRM Scheme: ${drmMetadata?.scheme || "AES-128-ENCRYPTED"}`, w / 2, h / 2 + 32);

      animationFrameRef.current = requestAnimationFrame(renderCinemaReel);
    };

    if (isPlaying && sessionActive && playbackToken) {
      animationFrameRef.current = requestAnimationFrame(renderCinemaReel);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, sessionActive, playbackToken, currentTime, duration, session.movieTitle, session.screenName, drmMetadata, useHlsStream]);

  // Video Element Time Update Listener
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration;
      setCurrentTime(cur);
      setProgress((cur / dur) * 100);
    }
  };

  // Handle Play/Pause
  const togglePlay = async () => {
    if (!sessionActive || !playbackToken) {
      await requestPlaybackAuth();
      return;
    }
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (useHlsStream && videoRef.current) {
      if (nextState) {
        videoRef.current.play().catch(console.warn);
      } else {
        videoRef.current.pause();
      }
    }

    if (nextState) {
      await startPlaybackStreamSession(playbackToken);
      logEvent("PLAYBACK_STARTED", `Playback started at ${Math.floor(currentTime)}s`);
    } else {
      logEvent("PLAYBACK_STOPPED", `Playback paused at ${Math.floor(currentTime)}s`);
    }
  };

  // Handle Fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        logEvent("FULLSCREEN_ENTERED");
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        logEvent("FULLSCREEN_EXITED");
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Player Container */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between select-none group"
      >
        {/* Dynamic Watermark Overlay (Phase 6, 8, 9A) */}
        {sessionActive && session.watermark && (
          <Watermark payload={session.watermark} opacity={0.48} />
        )}

        {/* Real HLS HTML5 Video Feed (Phase 9A) */}
        <video
          ref={videoRef}
          onTimeUpdate={handleVideoTimeUpdate}
          muted={isMuted}
          playsInline
          className={`absolute inset-0 w-full h-full object-cover bg-slate-950 ${
            useHlsStream ? "block" : "hidden"
          }`}
        />

        {/* Fallback Canvas Visualizer Feed */}
        {!useHlsStream && (
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            className="absolute inset-0 w-full h-full object-cover bg-slate-950"
          />
        )}

        {/* Top Session Ribbon Overlay */}
        <div className="relative z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold font-mono text-[10px]">
              <Key className="w-3 h-3 text-indigo-400" />
              {useHlsStream ? "HLS STREAM ACTIVE" : (drmMetadata?.scheme || "DRM-READY STREAM")}
            </span>
            <span className="text-slate-200 font-semibold truncate max-w-[200px]">
              {session.movieTitle}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
            <span className="text-amber-400 font-bold">Seat {session.seatNumber}</span>
            <span className="text-slate-400 hidden sm:inline">&bull; {session.theatreCode}</span>
          </div>
        </div>

        {/* Security Alert Toast */}
        {securityAlert && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-amber-500/20 border border-amber-500/50 backdrop-blur-md px-4 py-2 rounded-xl text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-2xl animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{securityAlert}</span>
          </div>
        )}

        {/* Authorizing Spinner */}
        {isAuthorizing && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs text-slate-300 font-mono">Authorizing Secure HLS Playback Session...</span>
          </div>
        )}

        {/* Window Blur Privacy Shield */}
        {privacyShieldActive && sessionActive && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Protected Video Shield Active</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Screen content paused to protect intellectual property while window is not focused. Click to resume playback.
            </p>
          </div>
        )}

        {/* Session Terminated / Authorization Denied Overlay */}
        {!sessionActive && !isAuthorizing && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-400">Playback Authorization Denied</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {sessionError || "Theatrical playback authorization could not be verified for this session."}
            </p>
            <button
              onClick={requestPlaybackAuth}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors mt-2"
            >
              Retry Authorization
            </button>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="relative z-30 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-2">
          {/* Progress Bar */}
          <div
            onClick={(e) => {
              if (useHlsStream && videoRef.current) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                videoRef.current.currentTime = pos * duration;
              }
            }}
            className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden cursor-pointer"
          >
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-150 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={!sessionActive || isAuthorizing}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-slate-300 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="text-xs font-mono text-slate-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Token & DRM Footnote */}
      <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="text-indigo-400 font-bold flex items-center gap-1">
            <Key className="w-3.5 h-3.5" /> DRM: {drmLicenseToken ? drmLicenseToken.slice(0, 18) + "..." : "Authorized"}
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-cyan-400">{detectedEmeSystem}</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-emerald-400">Heartbeats: {heartbeatTick}</span>
          <span className="text-slate-600">&bull;</span>
          <span>Seat: {session.seatNumber}</span>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>DRM EME Engine &bull; Dynamic Rotating Watermark Active</span>
        </div>
      </div>
    </div>
  );
};
