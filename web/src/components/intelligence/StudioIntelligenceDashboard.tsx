"use client";

import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  Film,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  AlertTriangle,
  TrendingUp,
  Fingerprint,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Info,
  Calendar,
} from "lucide-react";
import {
  UserProfile,
  StudioIntelligenceSummary,
  StudioManagementReport,
  MovieRiskMetric,
  TheatreRiskMetric,
  fetchStudioIntelligence,
  generateStudioReport,
  exportStudioReportCsv,
} from "../../lib/api";

interface StudioIntelligenceDashboardProps {
  user: UserProfile | null;
  onNavigateToInvestigations?: () => void;
  onNavigateToEnforcement?: () => void;
}

export const StudioIntelligenceDashboard: React.FC<StudioIntelligenceDashboardProps> = ({
  user,
  onNavigateToInvestigations,
  onNavigateToEnforcement,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudioIntelligenceSummary | null>(null);

  // Filters
  const [selectedMovie, setSelectedMovie] = useState<string>("");
  const [selectedTheatre, setSelectedTheatre] = useState<string>("");
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<StudioManagementReport | null>(null);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  // Active View Tab
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "movies" | "theatres" | "pipeline" | "sessions">("overview");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString();
      const endDate = now.toISOString();

      const res = await fetchStudioIntelligence({
        movieId: selectedMovie || undefined,
        theatreId: selectedTheatre || undefined,
        startDate,
        endDate,
      });

      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError("Failed to load studio intelligence summary");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred loading studio intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMovie, selectedTheatre, dateRangeDays]);

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportSuccessMsg(null);
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString();
      const endDate = now.toISOString();

      const res = await generateStudioReport({
        movieId: selectedMovie || undefined,
        theatreId: selectedTheatre || undefined,
        startDate,
        endDate,
      });

      if (res.success && res.data) {
        setGeneratedReport(res.data);
        setReportSuccessMsg("Management report compiled and cryptographically verified!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString();
      const endDate = now.toISOString();

      const blob = await exportStudioReportCsv({
        movieId: selectedMovie || undefined,
        theatreId: selectedTheatre || undefined,
        startDate,
        endDate,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Studio-Threat-Intelligence-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to export CSV: " + err.message);
    }
  };

  const getPostureBadge = (posture?: string) => {
    switch (posture) {
      case "CRITICAL":
        return <span className="px-3 py-1 bg-red-950/80 border border-red-700 text-red-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" /> Critical Threat</span>;
      case "HIGH":
        return <span className="px-3 py-1 bg-amber-950/80 border border-amber-700 text-amber-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> High Vulnerability</span>;
      case "ELEVATED":
        return <span className="px-3 py-1 bg-yellow-950/80 border border-yellow-700 text-yellow-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-yellow-400" /> Elevated</span>;
      case "GUARDED":
        return <span className="px-3 py-1 bg-blue-950/80 border border-blue-700 text-blue-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Guarded</span>;
      default:
        return <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Nominal</span>;
    }
  };

  const getRiskCategoryBadge = (cat: string) => {
    switch (cat) {
      case "CRITICAL":
        return <span className="px-2.5 py-0.5 bg-red-950/60 border border-red-800 text-red-400 text-xs font-bold rounded">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2.5 py-0.5 bg-amber-950/60 border border-amber-800 text-amber-400 text-xs font-bold rounded">HIGH</span>;
      case "ELEVATED":
        return <span className="px-2.5 py-0.5 bg-yellow-950/60 border border-yellow-800 text-yellow-400 text-xs font-bold rounded">ELEVATED</span>;
      case "GUARDED":
        return <span className="px-2.5 py-0.5 bg-blue-950/60 border border-blue-800 text-blue-400 text-xs font-bold rounded">GUARDED</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold rounded">LOW</span>;
    }
  };

  const getVulnerabilityBadge = (rating: string) => {
    switch (rating) {
      case "SEVERE":
        return <span className="px-2.5 py-0.5 bg-red-950/60 border border-red-800 text-red-400 text-xs font-bold rounded">SEVERE</span>;
      case "ELEVATED":
        return <span className="px-2.5 py-0.5 bg-amber-950/60 border border-amber-800 text-amber-400 text-xs font-bold rounded">ELEVATED</span>;
      case "MODERATE":
        return <span className="px-2.5 py-0.5 bg-yellow-950/60 border border-yellow-800 text-yellow-400 text-xs font-bold rounded">MODERATE</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold rounded">LOW</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl backdrop-blur shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">Studio Content & Threat Intelligence</h1>
                <span className="px-2.5 py-0.5 bg-indigo-950 border border-indigo-700 text-indigo-400 text-xs font-bold rounded-full">
                  Phase 28
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Executive aggregation of threat incidents, watermark forensics, risk rankings, and legal enforcement pipeline.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter Buttons */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs font-medium">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDateRangeDays(d)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRangeDays === d
                    ? "bg-indigo-600 text-white shadow-md font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setReportModalOpen(true);
              handleGenerateReport();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
          >
            <FileText className="w-4 h-4" />
            Generate Executive Report
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-xl transition-all"
            title="Refresh Intelligence Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-red-950/60 border border-red-700 p-4 rounded-xl flex items-center justify-between text-red-200 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-100 text-xs">Dismiss</button>
        </div>
      )}

      {/* EXECUTIVE KPI GRID */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Risk Posture */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Posture</span>
              {getPostureBadge(data.kpis.overallThreatPosture)}
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-white">{data.kpis.globalStudioRiskScore}</span>
              <span className="text-xs text-slate-400">/ 100 Risk Score</span>
            </div>
            <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  data.kpis.globalStudioRiskScore >= 70
                    ? "bg-red-500"
                    : data.kpis.globalStudioRiskScore >= 45
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, data.kpis.globalStudioRiskScore)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Total Incidents */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Piracy Incidents</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{data.kpis.totalIncidents}</span>
              <span className="text-xs text-amber-400 font-medium">({data.kpis.highRiskIncidents} High Severity)</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              High Risk Ratio: <span className="font-semibold text-slate-200">{data.kpis.highRiskRatio}%</span>
            </p>
          </div>

          {/* Card 3: Forensic Evidence & Watermarks */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Forensic Matches</span>
              <Fingerprint className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{data.kpis.watermarkHits}</span>
              <span className="text-xs text-slate-400">Watermark Hits</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Total Evidence Vault Items: <span className="font-semibold text-slate-200">{data.kpis.totalEvidenceRecords}</span>
            </p>
          </div>

          {/* Card 4: Enforcement & Takedown Efficacy */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Takedown Efficacy</span>
              <Gavel className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">{data.kpis.takedownSuccessRate}%</span>
              <span className="text-xs text-slate-400">Success Rate</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Active Enforcements: <span className="font-semibold text-slate-200">{data.kpis.activeEnforcements}</span>
            </p>
          </div>
        </div>
      )}

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: "overview", label: "Executive Overview", icon: Sparkles },
          { id: "movies", label: "Movie Risk Rankings", icon: Film, count: data?.movieRankings.length },
          { id: "theatres", label: "Theatre Vulnerabilities", icon: Building2, count: data?.theatreRankings.length },
          { id: "pipeline", label: "Investigation & Enforcement Pipeline", icon: Layers },
          { id: "sessions", label: "Suspicious Screenings", icon: Clock, count: data?.suspiciousSessions.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                isActive
                  ? "bg-slate-800 text-indigo-400 border border-slate-700 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${isActive ? "bg-indigo-950 text-indigo-300 border border-indigo-800" : "bg-slate-800 text-slate-400"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeSubTab === "overview" && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Vulnerable Movies */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Movie Threat Index</h2>
              </div>
              <button
                onClick={() => setActiveSubTab("movies")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                View Full Ranking <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {data.movieRankings.slice(0, 5).map((m) => (
                <div key={m.movieId} className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{m.movieTitle}</span>
                      {getRiskCategoryBadge(m.riskCategory)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Incidents: <strong className="text-slate-200">{m.incidentCount}</strong></span>
                      <span>Watermark Hits: <strong className="text-indigo-300">{m.watermarkHits}</strong></span>
                      <span>Active Cases: <strong className="text-slate-200">{m.activeInvestigations}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-bold text-white">{m.averageRiskScore}</span>
                    <span className="text-[10px] text-slate-500 block">Risk Score</span>
                  </div>
                </div>
              ))}

              {data.movieRankings.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">No active movie threats recorded in this period.</div>
              )}
            </div>
          </div>

          {/* Evidence Vault Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Forensic Evidence Distribution</h2>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { label: "Watermark Attributions", count: data.evidenceBreakdown.watermarkCaptures, color: "bg-indigo-500" },
                { label: "Optical Cam Recordings", count: data.evidenceBreakdown.opticalRecordings, color: "bg-purple-500" },
                { label: "Audio Fingerprint Leaks", count: data.evidenceBreakdown.audioLeaks, color: "bg-pink-500" },
                { label: "DRM License Tampering", count: data.evidenceBreakdown.drmAnomalies, color: "bg-amber-500" },
                { label: "Playback Heuristic Alerts", count: data.evidenceBreakdown.heuristicAnomalies, color: "bg-blue-500" },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-xs text-slate-300 font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{item.count}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-center">
              <span className="text-xs text-slate-400">
                Total Cryptographically Verified Artifacts: <strong className="text-indigo-400">{data.evidenceBreakdown.totalVerifiedArtifacts}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVIE RISK RANKINGS */}
      {activeSubTab === "movies" && data && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-400" />
              Complete Movie Repertoire Threat Rankings
            </h2>
            <span className="text-xs text-slate-400">Total Ranked Titles: {data.movieRankings.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Movie Title</th>
                  <th className="px-6 py-3.5">Threat Category</th>
                  <th className="px-6 py-3.5 text-center">Avg Risk Score</th>
                  <th className="px-6 py-3.5 text-center">Total Incidents</th>
                  <th className="px-6 py-3.5 text-center">Critical Leaks</th>
                  <th className="px-6 py-3.5 text-center">Watermark Hits</th>
                  <th className="px-6 py-3.5 text-center">Active Cases</th>
                  <th className="px-6 py-3.5 text-center">Enforcements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-medium">
                {data.movieRankings.map((m) => (
                  <tr key={m.movieId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{m.movieTitle}</td>
                    <td className="px-6 py-4">{getRiskCategoryBadge(m.riskCategory)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-white font-bold rounded-lg">
                        {m.averageRiskScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-200">{m.incidentCount}</td>
                    <td className="px-6 py-4 text-center font-bold text-red-400">{m.criticalIncidentCount}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-400">{m.watermarkHits}</td>
                    <td className="px-6 py-4 text-center">{m.activeInvestigations}</td>
                    <td className="px-6 py-4 text-center">{m.activeEnforcements}</td>
                  </tr>
                ))}
                {data.movieRankings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                      No movies found matching current filter parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: THEATRE VULNERABILITY RANKINGS */}
      {activeSubTab === "theatres" && data && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Theatre Venue Vulnerability Rankings
            </h2>
            <span className="text-xs text-slate-400">Total Monitored Venues: {data.theatreRankings.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Venue Code</th>
                  <th className="px-6 py-3.5">Theatre Name</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Vulnerability Rating</th>
                  <th className="px-6 py-3.5 text-center">Avg Threat Score</th>
                  <th className="px-6 py-3.5 text-center">Incidents</th>
                  <th className="px-6 py-3.5 text-center">Watermark Hits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-medium">
                {data.theatreRankings.map((t) => (
                  <tr key={t.theatreId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-300">{t.theatreCode}</td>
                    <td className="px-6 py-4 font-bold text-white">{t.theatreName}</td>
                    <td className="px-6 py-4 text-slate-400">{t.location || "Central"}</td>
                    <td className="px-6 py-4">{getVulnerabilityBadge(t.vulnerabilityRating)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-white font-bold rounded-lg">
                        {t.averageRiskScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-200">{t.incidentCount}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-400">{t.watermarkDetections}</td>
                  </tr>
                ))}
                {data.theatreRankings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                      No theatre data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INVESTIGATION & ENFORCEMENT PIPELINE */}
      {activeSubTab === "pipeline" && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Investigation Cases Funnel */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Investigation Case Pipeline</h2>
              </div>
              {onNavigateToInvestigations && (
                <button
                  onClick={onNavigateToInvestigations}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  Manage Cases <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              {Object.entries(data.investigationPipeline).map(([status, count]) => (
                <div key={status} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">{status}</span>
                  <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-lg">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Enforcement Action Pipeline */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Enforcement & Legal Response Pipeline</h2>
              </div>
              {onNavigateToEnforcement && (
                <button
                  onClick={onNavigateToEnforcement}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  Enforcement Center <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              {Object.entries(data.enforcementPipeline).map(([status, count]) => (
                <div key={status} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">{status}</span>
                  <span className={`px-2.5 py-0.5 border text-xs font-bold rounded-lg ${
                    status === "COMPLETED"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                      : status === "APPROVED"
                      ? "bg-indigo-950 text-indigo-300 border-indigo-800"
                      : "bg-slate-800 text-slate-100 border-slate-700"
                  }`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUSPICIOUS SESSIONS */}
      {activeSubTab === "sessions" && data && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              High-Risk Screening Sessions
            </h2>
            <span className="text-xs text-slate-400">Total Flagged: {data.suspiciousSessions.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Session ID</th>
                  <th className="px-6 py-3.5">Movie</th>
                  <th className="px-6 py-3.5">Theatre / Venue</th>
                  <th className="px-6 py-3.5 text-center">Threat Risk Score</th>
                  <th className="px-6 py-3.5 text-center">Watermark Attribution</th>
                  <th className="px-6 py-3.5 text-right">Detected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-medium">
                {data.suspiciousSessions.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-300">{s.sessionId}</td>
                    <td className="px-6 py-4 font-bold text-white">{s.movieTitle}</td>
                    <td className="px-6 py-4">{s.theatreName} ({s.theatreCode})</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 bg-red-950/80 border border-red-800 text-red-300 font-bold rounded-lg">
                        {s.riskScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.hasWatermarkAttribution ? (
                        <span className="px-2.5 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-400 text-xs font-bold rounded">
                          MATCHED
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Heuristic</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400">{new Date(s.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {data.suspiciousSessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      No high-risk screening sessions detected in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANAGEMENT REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Executive Management Report</h3>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
              {reportLoading ? (
                <div className="text-center py-16 space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-slate-400">Compiling executive intelligence and verifying SHA-256 integrity hash...</p>
                </div>
              ) : generatedReport ? (
                <div className="space-y-5">
                  {/* Report Meta Card */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-indigo-400 font-bold">{generatedReport.reportId}</span>
                      <span className="text-xs text-slate-400">{new Date(generatedReport.generatedAt).toLocaleString()}</span>
                    </div>
                    <h4 className="text-base font-bold text-white">{generatedReport.executiveSummary.headline}</h4>
                    <p className="text-xs text-slate-400">
                      Period: {new Date(generatedReport.reportPeriod.startDate).toLocaleDateString()} – {new Date(generatedReport.reportPeriod.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Executive KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Risk Posture</span>
                      <p className="text-sm font-bold text-white mt-1">{generatedReport.executiveSummary.overallRiskPosture}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Incidents</span>
                      <p className="text-sm font-bold text-white mt-1">{generatedReport.executiveSummary.totalIncidents}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Takedown Efficacy</span>
                      <p className="text-sm font-bold text-emerald-400 mt-1">{generatedReport.executiveSummary.takedownEfficacyRate}%</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Forensic Items</span>
                      <p className="text-sm font-bold text-indigo-400 mt-1">{generatedReport.executiveSummary.totalForensicEvidenceItems}</p>
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Seal */}
                  <div className="bg-indigo-950/40 border border-indigo-800/60 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{generatedReport.complianceCertification}</span>
                    </div>
                    <p className="font-mono text-[11px] text-indigo-200/80 break-all">
                      SHA-256: {generatedReport.reportIntegrityHash}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950">
              <button
                onClick={handleDownloadCsv}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>

              <button
                onClick={() => setReportModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
