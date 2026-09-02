"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Camera,
  CameraOff,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Film,
  Tv,
  Ticket,
  User,
  Zap,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  SecurityVerificationResponse,
  VerificationLogItem,
  VerificationStats,
  TicketItem,
  ShowItem,
  UserProfile,
  verifySecurityEntry,
  fetchVerifications,
  fetchVerificationStats,
} from "../../lib/api";

interface SecurityStaffVerificationProps {
  user: UserProfile | null;
  tickets?: TicketItem[];
  shows?: ShowItem[];
  onRefreshStats?: () => void;
}

export const SecurityStaffVerification: React.FC<SecurityStaffVerificationProps> = ({
  user,
  tickets = [],
  shows = [],
  onRefreshStats,
}) => {
  // Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Result display state
  const [lastResult, setLastResult] = useState<SecurityVerificationResponse["data"] | null>(null);
  const [lastStatusMessage, setLastStatusMessage] = useState<string | null>(null);

  // Verification history
  const [logs, setLogs] = useState<VerificationLogItem[]>([]);
  const [stats, setStats] = useState<VerificationStats>({
    totalScans: 0,
    verifiedCount: 0,
    deniedCount: 0,
    activeTheatres: 0,
  });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterResult, setFilterResult] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load audit logs & stats
  const loadLogsAndStats = async () => {
    setLoadingLogs(true);
    try {
      const [logsData, statsData] = await Promise.all([
        fetchVerifications({
          result: filterResult || undefined,
          search: searchQuery || undefined,
        }).catch(() => []),
        fetchVerificationStats().catch(() => ({
          totalScans: 0,
          verifiedCount: 0,
          deniedCount: 0,
          activeTheatres: 0,
        })),
      ]);
      setLogs(logsData);
      setStats(statsData);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error("Error loading verification data:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogsAndStats();
  }, [filterResult]);

  // Start Camera Feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or connection.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Start barcode detection loop if supported
      if ("BarcodeDetector" in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !verifying) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                const detectedCode = barcodes[0].rawValue;
                handleExecuteVerification(detectedCode);
              }
            } catch (scanErr) {
              // Non-fatal frame scan error
            }
          }
        }, 300);
      }
    } catch (err: any) {
      console.warn("Camera init failed:", err);
      setCameraError(err.message || "Could not access device camera. Use manual token input.");
      setCameraActive(false);
    }
  };

  // Stop Camera Feed
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Perform Verification
  const handleExecuteVerification = async (tokenCode: string) => {
    if (!tokenCode || verifying) return;
    setVerifying(true);
    try {
      const res = await verifySecurityEntry(tokenCode);
      setLastStatusMessage(res.message);
      if (res.data) {
        setLastResult(res.data);
      } else {
        setLastResult({
          result: res.success ? "VERIFIED" : "DENIED",
          reason: res.message || "Unknown error",
        });
      }
      loadLogsAndStats();
    } catch (err: any) {
      setLastStatusMessage("ENTRY DENIED ✕");
      setLastResult({
        result: "DENIED",
        reason: "Invalid activation",
        description: err.message || "Network error communicating with verification engine.",
      });
      loadLogsAndStats();
    } finally {
      setVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleExecuteVerification(manualToken.trim());
    setManualToken("");
  };

  const handleResetForNextScan = () => {
    setLastResult(null);
    setLastStatusMessage(null);
  };

  // Test Simulation Presets
  const testTickets = tickets.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Checkpoint Scanner Active
                </span>
                <span className="text-xs text-slate-400 font-mono">Phase 4 Staff Mode</span>
              </div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight mt-1">
                Security Staff QR Verification Portal
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Officer: <span className="text-slate-200 font-medium">{user?.name || "Security Staff"}</span> &bull; Role: <span className="text-indigo-400 font-mono">{user?.role || "THEATRE_STAFF"}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Scans</div>
              <div className="text-base font-bold font-mono text-slate-100">{stats.totalScans}</div>
            </div>
            <div className="bg-slate-950/80 border border-emerald-500/20 rounded-xl px-3.5 py-2 text-center">
              <div className="text-[10px] text-emerald-400 uppercase font-semibold">Verified</div>
              <div className="text-base font-bold font-mono text-emerald-400">{stats.verifiedCount}</div>
            </div>
            <div className="bg-slate-950/80 border border-rose-500/20 rounded-xl px-3.5 py-2 text-center">
              <div className="text-[10px] text-rose-400 uppercase font-semibold">Denied</div>
              <div className="text-base font-bold font-mono text-rose-400">{stats.deniedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Scanner Left + Verification Feed Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Scanner & Verification Box (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* CAMERA / SCANNER CARD */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200">Device Camera Scanner</h3>
              </div>
              {cameraActive ? (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Camera</span>
                </button>
              )}
            </div>

            {/* Video Viewport */}
            <div className="relative w-full aspect-video sm:aspect-square bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />

              {cameraActive && (
                <>
                  {/* Visual Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="w-48 h-48 border-2 border-indigo-400/80 rounded-2xl relative shadow-2xl">
                      {/* Corner Accents */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                      {/* Laser Line */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 font-mono backdrop-blur">
                    Point camera at attendee QR code
                  </div>
                </>
              )}

              {!cameraActive && (
                <div className="p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-slate-300">Camera Standby</div>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Click &quot;Start Camera&quot; to scan attendee QR codes live, or enter an activation token below.
                  </p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-x-4 bottom-4 p-3 bg-rose-950/90 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Manual Token Entry Form */}
            <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 uppercase">
                Manual Token / URL Scan Entry
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste token or URL (e.g. 9b72a...)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={verifying || !manualToken.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors"
                >
                  {verifying ? "Checking..." : "Verify"}
                </button>
              </div>
            </form>

            {/* Quick Test Simulator (1-click test tokens from issued tickets) */}
            {testTickets.length > 0 && (
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                  <span>Quick Test Tokens</span>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {testTickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (t.activation) {
                          handleExecuteVerification(t.activation.activationCode);
                        }
                      }}
                      className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-[11px] transition-all group"
                    >
                      <div className="font-mono font-bold text-slate-300 group-hover:text-indigo-300 flex items-center justify-between">
                        <span>{t.seatNumber}</span>
                        <span className="text-[9px] text-slate-500">{t.status}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{t.show.movie.title}</div>
                    </button>
                  ))}
                  {/* Invalid token test button */}
                  <button
                    type="button"
                    onClick={() => handleExecuteVerification("invalid-corrupted-token-test")}
                    className="text-left px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 text-[11px] transition-all col-span-2 text-rose-300 font-mono"
                  >
                    Test Invalid/Corrupted Token &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Decision Result & Audit Log (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* VERIFICATION DECISION BANNER */}
          {lastResult ? (
            <div
              className={`rounded-2xl border p-6 backdrop-blur shadow-2xl transition-all ${
                lastResult.result === "VERIFIED"
                  ? "bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/40"
                  : "bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/40"
              }`}
            >
              {/* Primary Decision Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      lastResult.result === "VERIFIED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {lastResult.result === "VERIFIED" ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : (
                      <XCircle className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h2
                      className={`text-2xl font-black tracking-tight ${
                        lastResult.result === "VERIFIED" ? "text-emerald-300" : "text-rose-400"
                      }`}
                    >
                      {lastResult.result === "VERIFIED" ? "ENTRY VERIFIED ✓" : "ENTRY DENIED ✕"}
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {lastResult.result === "VERIFIED"
                        ? "Admission validated & security protection confirmed."
                        : `Reason: ${lastResult.reason || "Verification Denied"}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetForNextScan}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 shadow-sm"
                >
                  Scan Next &rarr;
                </button>
              </div>

              {/* Decision Details Card */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {lastResult.ticketNumber && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Ticket ID</span>
                    <span className="font-mono font-bold text-slate-200">{lastResult.ticketNumber}</span>
                  </div>
                )}
                {lastResult.seatNumber && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Seat Number</span>
                    <span className="font-mono font-black text-amber-400 text-sm">{lastResult.seatNumber}</span>
                  </div>
                )}
                {lastResult.movieTitle && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Movie</span>
                    <span className="font-semibold text-slate-200 truncate block">{lastResult.movieTitle}</span>
                  </div>
                )}
                {lastResult.theatreName && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Venue / Screen</span>
                    <span className="text-slate-300 truncate block">
                      {lastResult.theatreName} {lastResult.screenName ? `(${lastResult.screenName})` : ""}
                    </span>
                  </div>
                )}
                {lastResult.startTime && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Screening Time</span>
                    <span className="font-mono text-slate-300">
                      {new Date(lastResult.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {lastResult.staffName && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Verified By</span>
                    <span className="text-slate-300 truncate block">{lastResult.staffName}</span>
                  </div>
                )}
              </div>

              {lastResult.description && (
                <div className="mt-3 text-xs bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-slate-400">
                  <span className="font-semibold text-slate-300">Details: </span>
                  {lastResult.description}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-200">Checkpoint Awaiting Scan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Aim the camera at the attendee&apos;s active protection QR code, or paste the activation token to inspect validity.
              </p>
            </div>
          )}

          {/* AUDIT LOG TABLE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Verification Audit History</h3>
                <p className="text-xs text-slate-400">
                  Immutable record of checkpoint admissions and rejected attempts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Results</option>
                  <option value="VERIFIED">Verified Only</option>
                  <option value="DENIED">Denied Only</option>
                </select>

                <button
                  onClick={loadLogsAndStats}
                  disabled={loadingLogs}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50"
                  title="Refresh Audit Log"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin text-indigo-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* Logs Table */}
            {logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                No checkpoint verification attempts logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold tracking-wider sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Time</th>
                      <th className="px-3.5 py-2.5">Result</th>
                      <th className="px-3.5 py-2.5">Seat / Ticket</th>
                      <th className="px-3.5 py-2.5">Movie / Show</th>
                      <th className="px-3.5 py-2.5">Reason / Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {logs.map((log) => {
                      const isVerified = log.result === "VERIFIED";
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>

                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isVerified
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {isVerified ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              <span>{log.result}</span>
                            </span>
                          </td>

                          <td className="px-3.5 py-2.5">
                            {log.activation?.ticket ? (
                              <div className="font-mono">
                                <span className="font-bold text-amber-400">{log.activation.ticket.seatNumber}</span>{" "}
                                <span className="text-slate-500 text-[10px]">({log.activation.ticket.ticketNumber})</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px]">{log.scannedCode || "Token scan"}</span>
                            )}
                          </td>

                          <td className="px-3.5 py-2.5 truncate max-w-[140px]">
                            {log.show?.movie ? (
                              <span className="text-slate-300 font-medium">{log.show.movie.title}</span>
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </td>

                          <td className="px-3.5 py-2.5">
                            <div className="text-slate-300">{log.reason || "-"}</div>
                            <div className="text-[10px] text-slate-500 truncate">Officer: {log.staff?.name || "Staff"}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
