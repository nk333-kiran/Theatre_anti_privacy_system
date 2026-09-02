"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Layers,
  Cpu,
  Tv,
  Film,
  Building,
  Info,
  Sparkles,
  Server,
  Zap,
} from "lucide-react";
import {
  DrmMonitoringStats,
  DrmLicenseItem,
  DrmProviderStatus,
  fetchDrmMonitoringStats,
  fetchDrmLicenses,
  revokeAssetDrm,
} from "../../lib/api";

interface DrmMonitoringDashboardProps {
  onRefreshGlobal?: () => void;
}

export const DrmMonitoringDashboard: React.FC<DrmMonitoringDashboardProps> = ({
  onRefreshGlobal,
}) => {
  const [stats, setStats] = useState<DrmMonitoringStats | null>(null);
  const [licenses, setLicenses] = useState<DrmLicenseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, licensesData] = await Promise.all([
        fetchDrmMonitoringStats().catch(() => null),
        fetchDrmLicenses({ status: statusFilter || undefined }).catch(() => []),
      ]);
      setStats(statsData);
      setLicenses(licensesData);
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      console.error("Error loading DRM dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleRevoke = async (drmAssetId: string) => {
    const reason = prompt("Enter license revocation reason:", "Security investigation / ticket cancelled");
    if (reason === null) return;

    setRevokingToken(drmAssetId);
    try {
      const res = await revokeAssetDrm(drmAssetId, reason);
      if (res.success) {
        await loadData();
      } else {
        alert(res.message || "Failed to revoke DRM license");
      }
    } catch (err: any) {
      alert(`Error revoking license: ${err.message}`);
    } finally {
      setRevokingToken(null);
    }
  };

  const filteredLicenses = licenses.filter((lic) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lic.licenseToken.toLowerCase().includes(q) ||
      lic.drmAsset?.keyId.toLowerCase().includes(q) ||
      lic.drmAsset?.videoAsset?.movie?.title.toLowerCase().includes(q) ||
      lic.theatre?.code.toLowerCase().includes(q)
    );
  });

  const provider = stats?.providerStatus;

  return (
    <div className="space-y-8">
      {/* Header & Provider Status Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1">
                <Key className="w-3 h-3" /> Phase 9B DRM Architecture
              </span>
              {provider?.isDevelopmentOnly && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
                  DEVELOPMENT ONLY — NOT REAL DRM
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              DRM Integration & Licensing Engine
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Server-side multi-DRM licensing subsystem (Widevine CENC, PlayReady, FairPlay Streaming, & Development Mock Provider).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Provider Compatibility Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="font-semibold text-slate-300">Google Widevine</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              CENC / CBCS
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-semibold text-slate-300">Microsoft PlayReady</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
              WRMHEADER
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="font-semibold text-slate-300">Apple FairPlay</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
              FPS / HLS
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-300">Active Provider</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
              {provider?.provider || "MOCK"}
            </span>
          </div>
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">DRM-Ready Assets</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {stats?.drmReadyAssets ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Packaged for DRM</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Pending Packaging</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {stats?.pendingDrmAssets ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Awaiting packaging</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Active Issued Licenses</span>
          <div className="text-2xl font-bold text-indigo-400 font-mono">
            {stats?.activeLicenses ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Live decrypt keys</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Revoked Licenses</span>
          <div className="text-2xl font-bold text-slate-400 font-mono">
            {stats?.revokedLicenses ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Revoked / terminated</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Denied Requests</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {stats?.deniedLicenseRequests ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Blocked license calls</span>
        </div>
      </div>

      {/* Real-time DRM License Ledger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              Live DRM License Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              10-point validated cryptographic license authorizations bound to active theatre seats
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token, KID, movie..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="REVOKED">REVOKED</option>
              <option value="DENIED">DENIED</option>
            </select>
          </div>
        </div>

        {/* License Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading DRM license stream...</div>
        ) : filteredLicenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            No DRM license records found matching the active filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">License Token</th>
                  <th className="px-4 py-2.5">Movie / Venue</th>
                  <th className="px-4 py-2.5">Key Identifier (KID)</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Issued / Expires</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLicenses.map((lic) => {
                  const isActive = lic.status === "ACTIVE";
                  const isRevoked = lic.status === "REVOKED";

                  return (
                    <tr key={lic.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-indigo-300 truncate max-w-[140px]">
                          {lic.licenseToken}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {lic.activation?.ticket?.seatNumber ? `Seat ${lic.activation.ticket.seatNumber}` : "Seat -"}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 font-sans">
                        <div className="font-semibold text-slate-200 truncate max-w-[140px]">
                          {lic.drmAsset?.videoAsset?.movie?.title || "Movie"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {lic.theatre?.code} &bull; {lic.drmAsset?.provider || "MOCK"}
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {lic.drmAsset?.keyId || "KID"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Scheme: {lic.drmAsset?.drmScheme || "cenc"}
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isRevoked
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {lic.status}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 text-[11px] text-slate-400">
                        <div>Issued: {new Date(lic.issuedAt).toLocaleTimeString()}</div>
                        <div className="text-slate-500 text-[10px]">
                          Exp: {new Date(lic.expiresAt).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right font-sans">
                        {isActive && (
                          <button
                            onClick={() => handleRevoke(lic.drmAssetId)}
                            disabled={revokingToken === lic.drmAssetId}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            {revokingToken === lic.drmAssetId ? "Revoking..." : "Revoke"}
                          </button>
                        )}
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
  );
};
