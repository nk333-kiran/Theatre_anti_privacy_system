"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Flame,
  Zap,
  Terminal,
  Activity,
  UserX,
  Server,
  Layers,
  FileText,
  Info,
} from "lucide-react";
import {
  SecurityStats,
  SecurityAuditLogItem,
  fetchSecurityStats,
  fetchSecurityAuditLogs,
  fetchActiveThreats,
  revokeSessionToken,
} from "../../lib/api";

interface SecurityOperationsDashboardProps {
  onRefreshGlobal?: () => void;
}

export const SecurityOperationsDashboard: React.FC<SecurityOperationsDashboardProps> = ({
  onRefreshGlobal,
}) => {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [logs, setLogs] = useState<SecurityAuditLogItem[]>([]);
  const [threats, setThreats] = useState<SecurityAuditLogItem[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [threatOnlyFilter, setThreatOnlyFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Revocation Modal State
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [tokenToRevoke, setTokenToRevoke] = useState<string>("");
  const [revokeUserId, setRevokeUserId] = useState<string>("");
  const [revokeReason, setRevokeReason] = useState<string>("Suspected account compromise");
  const [revoking, setRevoking] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, logsData, threatsData] = await Promise.all([
        fetchSecurityStats().catch(() => null),
        fetchSecurityAuditLogs({
          eventType: eventTypeFilter || undefined,
          severity: severityFilter || undefined,
          isThreat: threatOnlyFilter ? true : undefined,
          limit: 60,
        }).catch(() => ({ logs: [], totalCount: 0 })),
        fetchActiveThreats().catch(() => []),
      ]);

      setStats(statsData);
      setLogs(logsData.logs);
      setTotalLogsCount(logsData.totalCount);
      setThreats(threatsData);
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      console.error("Error loading SOC data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventTypeFilter, severityFilter, threatOnlyFilter]);

  const handleRevokeTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenToRevoke.trim() || !revokeUserId.trim()) return;

    setRevoking(true);
    try {
      const res = await revokeSessionToken(tokenToRevoke.trim(), revokeUserId.trim(), revokeReason);
      if (res.success) {
        setShowRevokeModal(false);
        setTokenToRevoke("");
        setRevokeUserId("");
        await loadData();
        alert("Session token blacklisted and revoked across all servers.");
      } else {
        alert(res.message || "Failed to revoke session token");
      }
    } catch (err: any) {
      alert(`Error revoking session: ${err.message}`);
    } finally {
      setRevoking(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.actionSummary.toLowerCase().includes(q) ||
      (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
      (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
      l.eventType.toLowerCase().includes(q)
    );
  });

  const getThreatColor = (level?: string) => {
    switch (level) {
      case "CRITICAL":
        return { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", badge: "bg-rose-600" };
      case "HIGH":
        return { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", badge: "bg-orange-600" };
      case "ELEVATED":
        return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", badge: "bg-amber-600" };
      case "LOW":
      default:
        return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", badge: "bg-emerald-600" };
    }
  };

  const threatColor = getThreatColor(stats?.threatLevel);

  return (
    <div className="space-y-8">
      {/* Header & Posture Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 font-mono">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Phase 10 Security Operations (SOC)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full ${threatColor.bg} ${threatColor.text} ${threatColor.border} border text-xs font-mono font-bold uppercase`}
              >
                Threat Posture: {stats?.threatLevel || "LOW"}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Security Hardening & Threat Intelligence
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Zero-PII unified security audit logging, sliding-window anomaly detection, JWT token blacklisting, and API rate-limiting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRevokeModal(true)}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/30"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Revoke Session Token</span>
            </button>

            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Security Hardening Capabilities Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-300">JWT Token Blacklist</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              ACTIVE
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-300">Helmet CSP & HSTS</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              ENFORCED
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-300">Sliding Threat Anomaly</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              MONITORING
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-300">Multi-Tier Rate Limiting</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              6 TIERS ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* 6 SOC KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Events (24h)</span>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalEvents24h ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Audit logs written</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Failed Logins (24h)</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {stats?.failedLogins24h ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Auth challenges failed</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Denied Activations</span>
          <div className="text-2xl font-bold text-orange-400 font-mono">
            {stats?.deniedActivations24h ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Mobile QR rejections</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Denied Checkpoints</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {stats?.deniedCheckpoints24h ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Staff security denied</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Denied DRM Requests</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {stats?.deniedDrm24h ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Blocked license calls</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Threat Anomalies</span>
          <div className="text-2xl font-bold text-rose-500 font-mono">
            {stats?.totalThreats24h ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Threshold triggers</span>
        </div>
      </div>

      {/* Active Threat Anomalies Feed */}
      {threats.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Active Detected Threat Anomalies ({threats.length})
            </h2>
            <span className="text-[10px] font-mono text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded font-semibold">
              SLIDING WINDOW HEURISTICS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {threats.slice(0, 6).map((t) => (
              <div
                key={t.id}
                className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-500/30 text-xs space-y-1 font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold">{t.eventType}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(t.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px]">{t.threatDetails || t.actionSummary}</div>
                <div className="text-slate-500 text-[10px] flex items-center gap-2">
                  <span>IP: {t.ipAddress || "Internal"}</span>
                  {t.actorEmail && <span>&bull; {t.actorEmail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filterable Unified Security Audit Ledger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Unified Security Audit Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive zero-PII security event records with actor role attribution and threat tagging
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search action, IP, email..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Event Types</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="ROLE_ACCESS_DENIED">ROLE_ACCESS_DENIED</option>
              <option value="QR_ACTIVATION">QR_ACTIVATION</option>
              <option value="QR_ACTIVATION_DENIED">QR_ACTIVATION_DENIED</option>
              <option value="STAFF_VERIFICATION">STAFF_VERIFICATION</option>
              <option value="PLAYBACK_AUTHORIZED">PLAYBACK_AUTHORIZED</option>
              <option value="PLAYBACK_DENIED">PLAYBACK_DENIED</option>
              <option value="DRM_LICENSE_AUTHORIZED">DRM_LICENSE_AUTHORIZED</option>
              <option value="DRM_LICENSE_DENIED">DRM_LICENSE_DENIED</option>
              <option value="SUSPICIOUS_ACTIVITY">SUSPICIOUS_ACTIVITY</option>
              <option value="RATE_LIMIT_EXCEEDED">RATE_LIMIT_EXCEEDED</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="INFO">INFO</option>
            </select>

            <button
              onClick={() => setThreatOnlyFilter(!threatOnlyFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                threatOnlyFilter
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              Threats Only
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit ledger stream...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            No audit log records match the selected security filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Event Type</th>
                  <th className="px-4 py-2.5">Actor / Origin</th>
                  <th className="px-4 py-2.5">Action Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLogs.map((log) => {
                  const isCrit = log.severity === "CRITICAL" || log.isThreat;
                  const isHigh = log.severity === "HIGH";
                  const isMed = log.severity === "MEDIUM";

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>

                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCrit
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : isHigh
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              : isMed
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-indigo-300 text-[11px]">
                          {log.eventType}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 text-[11px]">
                        <div className="text-slate-300 font-sans">
                          {log.actorEmail || log.userId ? `${log.actorEmail || log.userId} (${log.actorRole || "USER"})` : "Audience / Guest"}
                        </div>
                        <div className="text-[10px] text-slate-500">{log.ipAddress || "Internal"}</div>
                      </td>

                      <td className="px-4 py-2.5 text-slate-300 font-sans text-[11px]">
                        <div>{log.actionSummary}</div>
                        {log.threatDetails && (
                          <div className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {log.threatDetails}
                          </div>
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

      {/* Modal: Revoke Session Token */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-400" />
                Revoke Compromised Session
              </h3>
              <button
                onClick={() => setShowRevokeModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Immediately blacklists the token hash in PostgreSQL, rejecting all future authenticated API requests from this session.
            </p>

            <form onSubmit={handleRevokeTokenSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Target User ID *</label>
                <input
                  type="text"
                  value={revokeUserId}
                  onChange={(e) => setRevokeUserId(e.target.value)}
                  placeholder="e.g. staff-default-id"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Bearer Token *</label>
                <textarea
                  value={tokenToRevoke}
                  onChange={(e) => setTokenToRevoke(e.target.value)}
                  placeholder="Paste bearer token string to blacklist..."
                  required
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Revocation Reason</label>
                <input
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Suspected unauthorized scan activity"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={revoking}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 mt-2"
              >
                {revoking ? "Revoking Token..." : "Confirm Instant Revocation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
