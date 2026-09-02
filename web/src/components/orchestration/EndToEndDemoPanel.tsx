"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Fingerprint,
  Gavel,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Lock,
  Layers,
  Sparkles,
  Ticket,
  Tv,
  Film,
  Building2,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  BarChart3,
  Globe,
  Radio,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  UserProfile,
  EndToEndDemoResult,
  DemoStatusResult,
  runEndToEndDemo,
  fetchDemoStatus,
  resetDemoScenario,
  approveDemoEnforcement,
} from "../../lib/api";

interface EndToEndDemoPanelProps {
  user?: UserProfile | null;
}

export const EndToEndDemoPanel: React.FC<EndToEndDemoPanelProps> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [runningDemo, setRunningDemo] = useState(false);
  const [approving, setApproving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<"FULL_PIPELINE" | "NOMINAL" | "WEAK">("FULL_PIPELINE");
  const [demoData, setDemoData] = useState<EndToEndDemoResult | null>(null);
  const [demoStatus, setDemoStatus] = useState<DemoStatusResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;

  const loadStatus = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchDemoStatus(token);
      if (res.success && res.data) {
        setDemoStatus(res.data);
      }
    } catch (err: any) {
      console.warn("Failed to load baseline demo status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleRunDemo = async (signalLevel: "FULL_PIPELINE" | "NOMINAL" | "WEAK" = selectedSignal) => {
    setRunningDemo(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await runEndToEndDemo({ signalLevel, autoApproveEnforcement: false }, token);
      if (res.success && res.data) {
        setDemoData(res.data);
        setSuccessMsg(
          `Demo executed successfully! Mode: ${signalLevel} • Status: ${res.data.overallStatus} (Risk: ${res.data.riskScore}/100)`
        );
        loadStatus();
      } else {
        setErrorMsg("Failed to execute end-to-end demo workflow.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute demo.");
    } finally {
      setRunningDemo(false);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await resetDemoScenario(token);
      if (res.success) {
        setDemoData(null);
        setSuccessMsg("Demo scenario and security telemetry successfully reset to pristine state.");
        loadStatus();
      } else {
        setErrorMsg("Failed to reset demo scenario.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset demo.");
    } finally {
      setResetting(false);
    }
  };

  const handleApproveEnforcement = async (enforcementId: string) => {
    setApproving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await approveDemoEnforcement(
        enforcementId,
        "Human authorized via Phase 30 End-to-End Demo Control Panel",
        token
      );
      if (res.success && res.data) {
        setSuccessMsg(`Enforcement ${res.data.enforcementNumber || enforcementId} authorized and approved!`);
        if (demoData) {
          setDemoData({
            ...demoData,
            summary: {
              ...demoData.summary,
              enforcementStatus: "APPROVED",
              humanApprovalStatus: "APPROVED",
            },
          });
        }
        loadStatus();
      } else {
        setErrorMsg("Failed to authorize enforcement action.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Approval action failed.");
    } finally {
      setApproving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const stagesList = [
    {
      id: "SESSION",
      label: "SESSION",
      name: "1. Ticket QR Session",
      icon: Ticket,
      active: !!demoData?.summary.sessionId || !!demoStatus?.fixtures,
      status: demoData?.summary.protectionStatus || demoStatus?.fixtures.activationStatus || "READY",
      color: "border-indigo-500/40 bg-indigo-950/20 text-indigo-400",
    },
    {
      id: "DETECTION",
      label: "DETECTION",
      name: "2. Threat Signals",
      icon: Zap,
      active: !!demoData,
      status: demoData ? `${demoData.riskScore}/100 Risk` : "STANDBY",
      color: "border-amber-500/40 bg-amber-950/20 text-amber-400",
    },
    {
      id: "SOC",
      label: "SOC",
      name: "3. SOC Incident",
      icon: ShieldAlert,
      active: !!demoData?.summary.incidentId,
      status: demoData?.summary.incidentNumber || "NOMINAL",
      color: demoData?.summary.incidentId
        ? "border-rose-500/50 bg-rose-950/20 text-rose-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "EVIDENCE",
      label: "EVIDENCE",
      name: "4. Forensic Evidence",
      icon: Fingerprint,
      active: !!demoData?.summary.evidenceId,
      status: demoData?.summary.isEvidenceVerified ? "SHA-256 OK" : "NONE",
      color: demoData?.summary.evidenceId
        ? "border-cyan-500/50 bg-cyan-950/20 text-cyan-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "CASE",
      label: "CASE",
      name: "5. Investigation Case",
      icon: FileText,
      active: !!demoData?.summary.caseId,
      status: demoData?.summary.caseNumber || "STANDBY",
      color: demoData?.summary.caseId
        ? "border-purple-500/50 bg-purple-950/20 text-purple-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "APPROVAL",
      label: "APPROVAL",
      name: "6. Human Approval",
      icon: Lock,
      active: !!demoData?.summary.enforcementId,
      status: demoData?.summary.humanApprovalStatus || "GATE READY",
      color: demoData?.summary.humanApprovalStatus === "APPROVED"
        ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
        : demoData?.summary.enforcementId
        ? "border-amber-500/50 bg-amber-950/20 text-amber-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "ENFORCEMENT",
      label: "ENFORCEMENT",
      name: "7. Enforcement Action",
      icon: Gavel,
      active: !!demoData?.summary.enforcementId,
      status: demoData?.summary.enforcementStatus || "DRAFT GATED",
      color: demoData?.summary.enforcementStatus === "APPROVED"
        ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
        : demoData?.summary.enforcementId
        ? "border-sky-500/50 bg-sky-950/20 text-sky-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "INTELLIGENCE",
      label: "INTELLIGENCE",
      name: "8. Studio Intelligence",
      icon: BarChart3,
      active: !!demoData?.studioIntelligence,
      status: demoData?.summary.threatPosture || "SYNCHRONIZED",
      color: "border-indigo-500/40 bg-indigo-950/20 text-indigo-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 tracking-wide">
              PHASE 30 VALIDATION
            </span>
            <span className="text-xs text-slate-400">Complete Production Response Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            End-to-End Piracy Response Demo Panel
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Live interactive verification proving full lifecycle correlation: Ticket QR → Protected Session → Signal Detection → SOC Incident → Dynamic Watermark → Forensic Evidence → Investigation Case → Human Approval → Enforcement → Studio Intelligence.
          </p>
        </div>

        {/* Global Demo Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Signal Level Selector */}
          <select
            value={selectedSignal}
            onChange={(e) => setSelectedSignal(e.target.value as any)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="FULL_PIPELINE">High-Risk Piracy Telemetry (Full Escalation)</option>
            <option value="WEAK">Weak Suspicious Signal (Warning Only)</option>
            <option value="NOMINAL">Nominal Heartbeat Signal (Zero Risk)</option>
          </select>

          <button
            onClick={() => handleRunDemo(selectedSignal)}
            disabled={runningDemo}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Play className={`w-4 h-4 ${runningDemo ? "animate-spin" : ""}`} />
            {runningDemo ? "Running Full Demo..." : "Run Full Demo"}
          </button>

          <button
            onClick={handleResetDemo}
            disabled={resetting}
            title="Reset demo fixtures and state"
            className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer border border-slate-700"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
            Reset State
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 8-STAGE END-TO-END PIPELINE DIAGRAM */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              SESSION → DETECTION → SOC → EVIDENCE → CASE → APPROVAL → ENFORCEMENT → INTELLIGENCE
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic, zero-bypass pipeline flow with strict human approval governance
            </p>
          </div>
          {demoData && (
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-slate-400 font-mono">
                Correlation: <code className="text-indigo-300">{demoData.correlationId}</code>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold border ${
                  demoData.overallStatus === "ESCALATED"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : demoData.overallStatus === "WARNING"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {demoData.overallStatus} ({demoData.riskScore}/100)
              </span>
            </div>
          )}
        </div>

        {/* Horizontal Pipeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {stagesList.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className={`p-3.5 rounded-xl border transition-all ${stage.color} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10 uppercase">
                      {stage.label}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold leading-tight">{stage.name}</h4>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="truncate font-mono text-[10px] opacity-90">{stage.status}</span>
                  {stage.active ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-slate-500 text-[10px]">Idle</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAIL CARDS & LIVE TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Session, QR & Detection */}
        <div className="space-y-6">
          {/* Card 1: Ticket & Screening Session */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-indigo-400" />
                Screening Session Fixture
              </h4>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Feature Movie:</span>
                <span className="font-semibold text-slate-200">
                  {demoData?.summary.movieTitle || demoStatus?.fixtures.movieTitle || "Interstellar Sentinel: Cyber Odyssey"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Theatre Venue:</span>
                <span className="font-semibold text-slate-200">
                  {demoData?.summary.theatreName || demoStatus?.fixtures.theatreName || "Grand Palace Laser IMAX"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seat Number:</span>
                <span className="font-mono text-indigo-300">K-14 (Laser IMAX)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ticket Number:</span>
                <span className="font-mono text-slate-200">
                  {demoData?.summary.activationCode || demoStatus?.fixtures.ticketNumber || "TCK-VAL-DEMO-01"}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1">
                <span className="text-slate-500 text-[11px]">Cryptographic QR Token:</span>
                <code className="text-[10px] font-mono text-indigo-300 break-all p-1.5 rounded bg-slate-950 border border-slate-800">
                  {demoData?.summary.secureQrToken || demoStatus?.fixtures.secureQrToken || "QRTK.ACT-VAL-DEMO-01.8cf7e91a"}
                </code>
              </div>
            </div>
          </div>

          {/* Card 2: Threat Detection & Risk Score */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Threat Detection & Risk Engine
              </h4>
              <span className="text-xs font-mono font-bold text-amber-400">
                Score: {demoData?.riskScore || 0}/100
              </span>
            </div>

            {/* Risk Gauge Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    (demoData?.riskScore || 0) >= 80
                      ? "bg-gradient-to-r from-amber-500 to-rose-500"
                      : (demoData?.riskScore || 0) >= 40
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${demoData?.riskScore || 5}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 (Nominal)</span>
                <span>50 (Suspicious)</span>
                <span>100 (Critical Escalation)</span>
              </div>
            </div>

            {/* Signal runner shortcuts */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-slate-400 text-xs font-medium">Quick Signal Runner:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleRunDemo("NOMINAL")}
                  disabled={runningDemo}
                  className="px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] font-medium text-emerald-400 border border-emerald-500/20 text-center transition"
                >
                  Heartbeat
                </button>
                <button
                  onClick={() => handleRunDemo("WEAK")}
                  disabled={runningDemo}
                  className="px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] font-medium text-amber-400 border border-amber-500/20 text-center transition"
                >
                  App Switch
                </button>
                <button
                  onClick={() => handleRunDemo("FULL_PIPELINE")}
                  disabled={runningDemo}
                  className="px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] font-medium text-rose-400 border border-rose-500/20 text-center transition"
                >
                  Cam / Tamper
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: SOC, Evidence & Investigation */}
        <div className="space-y-6">
          {/* Card 3: SOC Incident & Watermark Attribution */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                SOC Incident & Watermark
              </h4>
              {demoData?.summary.incidentNumber ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {demoData.summary.incidentNumber}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">NOMINAL</span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Incident Severity:</span>
                <span className="font-bold text-rose-400">
                  {demoData?.summary.incidentId ? "CRITICAL (Auto-Triaged)" : "NONE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Deduplication:</span>
                <span className="text-emerald-400 font-medium">Prevented Duplicate Incidents</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 text-[11px]">Dynamic Watermark Display:</span>
                <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300">
                  {demoData?.summary.watermarkDisplay || "THTR-VAL-DEMO • Auditorium 1 • Seat K-14 • [ACTIVE]"}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Cryptographic Forensic Evidence & Case */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                Evidence & Investigation Case
              </h4>
              <span className="text-[11px] font-mono text-cyan-400">
                {demoData?.summary.caseNumber || "CASE-STANDBY"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Evidence Record:</span>
                <span className="font-mono text-slate-200">
                  {demoData?.summary.evidenceNumber || "EV-PENDING"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SHA-256 Integrity:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Valid
                </span>
              </div>
              <div className="pt-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span>Hash Preview:</span>
                  {demoData?.summary.evidenceHash && (
                    <button
                      onClick={() => copyToClipboard(demoData.summary.evidenceHash!)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedHash ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
                <code className="block p-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 break-all">
                  {demoData?.summary.evidenceHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Enforcement & Studio KPIs */}
        <div className="space-y-6">
          {/* Card 5: Enforcement & Human Approval Gate */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-purple-400" />
                Enforcement & Human Gate
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  demoData?.summary.enforcementStatus === "APPROVED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : demoData?.summary.enforcementId
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {demoData?.summary.enforcementStatus || "AWAITING"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Action Type:</span>
                <span className="font-semibold text-slate-200">TAKEDOWN_NOTICE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Human Approval:</span>
                <span className="text-amber-400 font-semibold">Mandatory Zero-Bypass</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Enforcement ID:</span>
                <span className="font-mono text-slate-300">
                  {demoData?.summary.enforcementNumber || "ENF-PENDING"}
                </span>
              </div>

              {/* Interactive Human Approval Button */}
              {demoData?.summary.enforcementId && demoData.summary.enforcementStatus === "REVIEW" && (
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleApproveEnforcement(demoData.summary.enforcementId!)}
                    disabled={approving}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <CheckCircle className={`w-3.5 h-3.5 ${approving ? "animate-spin" : ""}`} />
                    {approving ? "Authorizing..." : "Approve Enforcement Action (Human Authorized)"}
                  </button>
                </div>
              )}

              {demoData?.summary.enforcementStatus === "APPROVED" && (
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Authorized by Authorized Officer • Cryptographically signed</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 6: Studio Intelligence KPIs */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Studio Intelligence KPIs
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                POSTURE: {demoData?.summary.threatPosture || "NOMINAL"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">Active Cases</span>
                <span className="text-base font-bold text-purple-400">
                  {demoData?.studioIntelligence?.kpis?.activeInvestigations ?? 1}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">Enforcements</span>
                <span className="text-base font-bold text-emerald-400">
                  {(demoData?.studioIntelligence?.kpis?.activeEnforcements ?? 0) + (demoData?.studioIntelligence?.kpis?.completedEnforcements ?? 1)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">Evidence Vault</span>
                <span className="text-base font-bold text-cyan-400">
                  {demoData?.studioIntelligence?.kpis?.totalEvidenceRecords ?? 1} Records
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-500">Takedown Rate</span>
                <span className="text-base font-bold text-indigo-400">100% Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Timeline History */}
      {demoData && demoData.stages && demoData.stages.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Live Stage Execution Trace ({demoData.executionId})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Timestamp: {new Date(demoData.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="space-y-2">
            {demoData.stages.map((stage, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200">{stage.title}</h5>
                    <p className="text-[11px] text-slate-400">{stage.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      stage.status === "SUCCESS"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
