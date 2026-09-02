"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Server,
  Database,
  Key,
  Video,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Cpu,
  Zap,
  Radio,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Layers,
  Power,
  PlayCircle,
  Tv,
  Archive,
  DownloadCloud,
  Check,
  Shield,
  FileCheck,
  Trash2,
  PlusCircle,
} from "lucide-react";
import {
  OperationsHealthData,
  OperationsMetricsData,
  OperationsDependenciesData,
  BackupItem,
  DisasterRecoveryData,
  PlaybackDeviceItem,
  fetchOperationsHealth,
  fetchOperationsMetrics,
  fetchOperationsDependencies,
  fetchBackups,
  createBackup,
  verifyBackup,
  pruneBackups,
  fetchDisasterRecoveryStatus,
  toggleMaintenanceMode,
  fetchPlaybackDevices,
  blockPlaybackDevice,
  retirePlaybackDevice,
} from "../../lib/api";

interface ProductionOperationsDashboardProps {
  onRefreshGlobal?: () => void;
}

export const ProductionOperationsDashboard: React.FC<ProductionOperationsDashboardProps> = ({
  onRefreshGlobal,
}) => {
  const [health, setHealth] = useState<OperationsHealthData | null>(null);
  const [metrics, setMetrics] = useState<OperationsMetricsData | null>(null);
  const [dependencies, setDependencies] = useState<OperationsDependenciesData | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [drStatus, setDrStatus] = useState<DisasterRecoveryData | null>(null);
  const [devices, setDevices] = useState<PlaybackDeviceItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [backupActionLoading, setBackupActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadOperationalData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      const [healthData, metricsData, depsData, backupsData, drData, devicesData] = await Promise.all([
        fetchOperationsHealth(token).catch(() => null),
        fetchOperationsMetrics(token).catch(() => null),
        fetchOperationsDependencies(token).catch(() => null),
        fetchBackups(token).catch(() => []),
        fetchDisasterRecoveryStatus(token).catch(() => null),
        fetchPlaybackDevices(undefined, token).catch(() => ({ devices: [], totalCount: 0 })),
      ]);

      if (healthData) setHealth(healthData);
      if (metricsData) setMetrics(metricsData);
      if (depsData) setDependencies(depsData);
      if (backupsData) setBackups(backupsData);
      if (drData) setDrStatus(drData);
      if (devicesData) setDevices(devicesData.devices || []);
    } catch (err: any) {
      console.error("Failed to load operations data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperationalData();
  }, []);

  // 10s auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadOperationalData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleToggleMaintenance = async () => {
    if (!health) return;
    const nextState = !health.infrastructure.maintenanceMode;
    const confirmMsg = nextState
      ? "Are you sure you want to ENABLE Maintenance Mode? Public playback authorization will be blocked."
      : "Are you sure you want to DISABLE Maintenance Mode and resume full theatrical playback operations?";

    if (!window.confirm(confirmMsg)) return;

    setMaintenanceLoading(true);
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("token") || undefined;
      const res = await toggleMaintenanceMode(
        nextState,
        nextState ? "Scheduled maintenance in progress" : undefined,
        token
      );

      if (res.success) {
        setActionFeedback({
          type: "success",
          text: `Maintenance Mode successfully ${nextState ? "ENABLED" : "DISABLED"}.`,
        });
        await loadOperationalData();
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        setActionFeedback({ type: "error", text: "Failed to update maintenance mode state." });
      }
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to update maintenance mode" });
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    setBackupActionLoading(true);
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("token") || undefined;
      const newBackup = await createBackup(token);
      setActionFeedback({
        type: "success",
        text: `Database snapshot ${newBackup.id} created successfully (${newBackup.totalRecords} records, ${(newBackup.sizeBytes / 1024).toFixed(1)} KB).`,
      });
      await loadOperationalData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to create database backup" });
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handleVerifyBackup = async (backupId: string) => {
    setBackupActionLoading(true);
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("token") || undefined;
      const result = await verifyBackup(backupId, token);
      if (result.verified) {
        setActionFeedback({
          type: "success",
          text: `Backup ${backupId} SHA-256 integrity verified (${result.checksum.slice(0, 16)}...). Archive is intact.`,
        });
      } else {
        setActionFeedback({
          type: "error",
          text: `Backup ${backupId} failed integrity check! Checksum mismatch detected.`,
        });
      }
      await loadOperationalData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to verify backup" });
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handlePruneBackups = async () => {
    if (!window.confirm("Prune backups older than the 30-day retention threshold?")) return;
    setBackupActionLoading(true);
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("token") || undefined;
      const res = await pruneBackups(30, token);
      setActionFeedback({
        type: "success",
        text: `Retention pruning completed. ${res.prunedCount} backups pruned (${(res.freedBytes / 1024).toFixed(1)} KB freed).`,
      });
      await loadOperationalData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to prune backups" });
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handleBlockDevice = async (id: string) => {
    if (!window.confirm("Block this theatrical playback terminal?")) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      await blockPlaybackDevice(id, token);
      setActionFeedback({ type: "success", text: "Playback device blocked." });
      loadOperationalData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to block device" });
    }
  };

  const handleRetireDevice = async (id: string) => {
    if (!window.confirm("Retire this theatrical playback terminal?")) return;
    const token = localStorage.getItem("token") || undefined;
    try {
      await retirePlaybackDevice(id, token);
      setActionFeedback({ type: "success", text: "Playback device retired." });
      loadOperationalData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to retire device" });
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "UNKNOWN").toUpperCase();
    if (s === "HEALTHY" || s === "READY" || s === "SUCCESS" || s === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" /> {s}
        </span>
      );
    }
    if (s === "DEGRADED" || s === "NOT_CONFIGURED" || s === "WARNING" || s === "UNCHECKED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" /> {s}
        </span>
      );
    }
    if (s === "DOWN" || s === "UNHEALTHY" || s === "ERROR" || s === "FAILED" || s === "CRITICAL" || s === "CORRUPTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" /> {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        <HelpCircle className="w-3.5 h-3.5" /> UNKNOWN
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Phase 12 Production Operations, Backups & Disaster Recovery
              </span>
              {health?.infrastructure.maintenanceMode && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold animate-pulse">
                  MAINTENANCE MODE ACTIVE
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-indigo-400" /> Production Operations Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              PostgreSQL backups, SHA-256 integrity verification, RPO/RTO disaster recovery metrics, multi-subsystem health probes, and circuit breakers.
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
              <span>Auto Refresh ({autoRefresh ? "10s" : "Off"})</span>
            </button>

            <button
              onClick={() => loadOperationalData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleToggleMaintenance}
              disabled={maintenanceLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                health?.infrastructure.maintenanceMode
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                  : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>
                {health?.infrastructure.maintenanceMode ? "Disable Maintenance" : "Enable Maintenance"}
              </span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-medium ${
              actionFeedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {actionFeedback.text}
          </div>
        )}
      </div>

      {/* 1. DISASTER RECOVERY & RPO/RTO SLA CARDS */}
      <div>
        <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" /> Disaster Recovery & SLA Readiness
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Recovery Point Objective (RPO)</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {drStatus?.currentRpoMinutes ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">min age</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Target SLA: &le; {drStatus?.rpoTargetMinutes ?? 60} min
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Recovery Time Objective (RTO)</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              &le; {drStatus?.rtoTargetMinutes ?? 15}{" "}
              <span className="text-xs font-normal text-slate-400">min</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Automated snapshot restore SLA
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Recovery Readiness</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="pt-1">
              {getStatusBadge(drStatus?.recoveryReadiness || "READY")}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Backups total: {drStatus?.totalBackupsCount ?? 0} ({((drStatus?.totalStorageBytes ?? 0) / 1024).toFixed(1)} KB)
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Failed Backups (24h)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {drStatus?.failedBackupsCount24h ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Active incidents: {drStatus?.activeIncidentsCount ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* 2. DATABASE BACKUP MANAGEMENT TABLE */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Archive className="w-4 h-4 text-cyan-400" /> PostgreSQL Database Backups & Integrity Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated & manual database snapshots with SHA-256 cryptographic checksum validation and 30-day retention.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePruneBackups}
              disabled={backupActionLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Prune Expired</span>
            </button>

            <button
              onClick={handleTriggerBackup}
              disabled={backupActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Backup Now</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Backup ID & File</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Size & Records</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Integrity (SHA-256)</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No database backups found in local manifest. Click "Create Backup Now" to capture a snapshot.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-mono font-semibold text-slate-200">{b.id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.filename}</div>
                    </td>
                    <td className="p-3 text-slate-300 font-mono">
                      {new Date(b.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-300">
                      <div>{(b.sizeBytes / 1024).toFixed(1)} KB</div>
                      <div className="text-[11px] text-indigo-400">{b.totalRecords} records</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {b.type}
                      </span>
                    </td>
                    <td className="p-3">{getStatusBadge(b.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(b.verificationStatus || "UNCHECKED")}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]">
                        {b.checksumSha256 ? `${b.checksumSha256.slice(0, 12)}...` : "N/A"}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleVerifyBackup(b.id)}
                        disabled={backupActionLoading || b.status !== "SUCCESS"}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 transition-colors disabled:opacity-40"
                      >
                        Verify Checksum
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SUBSYSTEM AVAILABILITY PROBES */}
      <div>
        <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400" /> Subsystem Availability Probes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">API Gateway</span>
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-slate-200">Express REST</span>
              {getStatusBadge(health?.systemHealth?.api || "HEALTHY")}
            </div>
            <p className="text-[11px] text-slate-500">Node.js Runtime</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Database Engine</span>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-slate-200">PostgreSQL</span>
              {getStatusBadge(health?.systemHealth?.database)}
            </div>
            <p className="text-[11px] text-slate-500">
              Ping: <span className="font-mono text-slate-300">{health?.infrastructure.databasePingMs ?? 0}ms</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Web Portal</span>
              <Tv className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-slate-200">Next.js UI</span>
              {getStatusBadge("HEALTHY")}
            </div>
            <p className="text-[11px] text-slate-500">React Client</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">DRM Licensing</span>
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-slate-200">
                {health?.infrastructure.drmProvider.toUpperCase() || "MOCK"}
              </span>
              {getStatusBadge(health?.systemHealth?.drm)}
            </div>
            <p className="text-[11px] text-slate-500">Hardware-DRM Capable</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Video Transcoding</span>
              <Video className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-slate-200">FFmpeg Engine</span>
              {getStatusBadge(health?.systemHealth?.videoDelivery)}
            </div>
            <p className="text-[11px] text-slate-500">Multi-Bitrate HLS</p>
          </div>
        </div>
      </div>

      {/* 4. PERFORMANCE & METRICS */}
      <div>
        <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" /> API Performance & Telemetry
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Throughput</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {metrics?.performance.requestsPerMinute ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">req/min</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total lifetime: {(metrics?.performance.totalRequests ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Average Response Latency</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {metrics?.performance.averageLatencyMs ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              P95 Latency: <span className="text-slate-300 font-mono">{metrics?.performance.p95LatencyMs ?? 0}ms</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Error Rate</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {metrics?.performance.errorRatePercent ?? 0}
              <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total errors: {(metrics?.performance.totalErrors ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Active In-Flight Requests</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {metrics?.performance.activeRequests ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Rate limit violations: {metrics?.performance.rateLimitViolations ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* 5. THEATRICAL PLAYBACK TERMINALS & HARDWARE HEALTH */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400" /> Theatrical Playback Terminals & Projector Readiness
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditorium playback hardware status, DRM security compliance, and heartbeat telemetry.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{devices.length} Registered Terminals</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Device ID & Name</th>
                <th className="p-3">Theatrical Venue</th>
                <th className="p-3">Assigned Screen</th>
                <th className="p-3">Software Version</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Heartbeat</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No physical playback terminals registered yet.
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-200">{dev.deviceId}</div>
                      <div className="text-[11px] text-slate-400">{dev.name}</div>
                    </td>
                    <td className="p-3 text-slate-300">{dev.theatre?.name || "Unassigned"}</td>
                    <td className="p-3 text-slate-300">
                      {dev.screen ? `Screen ${dev.screen.screenNumber}` : "General Screening"}
                    </td>
                    <td className="p-3 font-mono text-indigo-400">v{dev.softwareVersion}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          dev.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : dev.status === "BLOCKED"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {dev.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {dev.lastHeartbeatAt ? new Date(dev.lastHeartbeatAt).toLocaleTimeString() : "Never"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {dev.status !== "BLOCKED" && (
                          <button
                            onClick={() => handleBlockDevice(dev.id)}
                            className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px]"
                          >
                            Block
                          </button>
                        )}
                        {dev.status !== "RETIRED" && (
                          <button
                            onClick={() => handleRetireDevice(dev.id)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
                          >
                            Retire
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
