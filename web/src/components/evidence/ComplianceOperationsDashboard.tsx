"use client";

import React, { useState, useEffect } from "react";
import { ComplianceStatsData, fetchComplianceStats } from "../../lib/api";

export default function ComplianceOperationsDashboard() {
  const [stats, setStats] = useState<ComplianceStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetchComplianceStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to load compliance stats:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-bold tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 rounded-full uppercase">
              Forensic Compliance & Retention
            </span>
            <span className="text-xs text-slate-400">Zero-Secret • Legal Hold Protected</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 tracking-tight">Compliance Operations Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Global evidence integrity metrics, automated statutory retention policies, and legal hold safeguards.
          </p>
        </div>

        <button
          onClick={loadStats}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors border border-slate-700 self-start md:self-auto"
        >
          🔄 Refresh Metrics
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Evidence */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Vaulted Evidence</span>
            <span className="text-indigo-400">📦</span>
          </div>
          <p className="text-3xl font-black text-white">
            {loading ? "..." : stats?.evidenceHealth?.totalEvidence ?? 0}
          </p>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <span>✓ Verified:</span>
            <span className="font-bold">{stats?.evidenceHealth?.verifiedCount ?? 0}</span>
          </div>
        </div>

        {/* Tamper Alerts */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Integrity Violations</span>
            <span className="text-red-400">🛡️</span>
          </div>
          <p
            className={`text-3xl font-black ${
              (stats?.evidenceHealth?.tamperedCount ?? 0) > 0 ? "text-red-400" : "text-white"
            }`}
          >
            {loading ? "..." : stats?.evidenceHealth?.tamperedCount ?? 0}
          </p>
          <div className="text-[11px] text-slate-400">
            {(stats?.evidenceHealth?.tamperedCount ?? 0) === 0 ? "100% Cryptographic Continuity" : "Tamper Detected!"}
          </div>
        </div>

        {/* Legal Hold Protection */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Legal Holds Active</span>
            <span className="text-amber-400">⚖️</span>
          </div>
          <p className="text-3xl font-black text-amber-400">
            {loading ? "..." : stats?.evidenceHealth?.legalHoldCount ?? 0}
          </p>
          <div className="text-[11px] text-slate-400">Protected from auto-purge</div>
        </div>

        {/* Active Investigations */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Open Cases</span>
            <span className="text-cyan-400">🕵️</span>
          </div>
          <p className="text-3xl font-black text-white">
            {loading ? "..." : stats?.investigationMetrics?.openCases ?? 0}
          </p>
          <div className="text-[11px] text-indigo-300">
            Total: {stats?.investigationMetrics?.totalCases ?? 0} ({stats?.investigationMetrics?.criticalSeverityCount ?? 0} Critical)
          </div>
        </div>
      </div>

      {/* Retention Policy & Compliance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Policy Engine Status */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Statutory Retention Policy Rules</h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              ACTIVE ENFORCEMENT
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-white block">Standard Operational Telemetry</span>
                <span className="text-slate-500">Low & Medium severity anomalous signals</span>
              </div>
              <span className="font-mono text-indigo-300 font-bold">90 Days</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-white block">Forensic Watermark & Tamper Records</span>
                <span className="text-slate-500">High & Critical security evidence artifacts</span>
              </div>
              <span className="font-mono text-indigo-300 font-bold">365 Days</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-white block">Legal Hold Exemption</span>
                <span className="text-slate-500">Records tagged for court proceedings / studio audit</span>
              </div>
              <span className="font-mono text-amber-400 font-bold">IMMUTABLE (No Expiration)</span>
            </div>
          </div>
        </div>

        {/* Forensic Export & Privacy Guarantees */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white">Forensic Export & Privacy Controls</h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🛡️</span> Zero-Secret Sanitization
              </span>
              <p className="text-slate-400">
                Exports automatically scrub JWT secrets, DRM master keys, passwords, and private decryption credentials.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <span>🔒</span> Zero-PII Forensic Telemetry
              </span>
              <p className="text-slate-400">
                Watermark payloads use non-PII auditorium coordinate tokens, activation session hashes, and screen identifiers.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                <span>📜</span> Cryptographic Chain Verification
              </span>
              <p className="text-slate-400">
                Every exported dossier includes the unbroken SHA-256 block hash history from genesis acquisition to export.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
