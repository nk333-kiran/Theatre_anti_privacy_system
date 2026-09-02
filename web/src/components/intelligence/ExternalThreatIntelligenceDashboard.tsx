"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  ShieldAlert,
  Search,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Zap,
  Activity,
  Layers,
  UploadCloud,
  FileText,
  Building2,
  Film,
  Plus,
  ArrowUpRight,
  Fingerprint,
} from "lucide-react";
import {
  ThreatIntelStatsData,
  ThreatIntelIndicatorItem,
  ThreatIntelMatchItem,
  ThreatIntelCampaignItem,
  ThreatIntelSourceItem,
  fetchThreatIntelStats,
  fetchThreatIntelIndicators,
  fetchThreatIntelMatches,
  fetchThreatIntelCampaigns,
  fetchThreatIntelSources,
  validateThreatIntelIndicator,
  importThreatIntelFeed,
  syncThreatIntelSource,
  createThreatIntelCampaign,
  createThreatIntelSource,
} from "../../lib/api";

export const ExternalThreatIntelligenceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"IOCS" | "MATCHES" | "CAMPAIGNS" | "SOURCES">("IOCS");
  const [stats, setStats] = useState<ThreatIntelStatsData | null>(null);
  const [indicators, setIndicators] = useState<ThreatIntelIndicatorItem[]>([]);
  const [matches, setMatches] = useState<ThreatIntelMatchItem[]>([]);
  const [campaigns, setCampaigns] = useState<ThreatIntelCampaignItem[]>([]);
  const [sources, setSources] = useState<ThreatIntelSourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("");

  // Modals & Forms
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<ThreatIntelIndicatorItem | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Import Form State
  const [importSourceId, setImportSourceId] = useState("");
  const [importFormat, setImportFormat] = useState<"CSV" | "JSON">("CSV");
  const [importContent, setImportContent] = useState("");
  const [importing, setImporting] = useState(false);

  // Campaign Form State
  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [campaignClassification, setCampaignClassification] = useState("GLOBAL_THEATRICAL_LEAK");
  const [campaignRisk, setCampaignRisk] = useState("HIGH");

  // Source Form State
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState("COMMERCIAL_FEED");
  const [sourceTrust, setSourceTrust] = useState(75);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, indicatorsData, matchesData, campaignsData, sourcesData] = await Promise.all([
        fetchThreatIntelStats().catch(() => null),
        fetchThreatIntelIndicators({ search: searchQuery, type: filterType || undefined, level: filterLevel || undefined }).catch(() => []),
        fetchThreatIntelMatches().catch(() => []),
        fetchThreatIntelCampaigns().catch(() => []),
        fetchThreatIntelSources().catch(() => []),
      ]);

      setStats(statsData);
      setIndicators(indicatorsData);
      setMatches(matchesData);
      setCampaigns(campaignsData);
      setSources(sourcesData);
    } catch (err: any) {
      console.error("Failed to load threat intel data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, filterType, filterLevel]);

  const handleValidate = async (id: string, isConfirmed: boolean) => {
    try {
      await validateThreatIntelIndicator(id, isConfirmed);
      setActionFeedback({
        type: "success",
        text: isConfirmed ? "Indicator confirmed by analyst (+15 bonus)" : "Indicator marked as false positive",
      });
      setSelectedIndicator(null);
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to validate indicator" });
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importSourceId || !importContent.trim()) return;

    setImporting(true);
    try {
      await importThreatIntelFeed({
        sourceId: importSourceId,
        format: importFormat,
        rawContent: importContent,
      });
      setActionFeedback({ type: "success", text: "Threat intelligence feed ingested successfully" });
      setShowImportModal(false);
      setImportContent("");
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to import feed" });
    } finally {
      setImporting(false);
    }
  };

  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;

    try {
      await createThreatIntelCampaign({
        name: campaignName,
        description: campaignDesc,
        threatClassification: campaignClassification,
        riskLevel: campaignRisk,
      });
      setActionFeedback({ type: "success", text: "Piracy campaign created successfully" });
      setShowCampaignModal(false);
      setCampaignName("");
      setCampaignDesc("");
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to create campaign" });
    }
  };

  const handleCreateSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) return;

    try {
      await createThreatIntelSource({
        name: sourceName,
        providerType: sourceType,
        trustLevel: Number(sourceTrust),
      });
      setActionFeedback({ type: "success", text: "Threat intelligence source registered" });
      setShowSourceModal(false);
      setSourceName("");
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to create source" });
    }
  };

  const handleSyncSource = async (id: string) => {
    try {
      await syncThreatIntelSource(id);
      setActionFeedback({ type: "success", text: "Source synchronized and correlated against internal telemetry" });
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to sync source" });
    }
  };

  const getConfidenceBadge = (level: string, score: number) => {
    switch (level) {
      case "VERY_HIGH":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">VERY HIGH ({score})</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH ({score})</span>;
      case "MODERATE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">MODERATE ({score})</span>;
      case "LOW":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">LOW ({score})</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-700 text-zinc-400">UNTRUSTED ({score})</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                Phase 18 Intelligence
              </span>
              <span className="text-xs text-slate-500">• Advisory-First Anti-Piracy Feeds</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Globe className="w-7 h-7 text-cyan-400" /> External Threat & Industry Intelligence
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Commercial threat feeds, industry ISAC syndication, deterministic IOC confidence scoring, and internal telemetry correlation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Feed</span>
            </button>
            <button
              onClick={() => setShowCampaignModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between animate-fadeIn ${
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{actionFeedback.text}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Sources</span>
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.activeSources ?? 0} <span className="text-xs font-normal text-slate-500">/ {stats?.totalSources ?? 0}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Multi-format feed feeds</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total IOC Indicators</span>
            <Fingerprint className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {stats?.totalIndicators ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active: {stats?.activeIndicators ?? 0}</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">High Confidence IOCs</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {stats?.highConfidenceIndicators ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Score &ge; 60 (High / Very High)</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Campaigns</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {stats?.activeCampaigns ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Syndicated dossiers</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Internal Correlations</span>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.totalMatches ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Advisory matches linked</div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("IOCS")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "IOCS"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🔍 IOC Threat Indicators ({indicators.length})
        </button>
        <button
          onClick={() => setActiveTab("MATCHES")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "MATCHES"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          ⚡ Internal Telemetry Matches ({matches.length})
        </button>
        <button
          onClick={() => setActiveTab("CAMPAIGNS")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "CAMPAIGNS"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📁 Piracy Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab("SOURCES")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "SOURCES"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📡 Intelligence Sources ({sources.length})
        </button>
      </div>

      {/* TAB 1: IOC EXPLORER */}
      {activeTab === "IOCS" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search IOC value, IP, domain, hash, classification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Indicator Types</option>
                <option value="IP_ADDRESS">IP Address</option>
                <option value="DOMAIN">Domain</option>
                <option value="URL">URL</option>
                <option value="FILE_HASH">File Hash</option>
                <option value="EMAIL">Email</option>
                <option value="DEVICE_FINGERPRINT">Device Fingerprint</option>
                <option value="USER_AGENT">User Agent</option>
              </select>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Confidence Levels</option>
                <option value="VERY_HIGH">Very High (80-100)</option>
                <option value="HIGH">High (60-79)</option>
                <option value="MODERATE">Moderate (40-59)</option>
                <option value="LOW">Low (20-39)</option>
                <option value="UNTRUSTED">Untrusted (0-19)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Normalized Indicator Value</th>
                  <th className="p-3">Threat Classification</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Last Seen</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {indicators.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No indicators match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  indicators.map((ind) => (
                    <tr
                      key={ind.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedIndicator(ind)}
                    >
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {ind.indicatorType}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-200 truncate max-w-xs group-hover:text-indigo-300 transition-colors">
                        {ind.value}
                      </td>
                      <td className="p-3 text-slate-300">
                        {ind.threatClassification || "UNCLASSIFIED"}
                      </td>
                      <td className="p-3">
                        {getConfidenceBadge(ind.confidenceLevel, ind.confidenceScore)}
                      </td>
                      <td className="p-3 text-slate-400">
                        {ind.source?.name || "External Feed"}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {new Date(ind.lastSeen).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIndicator(ind);
                          }}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
                        >
                          Inspect
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

      {/* TAB 2: CORRELATION MATCHES */}
      {activeTab === "MATCHES" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Internal Platform Telemetry Correlations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live advisory correlations between external IOC indicators and actual screening telemetry (SecurityAuditLogs, PlaybackSessions, and Evidence Artifacts).
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Correlation Type</th>
                  <th className="p-3">Matched IOC Value</th>
                  <th className="p-3">Context / Venue</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Advisory Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No internal correlation hits detected. System is running cleanly.
                    </td>
                  </tr>
                ) : (
                  matches.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-400">
                        {m.correlationType}
                      </td>
                      <td className="p-3 font-mono text-slate-200">
                        {m.indicator?.value}
                      </td>
                      <td className="p-3 text-slate-300">
                        <div>{m.theatre?.name || m.movie?.title || "Global Telemetry"}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{m.correlationDetails}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {m.confidence}% MATCH
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {new Date(m.matchedAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[10px] font-bold text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-lg bg-cyan-500/10">
                          ADVISORY ALERT
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PIRACY CAMPAIGNS */}
      {activeTab === "CAMPAIGNS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.length === 0 ? (
            <div className="col-span-full p-12 text-center text-slate-500 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
              No piracy campaigns currently registered.
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-indigo-400 font-bold">{c.campaignIdentifier}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {c.riskLevel}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description || "No description provided"}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1 text-slate-300">
                  <div><strong>Threat Class:</strong> {c.threatClassification}</div>
                  <div><strong>Status:</strong> <span className="text-amber-400 font-bold">{c.status}</span></div>
                  <div><strong>Confidence:</strong> {c.confidence}%</div>
                  <div><strong>Target Movie:</strong> {c.movie?.title || "Multiple Releases"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: SOURCES & HEALTH */}
      {activeTab === "SOURCES" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" /> Registered Intelligence Feeds & Providers
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Commercial providers, industry ISAC feeds, and authenticated webhooks with automated latency tracking.
              </p>
            </div>
            <button
              onClick={() => setShowSourceModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Source</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Source Name</th>
                  <th className="p-3">Provider Type</th>
                  <th className="p-3">Trust Level</th>
                  <th className="p-3">Indicators</th>
                  <th className="p-3">Health Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-200">
                      <div>{s.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Auth: {s.authConfigReference || "Standard Token"}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{s.providerType}</td>
                    <td className="p-3 font-bold text-indigo-400">{s.trustLevel}/100</td>
                    <td className="p-3 text-slate-300">{s._count?.indicators ?? 0}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> HEALTHY
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSyncSource(s.id)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-all"
                      >
                        Sync & Correlate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INDICATOR INSPECT & VALIDATE */}
      {selectedIndicator && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedIndicator.indicatorType}
                </span>
                <h2 className="text-lg font-mono font-bold text-white mt-1">{selectedIndicator.value}</h2>
              </div>
              <button onClick={() => setSelectedIndicator(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div><strong>Confidence:</strong> {selectedIndicator.confidenceScore}/100</div>
                <div><strong>Level:</strong> {selectedIndicator.confidenceLevel}</div>
                <div><strong>Status:</strong> {selectedIndicator.status}</div>
                <div><strong>Analyst Validated:</strong> {selectedIndicator.isAnalystValidated ? "YES (+15)" : "NO"}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div><strong>Threat Class:</strong> {selectedIndicator.threatClassification}</div>
                <div><strong>Source:</strong> {selectedIndicator.source?.name}</div>
                <div><strong>First Seen:</strong> {new Date(selectedIndicator.firstSeen).toLocaleDateString()}</div>
                <div><strong>Last Seen:</strong> {new Date(selectedIndicator.lastSeen).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">Analyst Review Action</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleValidate(selectedIndicator.id, false)}
                  className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold"
                >
                  Mark False Positive
                </button>
                <button
                  onClick={() => handleValidate(selectedIndicator.id, true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20"
                >
                  Confirm Indicator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT FEED */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-400" /> Ingest Threat Feed
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Target Source</label>
                <select
                  value={importSourceId}
                  onChange={(e) => setImportSourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Select Threat Source</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.providerType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Format</label>
                <div className="flex gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={importFormat === "CSV"} onChange={() => setImportFormat("CSV")} /> CSV Format
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={importFormat === "JSON"} onChange={() => setImportFormat("JSON")} /> JSON Format
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Payload Data</label>
                <textarea
                  rows={6}
                  placeholder={
                    importFormat === "CSV"
                      ? "type,value,threatClassification,description\nIP_ADDRESS,198.51.100.50,CAM_DISTRIBUTOR,Restream proxy\nDOMAIN,theatre-rips.tv,PIRACY_PORTAL,Streaming site"
                      : '[{"type":"IP_ADDRESS","value":"198.51.100.50","threatClassification":"CAM_DISTRIBUTOR"}]'
                  }
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {importing ? "Ingesting..." : "Ingest Feed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW CAMPAIGN */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" /> Create Piracy Campaign Dossier
              </h2>
              <button onClick={() => setShowCampaignModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Operation Nightshade Cam Syndicate"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Threat Classification</label>
                <input
                  type="text"
                  value={campaignClassification}
                  onChange={(e) => setCampaignClassification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Description</label>
                <textarea
                  rows={3}
                  value={campaignDesc}
                  onChange={(e) => setCampaignDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW SOURCE */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" /> Register Threat Source
              </h2>
              <button onClick={() => setShowSourceModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSourceSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Source Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cinema-ISAC Commercial Feed"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Provider Type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="COMMERCIAL_FEED">Commercial Threat Feed</option>
                  <option value="INDUSTRY_ISAC">Industry ISAC</option>
                  <option value="STUDIO_ALLIANCE">Studio Alliance</option>
                  <option value="OPEN_SOURCE">Open Source Intelligence</option>
                  <option value="CUSTOM_WEBHOOK">Custom Webhook</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Trust Level (0–100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={sourceTrust}
                  onChange={(e) => setSourceTrust(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSourceModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Register Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalThreatIntelligenceDashboard;
