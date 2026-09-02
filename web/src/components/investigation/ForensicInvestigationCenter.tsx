"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Fingerprint,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  RefreshCw,
  Film,
  Building2,
  Tv,
  Ticket,
  Key,
  Flame,
  Shield,
  History,
  FileText,
  Plus,
  Send,
  Eye,
  Zap,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check,
} from "lucide-react";
import {
  IncidentItem,
  WatermarkLookupData,
  SessionTimelineData,
  ThreatIntelligenceSummaryData,
  fetchIncidents,
  createIncident,
  fetchIncidentDetails,
  updateIncidentStatus,
  attachForensicEvidence,
  addInvestigationNote,
  mitigateIncident,
  lookupWatermark,
  fetchSessionForensicTimeline,
  fetchThreatIntelligence,
} from "../../lib/api";

import InvestigationCaseManager from "./InvestigationCaseManager";

interface ForensicInvestigationCenterProps {
  onRefreshGlobal?: () => void;
}

export const ForensicInvestigationCenter: React.FC<ForensicInvestigationCenterProps> = ({
  onRefreshGlobal,
}) => {
  const [subTab, setSubTab] = useState<"CASES" | "TRACER" | "INCIDENTS">("CASES");
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [threatSummary, setThreatSummary] = useState<ThreatIntelligenceSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Watermark Lookup state
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<WatermarkLookupData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Session Timeline state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<SessionTimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Incident Modal state
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [newNote, setNewNote] = useState("");
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Filter state
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const loadAllData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      const [incidentsData, threatData] = await Promise.all([
        fetchIncidents(
          {
            severity: filterSeverity || undefined,
            status: filterStatus || undefined,
          },
          token
        ).catch(() => ({ incidents: [], totalCount: 0 })),
        fetchThreatIntelligence(token).catch(() => null),
      ]);

      setIncidents(incidentsData.incidents || []);
      if (threatData) setThreatSummary(threatData);
    } catch (err: any) {
      console.error("Failed to load investigation center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [filterSeverity, filterStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadAllData();
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh, filterSeverity, filterStatus]);

  const handleSearchWatermark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await lookupWatermark(searchQuery.trim(), token);
      if (res.found) {
        setLookupResult(res);
        if (res.playbackSession?.id) {
          handleViewTimeline(res.playbackSession.id);
        }
      } else {
        setLookupError("No screening session or watermark match found for the query.");
      }
    } catch (err: any) {
      setLookupError(err.message || "Watermark lookup failed.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleViewTimeline = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setTimelineLoading(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await fetchSessionForensicTimeline(sessionId, token);
      setTimelineData(res);
    } catch (err: any) {
      console.error("Failed to load session timeline:", err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleOpenIncidentModal = async (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setModalLoading(true);
    setActionFeedback(null);
    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await fetchIncidentDetails(incidentId, token);
      setSelectedIncident(res);
    } catch (err: any) {
      console.error("Failed to load incident modal details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: string) => {
    if (!selectedIncident) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await updateIncidentStatus(selectedIncident.id, { status: nextStatus }, token);
      setSelectedIncident({ ...selectedIncident, status: res.status });
      setActionFeedback({ type: "success", text: `Status updated to ${nextStatus}.` });
      loadAllData();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to update status." });
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newNote.trim()) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      const noteRecord = await addInvestigationNote(selectedIncident.id, newNote, token);
      setSelectedIncident({
        ...selectedIncident,
        notes: [noteRecord, ...(selectedIncident.notes || [])],
      });
      setNewNote("");
      setActionFeedback({ type: "success", text: "Investigation note added." });
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to add note." });
    }
  };

  const handleMitigate = async () => {
    if (!selectedIncident) return;
    if (!window.confirm("Execute immediate forensic mitigation? This will terminate active playback and revoke DRM keys.")) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await mitigateIncident(
        selectedIncident.id,
        { actionType: "FULL_REVOCATION", reason: "Incident confirmed in Forensic Center" },
        token
      );
      if (res.success) {
        setActionFeedback({ type: "success", text: res.message || "Mitigation executed successfully." });
        handleOpenIncidentModal(selectedIncident.id);
        loadAllData();
        if (onRefreshGlobal) onRefreshGlobal();
      }
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Mitigation failed." });
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">LOW</span>;
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "DETECTED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">DETECTED</span>;
      case "TRIAGED":
      case "INVESTIGATING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">{status}</span>;
      case "CONFIRMED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">CONFIRMED</span>;
      case "MITIGATED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">MITIGATED</span>;
      case "CLOSED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">CLOSED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-900/40 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Phase 13 Anti-Piracy Intelligence & Forensics
              </span>
              {threatSummary?.overallThreatLevel === "CRITICAL" && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold animate-pulse">
                  CRITICAL THREATS ACTIVE
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Fingerprint className="w-7 h-7 text-indigo-400" /> Anti-Piracy Forensic Intelligence Center
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Reverse watermark tracing, zero-PII forensic session resolution, multi-signal threat scoring, and instant containment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                autoRefresh
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-sm"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? "animate-pulse text-indigo-400" : ""}`} />
              <span>Auto Refresh ({autoRefresh ? "12s" : "Off"})</span>
            </button>

            <button
              onClick={() => loadAllData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. THREAT INTELLIGENCE SCOREBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Platform Threat Level</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {threatSummary?.overallThreatLevel || "LOW"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Active High Risk: {threatSummary?.activeHighRiskEntitiesCount ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Average Threat Score</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {threatSummary?.averageRiskScore ?? 15}{" "}
            <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Rule-based multi-signal evaluation
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total Active Incidents</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {incidents.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Critical: {threatSummary?.threatDistribution.criticalCount ?? 0} &bull; High: {threatSummary?.threatDistribution.highCount ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Forensic Tracing Engine</span>
            <Fingerprint className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            ACTIVE
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Zero-PII Payload v1.3
          </div>
        </div>
      </div>

      {/* SUB TAB NAVIGATOR */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab("CASES")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            subTab === "CASES"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🕵️ Investigation Case Dossiers
        </button>
        <button
          onClick={() => setSubTab("TRACER")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            subTab === "TRACER"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🔬 Reverse Watermark & Session Tracer
        </button>
        <button
          onClick={() => setSubTab("INCIDENTS")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            subTab === "INCIDENTS"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          ⚡ Threat Incidents & Mitigation ({incidents.length})
        </button>
      </div>

      {/* VIEW 1: INVESTIGATION CASE DOSSIERS */}
      {subTab === "CASES" && <InvestigationCaseManager />}

      {/* VIEW 2: WATERMARK FORENSIC LOOKUP & TRACE TOOL */}
      {subTab === "TRACER" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" /> Reverse Watermark & Session Forensic Trace Tool
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Input an extracted forensic watermark string (e.g. <code>AGY-V13:...</code>), Session ID, or SHA-256 fingerprint to resolve the full theatrical screening chain.
          </p>
        </div>

        <form onSubmit={handleSearchWatermark} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Paste watermark string, Session ID, Token, or SHA-256 fingerprint hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Trace Watermark</span>
          </button>
        </form>

        {lookupError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {lookupResult && lookupResult.found && (
          <div className="p-5 rounded-xl bg-slate-950/80 border border-indigo-900/50 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> WATERMARK MATCH CONFIRMED
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Fingerprint: {lookupResult.watermarkPayload?.fingerprintHash.slice(0, 16)}...
                </span>
              </div>

              {lookupResult.playbackSession?.id && (
                <button
                  onClick={() => handleViewTimeline(lookupResult.playbackSession!.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <span>View Chronological Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/60">
                <div className="text-slate-500 text-[11px]">Movie Title</div>
                <div className="font-semibold text-slate-200 truncate mt-0.5">{lookupResult.movie?.title}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/60">
                <div className="text-slate-500 text-[11px]">Theatrical Venue</div>
                <div className="font-semibold text-slate-200 truncate mt-0.5">{lookupResult.theatre?.name}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/60">
                <div className="text-slate-500 text-[11px]">Auditorium & Seat</div>
                <div className="font-semibold text-amber-400 truncate mt-0.5">
                  Screen {lookupResult.screen?.screenNumber} &bull; Seat {lookupResult.ticket?.seatNumber}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/60">
                <div className="text-slate-500 text-[11px]">Admission Ticket</div>
                <div className="font-mono text-slate-200 truncate mt-0.5">{lookupResult.ticket?.ticketNumber}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/60">
                <div className="text-slate-500 text-[11px]">Playback Session</div>
                <div className="font-mono text-indigo-300 truncate mt-0.5">{lookupResult.playbackSession?.id.slice(0, 10)}...</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/60">
                <div className="text-slate-500 text-[11px]">DRM License Status</div>
                <div className="font-semibold text-emerald-400 truncate mt-0.5">{lookupResult.drmLicense?.status || "ACTIVE"}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CHRONOLOGICAL SESSION FORENSIC TIMELINE (IF SELECTED) */}
      {timelineData && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-900/40 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" /> Chronological Session Forensic Timeline
            </h3>
            <button
              onClick={() => setTimelineData(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close Timeline
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex flex-wrap items-center gap-4 text-slate-300">
            <div><strong>Movie:</strong> {timelineData.session.movie}</div>
            <div><strong>Venue:</strong> {timelineData.session.theatre}</div>
            <div><strong>Auditorium:</strong> {timelineData.session.screen}</div>
            <div><strong>Seat:</strong> <span className="text-amber-400 font-bold">{timelineData.session.seat}</span></div>
            <div><strong>Ticket:</strong> <span className="font-mono">{timelineData.session.ticketNumber}</span></div>
            <div><strong>Session Status:</strong> <span className="font-semibold text-emerald-400">{timelineData.session.status}</span></div>
          </div>

          <div className="space-y-3 pt-2 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
            {timelineData.timeline.map((ev, idx) => (
              <div key={idx} className="relative pl-9 text-xs space-y-0.5">
                <div
                  className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 -translate-x-1/2 ${
                    ev.severity === "CRITICAL"
                      ? "bg-rose-500 border-rose-300"
                      : ev.severity === "HIGH"
                      ? "bg-amber-500 border-amber-300"
                      : "bg-indigo-600 border-indigo-300"
                  }`}
                />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  <span className="font-bold text-slate-200">{ev.title}</span>
                  {getSeverityBadge(ev.severity)}
                </div>
                <p className="text-slate-400 text-[11px]">{ev.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      )}

      {/* VIEW 3: PIRACY INCIDENT QUEUE */}
      {subTab === "INCIDENTS" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" /> Piracy Incident Management Queue
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Triage suspected screening leaks, inspect cryptographic evidence hashes, and execute one-click mitigations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="DETECTED">Detected</option>
                <option value="TRIAGED">Triaged</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="MITIGATED">Mitigated</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Incident ID & Title</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Auditorium Trace</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No security incidents found in the active queue.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenIncidentModal(inc.id)}
                    >
                      <td className="p-3">
                        <div className="font-mono text-indigo-400 font-bold">{inc.incidentNumber}</div>
                        <div className="font-semibold text-slate-200 group-hover:text-white transition-colors">{inc.title}</div>
                      </td>
                      <td className="p-3">{getSeverityBadge(inc.severity)}</td>
                      <td className="p-3">{getStatusPill(inc.status)}</td>
                      <td className="p-3 font-mono font-bold text-amber-400">
                        {inc.riskScore ?? "--"}/100
                      </td>
                      <td className="p-3 text-slate-400">
                        {inc.theatre ? `${inc.theatre.name}` : "Global"}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {new Date(inc.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenIncidentModal(inc.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. INCIDENT INVESTIGATION MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-indigo-400 font-bold">{selectedIncident.incidentNumber}</span>
                  {getSeverityBadge(selectedIncident.severity)}
                  {getStatusPill(selectedIncident.status)}
                </div>
                <h2 className="text-lg font-bold text-white">{selectedIncident.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedIncident.description}</p>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {actionFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  actionFeedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {actionFeedback.text}
              </div>
            )}

            {/* Lifecycle Controls */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Status Workflow Transition:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {["TRIAGED", "INVESTIGATING", "CONFIRMED", "MITIGATED", "CLOSED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        selectedIncident.status === st
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleMitigate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>One-Click Mitigate (Revoke Session)</span>
              </button>
            </div>

            {/* Evidence & Notes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Evidence Ledger */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" /> Attached Forensic Evidence ({selectedIncident.evidence?.length || 0})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(!selectedIncident.evidence || selectedIncident.evidence.length === 0) ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-lg">No forensic evidence attached yet.</p>
                  ) : (
                    selectedIncident.evidence.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{ev.evidenceType}</span>
                          <span className="text-indigo-400 font-mono">{ev.confidenceScore}% Confidence</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">
                          SHA256: {ev.evidenceHash}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Captured: {new Date(ev.detectedAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Investigator Notes */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" /> Investigator Notes ({selectedIncident.notes?.length || 0})
                </h3>
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add audit investigation note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(!selectedIncident.notes || selectedIncident.notes.length === 0) ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-lg">No notes recorded yet.</p>
                  ) : (
                    selectedIncident.notes.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                        <p className="text-slate-300">{n.note}</p>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {n.investigatorEmail || "Investigator"} &bull; {new Date(n.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
