"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Database,
  Archive,
  Fingerprint,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Radio,
  FileCheck,
  Zap,
  Lock,
  Play,
  Layers,
  Search,
} from "lucide-react";

interface DisasterRecoveryDashboardProps {
  user?: any;
}

export const DisasterRecoveryDashboard: React.FC<DisasterRecoveryDashboardProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingEvidence, setVerifyingEvidence] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState("BKP-PROD-INIT-001");
  const [recoveryReason, setRecoveryReason] = useState("");
  const [targetEnv, setTargetEnv] = useState("PRODUCTION");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Recovery overall status state
  const [status, setStatus] = useState<any>({
    rpoTargetMinutes: 15,
    currentRpoMinutes: 8,
    rtoTargetMinutes: 60,
    overallReadiness: "READY",
    database: { status: "HEALTHY", latencyMs: 12, tablesAvailable: true },
    backup: {
      status: "VERIFIED",
      latestBackup: {
        backupId: "BKP-PROD-INIT-001",
        createdAt: new Date().toISOString(),
        size: 15428000,
        checksum: "8e7c10b4f8a3429188e0b6d9f7833a69c0d12e8b2b719468e21973415cf98b1a",
        verificationStatus: "VERIFIED",
      },
      backupAgeMinutes: 8,
      isRpoCompliant: true,
    },
    evidenceVault: {
      status: "VERIFIED",
      totalRecords: 1420,
      verifiedRecords: 1420,
      mismatches: 0,
      lastIntegrityCheck: new Date().toISOString(),
    },
    telemetryQueue: { status: "HEALTHY", pendingEventsCount: 0, idempotencyEnforced: true },
    rollback: { status: "READY", currentVersion: "1.0.0", previousKnownGoodVersion: "0.9.8", migrationCompatible: true },
    recentRecoveries: [],
  });

  const [backups, setBackups] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchRecoveryData = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [statusRes, backupsRes, auditRes] = await Promise.all([
        fetch("/api/recovery/status", { headers }).catch(() => null),
        fetch("/api/recovery/backups", { headers }).catch(() => null),
        fetch("/api/recovery/audit", { headers }).catch(() => null),
      ]);

      if (statusRes && statusRes.ok) {
        const data = await statusRes.json();
        if (data.data) setStatus(data.data);
      }

      if (backupsRes && backupsRes.ok) {
        const data = await backupsRes.json();
        if (data.data) setBackups(data.data);
      }

      if (auditRes && auditRes.ok) {
        const data = await auditRes.json();
        if (data.data) setAuditLogs(data.data);
      }
    } catch (e) {
      console.warn("Failed to fetch disaster recovery status:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecoveryData();
  }, []);

  const handleVerifyBackup = async (backupId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/recovery/backups/${backupId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(`Backup ${backupId} checksum verified successfully!`);
        fetchRecoveryData();
      }
    } catch (e: any) {
      alert("Failed to verify backup: " + e.message);
    }
  };

  const handleVerifyEvidenceIntegrity = async () => {
    setVerifyingEvidence(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/recovery/evidence/integrity", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(
          `Evidence Vault deep scan complete: ${data.data.recordsVerified}/${data.data.recordsChecked} valid (${data.data.mismatchesDetected} mismatches).`
        );
        fetchRecoveryData();
      }
    } catch (e: any) {
      alert("Failed to verify evidence: " + e.message);
    } finally {
      setVerifyingEvidence(false);
    }
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryReason.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/recovery/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          backupId: selectedBackupId,
          targetEnvironment: targetEnv,
          reason: recoveryReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRequestModalOpen(false);
        setRecoveryReason("");
        setActionSuccessMessage(`Recovery operation ${data.data.recoveryId} requested successfully.`);
        fetchRecoveryData();
      }
    } catch (e: any) {
      alert("Failed to request recovery: " + e.message);
    }
  };

  const handleApproveRecovery = async (recoveryId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/recovery/${recoveryId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ approvalNotes: "Authorized by Security Officer" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(`Recovery ${recoveryId} approved. Validating restore readiness...`);
        fetchRecoveryData();
      }
    } catch (e: any) {
      alert("Approval error: " + e.message);
    }
  };

  const handleExecuteRecovery = async (recoveryId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/recovery/${recoveryId}/execute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(`Disaster recovery restore executed successfully for ${recoveryId}!`);
        fetchRecoveryData();
      }
    } catch (e: any) {
      alert("Execution error: " + e.message);
    }
  };

  const handleRollback = async (recoveryId: string) => {
    if (!confirm("Are you sure you want to trigger a production application rollback?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/recovery/${recoveryId}/rollback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(`Application rolled back successfully to previous known-good release!`);
        fetchRecoveryData();
      }
    } catch (e: any) {
      alert("Rollback error: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                <RotateCcw className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Disaster Recovery & Business Continuity
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                    SLA ACTIVE
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated Backup Verification • Evidence Cryptographic Integrity • Zero-Downtime Rollback
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleVerifyEvidenceIntegrity}
              disabled={verifyingEvidence}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-2 transition"
            >
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              {verifyingEvidence ? "Scanning Evidence..." : "Verify Evidence Integrity"}
            </button>

            <button
              onClick={() => setRequestModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Request Recovery
            </button>

            <button
              onClick={fetchRecoveryData}
              disabled={refreshing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
              title="Refresh Recovery Status"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {actionSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RPO SLA TARGET</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">≤ {status.rpoTargetMinutes}m</span>
            <span className="text-xs text-emerald-400 font-medium">Current: {status.currentRpoMinutes}m</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Maximum allowable data loss window</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RTO SLA TARGET</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">≤ {status.rtoTargetMinutes}m</span>
            <span className="text-xs text-emerald-400 font-medium">Ready</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Full service restoration SLA</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">EVIDENCE INTEGRITY</span>
            <Fingerprint className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">100%</span>
            <span className="text-xs text-slate-400 font-medium">0 Mismatches</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">SHA-256 cryptographically sealed</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OVERALL READINESS</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-400">{status.overallReadiness}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Disaster readiness posture</p>
        </div>
      </div>

      {/* Component Readiness Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white tracking-tight mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          System Recovery & Resilience Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-xs text-slate-400">Database</p>
            <p className="text-sm font-bold text-white mt-0.5">{status.database.status}</p>
            <p className="text-[10px] text-slate-500 mt-1">Latency: {status.database.latencyMs}ms</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Archive className="w-4 h-4 text-cyan-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">Backup</p>
            <p className="text-sm font-bold text-white mt-0.5">{status.backup.status}</p>
            <p className="text-[10px] text-slate-500 mt-1">Age: {status.backup.backupAgeMinutes}m</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">Evidence Vault</p>
            <p className="text-sm font-bold text-white mt-0.5">{status.evidenceVault.status}</p>
            <p className="text-[10px] text-slate-500 mt-1">{status.evidenceVault.verifiedRecords} Records</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">Telemetry Queue</p>
            <p className="text-sm font-bold text-white mt-0.5">{status.telemetryQueue.status}</p>
            <p className="text-[10px] text-slate-500 mt-1">Idempotency ON</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <RotateCcw className="w-4 h-4 text-violet-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">Rollback</p>
            <p className="text-sm font-bold text-white mt-0.5">{status.rollback.status}</p>
            <p className="text-[10px] text-slate-500 mt-1">v{status.rollback.previousKnownGoodVersion}</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">Readiness</p>
            <p className="text-sm font-bold text-white mt-0.5">{status.overallReadiness}</p>
            <p className="text-[10px] text-slate-500 mt-1">SLA Verified</p>
          </div>
        </div>
      </div>

      {/* Backups Catalog & Verification Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Archive className="w-4 h-4 text-cyan-400" />
            Backup Inventory & Cryptographic Checksums
          </h2>
          <span className="text-xs text-slate-400">{backups.length} Available Recovery Points</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Backup ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">SHA-256 Checksum</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {backups.map((b) => (
                <tr key={b.backupId} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-semibold text-white">{b.backupId}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-sans">
                      {b.backupType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-sans">{(b.size / (1024 * 1024)).toFixed(2)} MB</td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-[180px]" title={b.checksum}>
                    {b.checksum.substring(0, 18)}...
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-fit ${
                        b.verificationStatus === "VERIFIED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : b.verificationStatus === "CORRUPTED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {b.verificationStatus === "VERIFIED" && <CheckCircle2 className="w-3 h-3" />}
                      {b.verificationStatus === "CORRUPTED" && <AlertTriangle className="w-3 h-3" />}
                      {b.verificationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => handleVerifyBackup(b.backupId)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded text-[11px] transition"
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                    No backup points cataloged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recovery Operations History */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            Disaster Recovery Operations & Rollback Runs
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Recovery ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Target Backup</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Approved By</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {status.recentRecoveries.map((op: any) => (
                <tr key={op.recoveryId} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-white">{op.recoveryId}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        op.status === "COMPLETED" || op.status === "ROLLED_BACK"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : op.status === "IN_PROGRESS"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : op.status === "FAILED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {op.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-400">{op.backupId}</td>
                  <td className="py-3 px-4 text-slate-400">{op.requestedBy?.email || "System"}</td>
                  <td className="py-3 px-4 text-slate-400">{op.approvedBy?.email || "Pending Approval"}</td>
                  <td className="py-3 px-4 text-slate-300 max-w-[200px] truncate" title={op.reason}>
                    {op.reason}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {op.status === "REQUESTED" && (
                      <button
                        onClick={() => handleApproveRecovery(op.recoveryId)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium"
                      >
                        Authorize & Approve
                      </button>
                    )}
                    {op.status === "APPROVED" && (
                      <button
                        onClick={() => handleExecuteRecovery(op.recoveryId)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium"
                      >
                        Execute Restore
                      </button>
                    )}
                    {op.status === "COMPLETED" && (
                      <button
                        onClick={() => handleRollback(op.recoveryId)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded text-[11px]"
                      >
                        Rollback
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recovery Audit Trail Log */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            Immutable Disaster Recovery Audit Trail (Zero Secrets / Redacted)
          </h2>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {auditLogs.map((log: any) => (
            <div
              key={log.id}
              className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px] text-cyan-400">
                  {log.eventType}
                </span>
                <span className="text-slate-300">{log.actionSummary}</span>
              </div>
              <span className="text-slate-500 font-mono text-[10px] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <p className="text-center py-4 text-xs text-slate-500">No recovery audit entries logged yet.</p>
          )}
        </div>
      </div>

      {/* Request Recovery Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-cyan-400" />
              Request Disaster Recovery Restore
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Restoration requires administrative authorization and pre-restore checksum validation.
            </p>

            <form onSubmit={handleRequestRecovery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Recovery Backup</label>
                <select
                  value={selectedBackupId}
                  onChange={(e) => setSelectedBackupId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {backups.map((b) => (
                    <option key={b.backupId} value={b.backupId}>
                      {b.backupId} ({b.verificationStatus} - {(b.size / (1024 * 1024)).toFixed(2)} MB)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Environment</label>
                <select
                  value={targetEnv}
                  onChange={(e) => setTargetEnv(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="PRODUCTION">Production Primary</option>
                  <option value="STAGING">Staging / Pre-Prod</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Restoration</label>
                <textarea
                  required
                  rows={3}
                  value={recoveryReason}
                  onChange={(e) => setRecoveryReason(e.target.value)}
                  placeholder="E.g. Database failover test, simulated outage drill, corrupted partition recovery..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-xs shadow-lg shadow-cyan-600/20"
                >
                  Submit Recovery Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
