"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  Maximize2,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Tv,
  Film,
  Ticket,
  Lock,
  Zap,
  Activity,
  Layers,
  XCircle,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import { ProtectedPlayer } from "./ProtectedPlayer";
import {
  ProtectionSessionInfo,
  ProtectionEventItem,
  ProtectionMonitoringStats,
  PlaybackSessionItem,
  PlaybackStats,
  ActivationItem,
  TicketItem,
  ShowItem,
  UserProfile,
  startProtectionSession,
  revokeProtectionSession,
  fetchProtectionSessions,
  fetchProtectionEvents,
  fetchProtectionStats,
  fetchPlaybackSessions,
  fetchPlaybackStats,
} from "../../lib/api";

interface ProtectionMonitoringProps {
  user: UserProfile | null;
  tickets?: TicketItem[];
  shows?: ShowItem[];
  onRefresh?: () => void;
}

export const ProtectionMonitoring: React.FC<ProtectionMonitoringProps> = ({
  user,
  tickets = [],
  shows = [],
  onRefresh,
}) => {
  // Stats
  const [stats, setStats] = useState<ProtectionMonitoringStats>({
    activeSessions: 0,
    expiredSessions: 0,
    revokedSessions: 0,
    totalEvents: 0,
    securityThreats: 0,
  });

  const [playbackStats, setPlaybackStats] = useState<PlaybackStats>({
    activeStreams: 0,
    authorizedStreams: 0,
    expiredSessions: 0,
    terminatedSessions: 0,
    deniedAttempts: 0,
  });

  // Sessions, Playback, and Events
  const [sessions, setSessions] = useState<any[]>([]);
  const [playbackSessions, setPlaybackSessions] = useState<PlaybackSessionItem[]>([]);
  const [events, setEvents] = useState<ProtectionEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [sessionFilter, setSessionFilter] = useState<string>("");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Live Protected Player Demo Sandbox state
  const [activePlayerSession, setActivePlayerSession] = useState<ProtectionSessionInfo | null>(null);
  const [launchTokenInput, setLaunchTokenInput] = useState<string>("");
  const [launchingPlayer, setLaunchingPlayer] = useState<boolean>(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Load all monitoring data
  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      const [statsData, pbStatsData, sessionsData, pbSessionsData, eventsData] = await Promise.all([
        fetchProtectionStats().catch(() => ({
          activeSessions: 0,
          expiredSessions: 0,
          revokedSessions: 0,
          totalEvents: 0,
          securityThreats: 0,
        })),
        fetchPlaybackStats().catch(() => ({
          activeStreams: 0,
          authorizedStreams: 0,
          expiredSessions: 0,
          terminatedSessions: 0,
          deniedAttempts: 0,
        })),
        fetchProtectionSessions({ status: sessionFilter || undefined }).catch(() => []),
        fetchPlaybackSessions().catch(() => []),
        fetchProtectionEvents({ eventType: eventFilter || undefined }).catch(() => []),
      ]);

      setStats(statsData);
      setPlaybackStats(pbStatsData);
      setSessions(sessionsData);
      setPlaybackSessions(pbSessionsData);
      setEvents(eventsData);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error loading protection data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoringData();
  }, [sessionFilter, eventFilter]);

  // Launch Protected Player for a given token / ticket
  const handleLaunchPlayer = async (tokenCode: string) => {
    if (!tokenCode.trim()) return;
    setLaunchingPlayer(true);
    setLaunchError(null);

    try {
      const res = await startProtectionSession(tokenCode.trim());
      if (res.success && res.data) {
        setActivePlayerSession(res.data);
      } else {
        setLaunchError(res.message || "Failed to start protection session");
      }
    } catch (err: any) {
      setLaunchError(err.message || "Network error starting protection player");
    } finally {
      setLaunchingPlayer(false);
    }
  };

  // Revoke Session
  const handleRevokeSession = async (activationId: string, seatNum?: string) => {
    if (!confirm(`Are you sure you want to revoke protection session for seat ${seatNum || activationId}?`)) return;

    try {
      const res = await revokeProtectionSession(activationId, "Manual admin security intervention");
      if (res.success) {
        if (activePlayerSession?.activationId === activationId) {
          setActivePlayerSession((prev) => (prev ? { ...prev, status: "REVOKED" } : null));
        }
        loadMonitoringData();
      } else {
        alert(res.message || "Failed to revoke session");
      }
    } catch (err: any) {
      alert(err.message || "Error revoking session");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Phase 6 Dynamic Protection Active
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight mt-1">
                Anti-Piracy Dynamic Watermark & Protection Layer
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-node moving watermarks, cryptographic heartbeats, window privacy shielding, and security event auditing.
              </p>
            </div>
          </div>

          <button
            onClick={loadMonitoringData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh Stream</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>ACTIVE SESSIONS</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.activeSessions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Live watermarked streams</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>EXPIRED SESSIONS</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300">{stats.expiredSessions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Concluded screening windows</div>
        </div>

        <div className="bg-slate-900/80 border border-rose-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>REVOKED SESSIONS</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{stats.revokedSessions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cancelled by security</div>
        </div>

        <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>PROTECTION EVENTS</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">{stats.totalEvents}</div>
          <div className="text-[11px] text-slate-500 mt-1">Heartbeats & player transitions</div>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>THREAT DETECTIONS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{stats.securityThreats}</div>
          <div className="text-[11px] text-slate-500 mt-1">Capture shortcut traps</div>
        </div>
      </div>

      {/* PROTECTED PLAYER DEMO SANDBOX (Core Phase 6 Demonstration) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              Protected Screening Player Sandbox
            </h2>
            <p className="text-xs text-slate-400">
              Interactive testbed with live dynamic watermark overlay, periodic position shift, and heartbeat validation.
            </p>
          </div>

          {/* Quick Launch form */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={launchTokenInput}
              onChange={(e) => setLaunchTokenInput(e.target.value)}
              placeholder="Ticket ID / Token..."
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleLaunchPlayer(launchTokenInput)}
              disabled={launchingPlayer || !launchTokenInput.trim()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50 transition-colors"
            >
              {launchingPlayer ? "Loading..." : "Launch Player"}
            </button>
          </div>
        </div>

        {launchError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{launchError}</span>
          </div>
        )}

        {/* Player Display */}
        {activePlayerSession ? (
          <div className="space-y-4">
            <ProtectedPlayer
              session={activePlayerSession}
              onSessionTerminated={(reason) => {
                setActivePlayerSession((prev) => (prev ? { ...prev, status: "REVOKED" } : null));
                loadMonitoringData();
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-4 font-mono text-slate-300">
                <span>Activation: <strong className="text-indigo-400">{activePlayerSession.watermark.shortActivationId}</strong></span>
                <span>Theatre: <strong className="text-slate-200">{activePlayerSession.watermark.theatreCode}</strong></span>
                <span>Seat: <strong className="text-amber-400">{activePlayerSession.watermark.seatNumber}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRevokeSession(activePlayerSession.activationId, activePlayerSession.seatNumber)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-lg transition-colors"
                >
                  Test Revoke Session &rarr;
                </button>
                <button
                  onClick={() => setActivePlayerSession(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Close Player
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-950/60 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Play className="w-6 h-6 ml-0.5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No Active Player Stream</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select any issued or active ticket below, or paste an activation code to simulate the protected viewing experience with dynamic multi-node watermarking.
            </p>

            {tickets.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {tickets.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleLaunchPlayer(t.activation?.activationCode || t.ticketNumber)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-xs font-mono text-slate-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>Seat {t.seatNumber}</span>
                    <span className="text-[10px] text-slate-500">({t.show.movie.title})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid: Active Sessions Left (6 cols) + Protection Event Log Right (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SESSIONS & PLAYBACK TABLE (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Secure Playback Streams</h3>
              <p className="text-xs text-slate-400">Short-lived authorized playback sessions & DRM status</p>
            </div>

            <span className="text-xs font-mono text-indigo-400">
              {playbackSessions.length} Streams
            </span>
          </div>

          {playbackSessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
              No secure playback sessions active.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Token / Seat</th>
                    <th className="px-3.5 py-2.5">Movie & Venue</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {playbackSessions.map((ps) => (
                    <tr key={ps.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-amber-400">
                          {ps.activation?.ticket?.seatNumber ? `Seat ${ps.activation.ticket.seatNumber}` : "Seat -"}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[110px]">
                          {ps.sessionToken}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 font-sans">
                        <div className="font-semibold text-slate-200 truncate max-w-[130px]">
                          {ps.videoAsset?.movie?.title || "Movie"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {ps.theatre?.code} &bull; {ps.show?.screen?.name || "Screen"}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            ps.status === "ACTIVE" || ps.status === "AUTHORIZED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : ps.status === "TERMINATED" || ps.status === "DENIED"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {ps.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PROTECTION EVENT AUDIT STREAM (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Protection Event Log</h3>
              <p className="text-xs text-slate-400">Auditable telemetry and security events</p>
            </div>

            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Events</option>
              <option value="SESSION_STARTED">SESSION_STARTED</option>
              <option value="SESSION_HEARTBEAT">SESSION_HEARTBEAT</option>
              <option value="SESSION_EXPIRED">SESSION_EXPIRED</option>
              <option value="SESSION_REVOKED">SESSION_REVOKED</option>
              <option value="PLAYER_STARTED">PLAYER_STARTED</option>
              <option value="PLAYER_STOPPED">PLAYER_STOPPED</option>
              <option value="FULLSCREEN_ENTERED">FULLSCREEN_ENTERED</option>
              <option value="SCREENSHOT_ATTEMPT_DETECTED">SCREENSHOT_DETECTED</option>
            </select>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
              No protection events logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">Time</th>
                    <th className="px-3 py-2.5">Event Type</th>
                    <th className="px-3 py-2.5">Seat / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      <td className="px-3 py-2 font-mono text-[11px]">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ev.eventType === "SCREENSHOT_ATTEMPT_DETECTED"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : ev.eventType === "SESSION_REVOKED" || ev.eventType === "SESSION_EXPIRED"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : ev.eventType === "SESSION_STARTED" || ev.eventType === "FULLSCREEN_ENTERED"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {ev.eventType}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-slate-400 truncate max-w-[150px]">
                        <span className="font-mono text-amber-400 font-semibold mr-1">
                          {ev.activation?.ticket?.seatNumber ? `[${ev.activation.ticket.seatNumber}]` : ""}
                        </span>
                        <span>{ev.metadata || ev.theatre?.code || "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ETHICAL PLATFORM SECURITY NOTICE (Prompt Requirements & Best Practices) */}
      <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-slate-200">Anti-Piracy Architecture & Platform Boundaries</h4>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            The Theatre Guard Dynamic Protection Layer provides cryptographic session tracking, anti-recording multi-node rotating watermarks, focus privacy shields, and heartbeat validation. Modern web sandbox standards intentionally isolate web applications from unauthorized hardware access, ensuring privacy-safe protection without claiming impossible physical camera control.
          </p>
        </div>
      </div>
    </div>
  );
};
