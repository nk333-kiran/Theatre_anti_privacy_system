"use client";

import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  ShieldAlert,
  Flame,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Eye,
  CheckCircle2,
  Sliders,
  Layers,
  Fingerprint,
  Radio,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  fetchIntelligenceStats,
  fetchThreatPatterns,
  fetchThreatPredictions,
  acknowledgeThreatPattern,
  recalculateThreatIntelligence,
  IntelligenceStatsData,
  ThreatPatternItem,
  ThreatPredictionItem,
} from "../../lib/api";

interface ThreatIntelligenceDashboardProps {
  onRefreshGlobal?: () => void;
  onNavigateToForensics?: () => void;
  onNavigateToCommandCenter?: () => void;
}

export const ThreatIntelligenceDashboard: React.FC<ThreatIntelligenceDashboardProps> = ({
  onRefreshGlobal,
  onNavigateToForensics,
  onNavigateToCommandCenter,
}) => {
  const [stats, setStats] = useState<IntelligenceStatsData | null>(null);
  const [patterns, setPatterns] = useState<ThreatPatternItem[]>([]);
  const [predictions, setPredictions] = useState<ThreatPredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<ThreatPredictionItem | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<ThreatPatternItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      const [s, pat, pred] = await Promise.all([
        fetchIntelligenceStats(token),
        fetchThreatPatterns(token),
        fetchThreatPredictions(token),
      ]);
      setStats(s);
      setPatterns(pat);
      setPredictions(pred);
    } catch (err) {
      console.error("Failed to load threat intelligence dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      await recalculateThreatIntelligence(token);
      await loadData();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      console.error("Failed to recalculate threat intelligence:", err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    const token = localStorage.getItem("token") || undefined;
    try {
      await acknowledgeThreatPattern(id, token);
      await loadData();
    } catch (err) {
      console.error("Failed to acknowledge threat pattern:", err);
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case "CRITICAL":
        return "text-rose-400 bg-rose-950/80 border-rose-600/50";
      case "HIGH":
        return "text-amber-400 bg-amber-950/80 border-amber-600/50";
      case "ELEVATED":
        return "text-indigo-400 bg-indigo-950/80 border-indigo-600/50";
      case "GUARDED":
        return "text-sky-400 bg-sky-950/80 border-sky-600/50";
      default:
        return "text-emerald-400 bg-emerald-950/80 border-emerald-600/50";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>AI Threat Intelligence & Predictive Anti-Piracy</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-950 border border-slate-700">
                Classification: {stats?.overallRiskLevel || "LOW"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-8 h-8 text-indigo-400" /> Predictive Anti-Piracy Threat Center
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Deterministic multi-signal risk forecasting, emerging piracy pattern detection, and explainable screening risk models.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${recalculating ? "animate-spin" : ""}`} />
              <span>{recalculating ? "Recalculating..." : "Recalculate AI Scores"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Overall System Risk</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.overallRiskScore ?? 0}/100
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Confidence: {stats?.confidence ?? 0}%</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Risk Posture</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {stats?.overallRiskLevel || "LOW"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Configurable thresholds</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Threat Patterns</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {stats?.activePatternsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{stats?.criticalPatternsCount ?? 0} critical patterns</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Predictions</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.predictionsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Upcoming screenings</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Monitored Theatres</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.monitoredTheatres ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Auditoriums active</div>
        </div>
      </div>

      {/* 3. PREDICTIVE SCREENING RISK RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Upcoming Screening Risk Forecasts
              </h2>
              <p className="text-xs text-slate-400">Predictive risk evaluation for screenings scheduled in the next 24h</p>
            </div>
          </div>

          <div className="space-y-3">
            {predictions && predictions.length > 0 ? (
              predictions.slice(0, 5).map((pred) => (
                <div
                  key={pred.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{pred.movie?.title || "Screening"}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {pred.theatre?.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{pred.explanation}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-amber-400 block">{pred.predictedRisk}/100</span>
                      <span className="text-[10px] text-slate-500">Conf: {pred.confidence}%</span>
                    </div>
                    <button
                      onClick={() => setSelectedPrediction(pred)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-medium"
                    >
                      Explain
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No upcoming screening predictions available.</div>
            )}
          </div>
        </div>

        {/* EMERGING THREAT PATTERNS */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-400" /> Emerging Threat Patterns
              </h2>
              <p className="text-xs text-slate-400">Recurring multi-signal attack vectors detected across venues</p>
            </div>
          </div>

          <div className="space-y-3">
            {patterns && patterns.length > 0 ? (
              patterns.slice(0, 5).map((pat) => (
                <div
                  key={pat.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getRiskColor(
                          pat.severity
                        )}`}
                      >
                        {pat.severity}
                      </span>
                      <span className="text-xs font-bold text-white">{pat.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{pat.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {pat.status === "DETECTED" && (
                      <button
                        onClick={() => handleAcknowledge(pat.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPattern(pat)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-medium"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No active threat patterns detected.</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. EXPLAIN RISK MODAL / DRAWER */}
      {selectedPrediction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Explainable Risk Analysis</h3>
              </div>
              <button onClick={() => setSelectedPrediction(null)} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
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

            <div className="flex justify-end gap-3 pt-2">
              {onNavigateToForensics && (
                <button
                  onClick={() => {
                    setSelectedPrediction(null);
                    onNavigateToForensics();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2"
                >
                  <Fingerprint className="w-4 h-4 text-indigo-400" />
                  <span>Open Investigation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. PATTERN DETAIL MODAL */}
      {selectedPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-indigo-400 font-bold uppercase">{selectedPattern.patternType}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedPattern.name}</h3>
              </div>
              <button onClick={() => setSelectedPattern(null)} className="p-1 rounded-lg bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Description</h4>
              <p className="text-xs text-slate-300 p-3 rounded-lg bg-slate-950 border border-slate-800">
                {selectedPattern.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">Occurrence Count</span>
                <span className="text-xl font-bold font-mono text-white">{selectedPattern.occurrenceCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">Confidence</span>
                <span className="text-xl font-bold font-mono text-indigo-400">{selectedPattern.confidence}%</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {onNavigateToCommandCenter && (
                <button
                  onClick={() => {
                    setSelectedPattern(null);
                    onNavigateToCommandCenter();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  <span>View in Command Center</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
