"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Zap,
  Activity,
  Lock,
  Search,
  Eye,
  Sliders,
  Tv,
  Film,
  Building2,
  Ticket,
  Key,
  Shield,
  History,
  Layers,
  ArrowRight,
  UserCheck,
  Ban,
  Check,
  Play,
  Share2,
  BrainCircuit,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  SecurityIncidentItem,
  ThreatAlertItem,
  SecurityScorecardData,
  ThreatPredictionItem,
  ThreatPatternItem,
  fetchSecurityIncidents,
  fetchSecurityIncidentDetails,
  fetchSecurityIncidentStats,
  fetchLiveThreatAlerts,
  fetchThreatPredictions,
  fetchThreatPatterns,
  acknowledgeSecurityIncident,
  escalateSecurityIncident,
  resolveSecurityIncident,
  executeSecurityIncidentAction,
  fetchThreatIntelStats,
  ThreatIntelStatsData,
  fetchGovernanceStats,
  GovernanceStatsData,
} from "../../lib/api";

interface AntiPiracyCommandCenterProps {
  onRefreshGlobal?: () => void;
}

export const AntiPiracyCommandCenter: React.FC<AntiPiracyCommandCenterProps> = ({
  onRefreshGlobal,
}) => {
  const [scorecard, setScorecard] = useState<SecurityScorecardData | null>(null);
  const [intelStats, setIntelStats] = useState<ThreatIntelStatsData | null>(null);
  const [govStats, setGovStats] = useState<GovernanceStatsData | null>(null);
  const [incidents, setIncidents] = useState<SecurityIncidentItem[]>([]);
  const [threatAlerts, setThreatAlerts] = useState<ThreatAlertItem[]>([]);
  const [predictions, setPredictions] = useState<ThreatPredictionItem[]>([]);
  const [patterns, setPatterns] = useState<ThreatPatternItem[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<ThreatPredictionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Detail Drawer
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [incidentDetail, setIncidentDetail] = useState<{
    incident: SecurityIncidentItem;
    correlationGraph: any;
  } | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      const [statsData, intelStatsData, govStatsData, incidentsData, alertsData, predData, patData] = await Promise.all([
        fetchSecurityIncidentStats(token).catch(() => null),
        fetchThreatIntelStats(token).catch(() => null),
        fetchGovernanceStats(token).catch(() => null),
        fetchSecurityIncidents(
          {
            severity: filterSeverity || undefined,
            status: filterStatus || undefined,
          },
          token
        ).catch(() => ({ incidents: [], totalCount: 0 })),
        fetchLiveThreatAlerts(token).catch(() => []),
        fetchThreatPredictions(token).catch(() => []),
        fetchThreatPatterns(token).catch(() => []),
      ]);

      if (statsData) setScorecard(statsData);
      if (intelStatsData) setIntelStats(intelStatsData);
      if (govStatsData) setGovStats(govStatsData);
      setIncidents(incidentsData.incidents || []);
      setThreatAlerts(alertsData || []);
      setPredictions(predData || []);
      setPatterns(patData || []);
    } catch (err) {
      console.error("Failed to load command center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterSeverity, filterStatus]);

  // Establish SSE Live Security Stream
  useEffect(() => {
    const token = localStorage.getItem("token");
    const streamUrl = `/api/security/live-stream`;

    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.addEventListener("threat_alert", (e: MessageEvent) => {
        try {
          const alert = JSON.parse(e.data);
          setThreatAlerts((prev) => [alert, ...prev.slice(0, 19)]);
          loadData();
        } catch {}
      });

      es.addEventListener("incident_created", () => {
        loadData();
      });

      es.addEventListener("incident_updated", () => {
        loadData();
      });

      es.addEventListener("action_executed", () => {
        loadData();
      });

      es.onerror = () => {
        setSseConnected(false);
      };

      return () => {
        es.close();
      };
    } catch (err) {
      console.warn("SSE connection error:", err);
    }
  }, []);

  const handleOpenDrawer = async (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setDrawerLoading(true);
    setActionFeedback(null);
    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await fetchSecurityIncidentDetails(incidentId, token);
      setIncidentDetail(res);
    } catch (err: any) {
      console.error("Failed to load incident detail:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    const token = localStorage.getItem("token") || undefined;
    try {
      await acknowledgeSecurityIncident(id, token);
      setActionFeedback({ type: "success", text: "Incident acknowledged." });
      handleOpenDrawer(id);
      loadData();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to acknowledge" });
    }
  };

  const handleEscalate = async (id: string) => {
    if (!window.confirm("Escalate incident to CRITICAL?")) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      await escalateSecurityIncident(id, token);
      setActionFeedback({ type: "success", text: "Incident escalated to CRITICAL." });
      handleOpenDrawer(id);
      loadData();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to escalate" });
    }
  };

  const handleResolve = async (id: string) => {
    const notes = prompt("Enter resolution notes:", "Investigated and mitigated.");
    if (notes === null) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      await resolveSecurityIncident(id, notes, token);
      setActionFeedback({ type: "success", text: "Incident marked as RESOLVED." });
      handleOpenDrawer(id);
      loadData();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to resolve" });
    }
  };

  const handleExecuteAction = async (actionType: string) => {
    if (!selectedIncidentId) return;
    if (!window.confirm(`Execute automated containment action [${actionType}]?`)) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await executeSecurityIncidentAction(
        selectedIncidentId,
        { actionType, reason: `Command Center execution: ${actionType}` },
        token
      );
      if (res.success) {
        setActionFeedback({ type: "success", text: `Action executed: ${res.data.details}` });
        handleOpenDrawer(selectedIncidentId);
        loadData();
        if (onRefreshGlobal) onRefreshGlobal();
      }
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Action execution failed." });
    }
  };

  const getPostureColor = (posture?: string) => {
    switch (posture) {
      case "CRITICAL":
        return "from-rose-950 via-slate-900 to-rose-950 border-rose-600/50 text-rose-300";
      case "HIGH":
        return "from-amber-950 via-slate-900 to-amber-950 border-amber-600/50 text-amber-300";
      case "ELEVATED":
        return "from-indigo-950 via-slate-900 to-indigo-950 border-indigo-600/50 text-indigo-300";
      default:
        return "from-emerald-950 via-slate-900 to-emerald-950 border-emerald-600/50 text-emerald-300";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">LOW</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. THREAT POSTURE HEADER BANNER */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getPostureColor(scorecard?.posture)} border p-6 shadow-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
                <Radio className={`w-3.5 h-3.5 ${sseConnected ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
                <span>Live Security Stream ({sseConnected ? "Active SSE" : "Polling Mode"})</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-950/90 border border-slate-700">
                Threat Posture: {scorecard?.posture || "NORMAL"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-8 h-8 text-indigo-400" /> Real-Time Anti-Piracy Command Center
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Live threat correlation, active playback authorization monitoring, automated containment gates, and incident management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shadow-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 ZERO-TRUST GOVERNANCE & PRIVILEGED APPROVAL STATUS STRIP (PHASE 19) */}
      {govStats && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero-Trust: {govStats.overallTrustPosture}</span>
            </span>
            <span className="text-slate-400">
              Active Policies: <strong className="text-slate-200">{govStats.activePolicies}</strong> • Evaluated Decisions: <strong className="text-slate-200">{govStats.totalDecisions}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {govStats.activeBreakGlassCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                🚨 {govStats.activeBreakGlassCount} Break-Glass Active
              </span>
            )}
            {govStats.pendingApprovals > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                🔒 {govStats.pendingApprovals} Pending Approvals
              </span>
            )}
            <span className="text-slate-400">
              Trusted Devices: <strong className="text-purple-400">{govStats.trustedDevicesCount}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 2. LIVE KPI SCORECARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">Active Incidents</div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{scorecard?.activeIncidentsCount ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">Critical Threats</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{scorecard?.criticalThreatsCount ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">Active Playbacks</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{scorecard?.activePlaybacksCount ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">DRM Denials</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{scorecard?.drmDenialsCount ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">Check Denials</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{scorecard?.verificationDenialsCount ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">Suspicious Sessions</div>
          <div className="text-2xl font-bold font-mono text-orange-400 mt-1">{scorecard?.suspiciousSessionsCount ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">Auto Responses</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{scorecard?.automatedActionsCount ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium truncate">Open Inquiries</div>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-1">{scorecard?.openInvestigationsCount ?? 0}</div>
        </div>
      </div>

      {/* 2.5 AI PREDICTIVE THREAT & EMERGING PATTERNS LAYER */}
      {predictions.length > 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">AI Predictive Screening Risk & Emerging Patterns</h2>
            </div>
            <span className="text-xs text-indigo-300 font-mono">Forecast Horizon: 24h</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.slice(0, 2).map((pred) => (
              <div
                key={pred.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{pred.movie?.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {pred.theatre?.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{pred.explanation}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-amber-400 block">{pred.predictedRisk}/100</span>
                    <span className="text-[10px] text-slate-500">Conf: {pred.confidence}%</span>
                  </div>
                  <button
                    onClick={() => setSelectedPrediction(pred)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. LIVE THREAT FEED & RECENT ANOMALIES */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" /> Live Threat & Anomaly Feed (SSE Stream)
          </h2>
          <span className="text-xs text-slate-400 font-mono">Stream ID: SOC-LIVE-{Date.now().toString(36).toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {threatAlerts.length === 0 ? (
            <div className="col-span-3 p-6 text-center text-slate-500 bg-slate-950/40 rounded-xl">
              No active threat anomalies detected. Stream is tranquil.
            </div>
          ) : (
            threatAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border space-y-2 transition-all ${
                  alert.severity === "CRITICAL"
                    ? "bg-rose-950/30 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/20"
                    : "bg-slate-950/60 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs truncate">{alert.alertType}</span>
                  {getSeverityBadge(alert.severity)}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{alert.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Risk: <strong className="text-amber-400 font-mono">{alert.riskScore}/100</strong></span>
                  <span className="font-mono">{new Date(alert.detectedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. INCIDENT QUEUE */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Active Security Incidents Queue
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational triage queue with automated containment triggers and correlation graphs.
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
              <option value="NEW">New</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Incident Number & Title</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Status</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Source</th>
                <th className="p-3">Venue / Show</th>
                <th className="p-3">Detected</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No active security incidents found. Threat posture is secure.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-200">{inc.incidentNumber}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{inc.title}</div>
                    </td>
                    <td className="p-3">{getSeverityBadge(inc.severity)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {inc.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold font-mono ${inc.riskScore >= 75 ? "text-rose-400" : inc.riskScore >= 50 ? "text-amber-400" : "text-slate-300"}`}>
                        {inc.riskScore}/100
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono">{inc.source}</td>
                    <td className="p-3 text-slate-300">
                      <div>{inc.theatre?.name || "Global / Online"}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {inc.movie?.title || "Screening"}
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 font-mono">
                      {new Date(inc.detectedAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenDrawer(inc.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. INCIDENT DETAIL DRAWER & VISUAL THREAT CORRELATION GRAPH */}
      {incidentDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-slideLeft">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-indigo-400">{incidentDetail.incident.incidentNumber}</span>
                  {getSeverityBadge(incidentDetail.incident.severity)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {incidentDetail.incident.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{incidentDetail.incident.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{incidentDetail.incident.description}</p>
              </div>

              <button
                onClick={() => setIncidentDetail(null)}
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

            {/* Quick Operator Actions */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
              <span className="text-xs text-slate-400 font-semibold block">Incident Lifecycle Actions:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAcknowledge(incidentDetail.incident.id)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => handleEscalate(incidentDetail.incident.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                >
                  Escalate to CRITICAL
                </button>
                <button
                  onClick={() => handleResolve(incidentDetail.incident.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
                >
                  Resolve Incident
                </button>
              </div>
            </div>

            {/* Automated Containment Gates */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
              <span className="text-xs text-rose-300 font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Containment & Mitigation Controls:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExecuteAction("SESSION_REVOKED")}
                  className="p-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold text-left"
                >
                  Terminate Playback
                </button>
                <button
                  onClick={() => handleExecuteAction("DRM_REVOKED")}
                  className="p-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold text-left"
                >
                  Revoke DRM License
                </button>
                <button
                  onClick={() => handleExecuteAction("ACTIVATION_REVOKED")}
                  className="p-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold text-left"
                >
                  Revoke QR & Ticket
                </button>
                <button
                  onClick={() => handleExecuteAction("INVESTIGATION_CREATED")}
                  className="p-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-semibold text-left"
                >
                  Launch Investigation
                </button>
              </div>
            </div>

            {/* VISUAL THREAT CORRELATION GRAPH */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-400" /> Theatrical Entity Correlation Graph
              </h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="text-[11px] text-slate-500 font-mono mb-2">
                  {incidentDetail.correlationGraph?.chain}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {incidentDetail.correlationGraph?.nodes?.map((node: any) => (
                    <div key={node.id} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs">
                      <div className="text-[10px] text-slate-500 uppercase">{node.type}</div>
                      <div className="font-semibold text-slate-200 truncate mt-0.5">{node.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Immutable Action Log */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" /> Response Actions History ({incidentDetail.incident.actions?.length || 0})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(!incidentDetail.incident.actions || incidentDetail.incident.actions.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-lg">No response actions executed yet.</p>
                ) : (
                  incidentDetail.incident.actions.map((act) => (
                    <div key={act.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200">{act.actionType}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">Result: {act.result}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(act.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREDICTIVE EXPLAIN MODAL */}
      {selectedPrediction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">AI Screening Risk Explanation</h3>
              </div>
              <button onClick={() => setSelectedPrediction(null)} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">Predicted Risk</span>
                <span className="text-2xl font-bold font-mono text-amber-400">{selectedPrediction.predictedRisk}/100</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">Confidence Rating</span>
                <span className="text-2xl font-bold font-mono text-indigo-400">{selectedPrediction.confidence}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Contributing Telemetry Factors</h4>
              <p className="text-xs text-slate-300 p-3 rounded-lg bg-slate-950 border border-slate-800 leading-relaxed">
                {selectedPrediction.explanation}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Recommended Action</h4>
              <p className="text-xs text-indigo-300 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 leading-relaxed">
                {selectedPrediction.recommendedAction}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
