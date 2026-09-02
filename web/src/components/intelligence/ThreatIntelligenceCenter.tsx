"use client";

import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  Fingerprint,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
  ChevronRight,
  X,
  Play,
  ArrowRight,
  Zap,
} from "lucide-react";
import {
  fetchIntelligenceOverview,
  executeIntelligenceAction,
  resolveIntelligenceIncident,
  IntelligenceOverviewData,
  IntelligenceFeedItem,
} from "../../lib/api";

interface ThreatIntelligenceCenterProps {
  onRefreshGlobal?: () => void;
  onNavigateToForensics?: (incidentId?: string) => void;
}

export const ThreatIntelligenceCenter: React.FC<ThreatIntelligenceCenterProps> = ({
  onRefreshGlobal,
  onNavigateToForensics,
}) => {
  const [data, setData] = useState<IntelligenceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IntelligenceFeedItem | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      const overview = await fetchIntelligenceOverview(token);
      setData(overview);
    } catch (err) {
      console.error("Failed to load intelligence overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteAction = async (incident: IntelligenceFeedItem, actionType: string) => {
    setExecutingAction(true);
    setActionMessage(null);
    const token = localStorage.getItem("token") || undefined;
    try {
      const res = await executeIntelligenceAction(
        {
          incidentId: incident.incidentId,
          actionType,
          reason: `Analyst executed ${actionType} from Threat Intelligence Center`,
          isApprovedBySoc: true,
        },
        token
      );

      setActionMessage(res.message || "Containment action executed successfully");
      await loadData();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err: any) {
      setActionMessage(`Execution failed: ${err.message}`);
    } finally {
      setExecutingAction(false);
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
      case "GUARDED":
        return "from-sky-950 via-slate-900 to-sky-950 border-sky-600/50 text-sky-300";
      default:
        return "from-emerald-950 via-slate-900 to-emerald-950 border-emerald-600/50 text-emerald-300";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. THREAT POSTURE BANNER */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getPostureColor(data?.threatPosture)} border p-6 shadow-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Explainable Anti-Piracy Intelligence Mesh</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-950/90 border border-slate-700">
                Threat Posture: {data?.threatPosture || "NORMAL"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-8 h-8 text-rose-400" /> AI Threat Intelligence & Automated Response
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Multi-signal threat correlation, deterministic 0–100 risk scoring, forensic watermark linking, and controlled automated containment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shadow-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Correlate Feeds</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Incidents</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {data?.kpis.activeIncidents ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Clustered threats</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Critical Threats</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {data?.kpis.criticalThreats ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Risk Score &ge; 80</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">High Threats</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {data?.kpis.highThreats ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Risk Score 60–79</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Suspicious Sessions</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {data?.kpis.suspiciousSessions ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Abnormal playback</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">DRM Anomalies</span>
            <Sliders className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {data?.kpis.drmAnomalies ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Revoked / Denied keys</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Correlated Signals</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {data?.kpis.correlatedSignals ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Telemetry indicators</div>
        </div>
      </div>

      {/* 3. RISK DISTRIBUTION & PIPELINE STATE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" /> Deterministic Risk Distribution (0–100)
          </h2>
          <div className="space-y-2.5">
            {Object.entries(data?.riskDistribution || { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 }).map(
              ([range, count]) => (
                <div key={range} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-300 font-mono">Risk Range {range}</span>
                  <span className="px-2 py-0.5 rounded font-bold font-mono bg-slate-900 border border-slate-700 text-slate-200">
                    {count} incident{count === 1 ? "" : "s"}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Intelligence Pipeline Architecture State */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" /> Anti-Piracy Intelligence Pipeline
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium">1. Threat Detected</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium">2. Signals Correlated</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 font-medium">3. Risk Calculated</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-medium">4. Incident Clustered</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-rose-300 font-medium">5. Containment Action</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-medium">6. Forensic Proof</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Every score is 100% explainable and grounded in tamper-proof cryptographic logs and forensic watermark attribution.
          </p>
        </div>
      </div>

      {/* 4. INCIDENT TABLE & TIMELINE */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Clustered Threat Intelligence Incidents
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Correlated incidents ranked by real-time risk score</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Incident Code</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Theatre / Venue</th>
                <th className="py-3 px-4">Signals</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {data?.feed && data.feed.length > 0 ? (
                data.feed.map((inc) => (
                  <tr key={inc.incidentId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{inc.incidentCode}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inc.severity === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : inc.severity === "HIGH"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100">{inc.riskScore}/100</td>
                    <td className="py-3 px-4 text-slate-400">{inc.confidenceScore}%</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{inc.theatreName || "Global / Unassigned"}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{inc.signalCount} signals</td>
                    <td className="py-3 px-4 font-sans text-amber-300 font-semibold">{inc.recommendedAction}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-300">
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-sans font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No active threat incidents currently detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. INCIDENT DETAIL DRAWER / MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-indigo-400 font-mono font-bold">{selectedIncident.incidentCode}</span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedIncident.title}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedIncident(null);
                  setActionMessage(null);
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionMessage && (
              <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-xs text-indigo-300">
                {actionMessage}
              </div>
            )}

            {/* Score & Confidence */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Risk Score</span>
                <span className="text-xl font-bold text-rose-400 font-mono">{selectedIncident.riskScore}/100</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Confidence</span>
                <span className="text-xl font-bold text-indigo-400 font-mono">{selectedIncident.confidenceScore}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Severity</span>
                <span className="text-xl font-bold text-amber-400 font-mono">{selectedIncident.severity}</span>
              </div>
            </div>

            {/* Contributing Explanations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Explainable Contributing Signals</h4>
              <div className="space-y-1.5">
                {selectedIncident.explanations && selectedIncident.explanations.length > 0 ? (
                  selectedIncident.explanations.map((exp, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                      • {exp}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500">No signals attached.</div>
                )}
              </div>
            </div>

            {/* Response Actions */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Controlled Automated Containment</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleExecuteAction(selectedIncident, selectedIncident.recommendedAction)}
                  disabled={executingAction}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Flame className="w-4 h-4" />
                  <span>Execute {selectedIncident.recommendedAction}</span>
                </button>

                {onNavigateToForensics && (
                  <button
                    onClick={() => {
                      setSelectedIncident(null);
                      onNavigateToForensics(selectedIncident.incidentId);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4 text-indigo-400" />
                    <span>Open Forensic Investigation</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
