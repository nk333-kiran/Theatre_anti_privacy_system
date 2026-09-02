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
  Terminal,
} from "lucide-react";
import {
  UserProfile,
  OrchestrationSummaryItem,
  fetchSessionOrchestration,
  processPiracyOrchestration,
} from "../../lib/api";

interface EndToEndResponsePanelProps {
  user?: UserProfile | null;
  initialSessionId?: string;
}

export const EndToEndResponsePanel: React.FC<EndToEndResponsePanelProps> = ({
  user,
  initialSessionId = "",
}) => {
  const [sessionIdInput, setSessionIdInput] = useState(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [orchestrationData, setOrchestrationData] = useState<OrchestrationSummaryItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;

  const handleLookup = async (idToFetch?: string) => {
    const target = (idToFetch || sessionIdInput).trim();
    if (!target) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchSessionOrchestration(target, token);
      if (res.success && res.data) {
        setOrchestrationData(res.data);
      } else {
        setErrorMsg("Screening session not found or unauthorized.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load orchestration status.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSignal = async (signalType: string, severity: string = "HIGH") => {
    const target = (sessionIdInput || orchestrationData?.pipelineStages.session.sessionId || "DEMO-SESSION-01").trim();
    setSimulating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await processPiracyOrchestration(
        {
          sessionId: target,
          signals: [
            {
              signalType,
              severity,
              payload: {
                simulatedAt: new Date().toISOString(),
                sensorSource: "MOBILE_PROTECTION_AGENT",
                hardwareId: "SANDBOX_SIMULATOR",
              },
            },
          ],
        },
        token
      );

      if (res.success && res.data) {
        setOrchestrationData(res.data);
        setSessionIdInput(res.data.pipelineStages.session.sessionId);
        setSuccessMsg(`Processed ${signalType} -> Status: ${res.data.status} (Risk: ${res.data.riskScore}/100)`);
      } else {
        setErrorMsg("Failed to orchestrate signal response.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (initialSessionId) {
      handleLookup(initialSessionId);
    }
  }, [initialSessionId]);

  const stages = [
    {
      id: "SESSION",
      title: "1. Ticket QR Session",
      icon: Ticket,
      active: !!orchestrationData?.pipelineStages.session,
      badge: orchestrationData?.pipelineStages.session.protectionStatus || "IDLE",
      color: "border-indigo-500/40 bg-indigo-950/20 text-indigo-400",
    },
    {
      id: "DETECTION",
      title: "2. Threat Signals",
      icon: Zap,
      active: (orchestrationData?.pipelineStages.detection.signalsEvaluated || 0) > 0,
      badge: orchestrationData?.pipelineStages.detection.escalationDecision || "AWAITING",
      color: "border-amber-500/40 bg-amber-950/20 text-amber-400",
    },
    {
      id: "SOC",
      title: "3. SOC Incident",
      icon: ShieldAlert,
      active: !!orchestrationData?.pipelineStages.soc,
      badge: orchestrationData?.pipelineStages.soc ? orchestrationData.pipelineStages.soc.incidentNumber : "NOMINAL",
      color: orchestrationData?.pipelineStages.soc
        ? "border-rose-500/50 bg-rose-950/20 text-rose-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "EVIDENCE",
      title: "4. Forensic Evidence",
      icon: Fingerprint,
      active: !!orchestrationData?.pipelineStages.evidence,
      badge: orchestrationData?.pipelineStages.evidence ? "SHA-256 VERIFIED" : "NONE",
      color: orchestrationData?.pipelineStages.evidence
        ? "border-cyan-500/50 bg-cyan-950/20 text-cyan-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "CASE",
      title: "5. Investigation Case",
      icon: FileText,
      active: !!orchestrationData?.pipelineStages.investigationCase,
      badge: orchestrationData?.pipelineStages.investigationCase?.status || "STANDBY",
      color: orchestrationData?.pipelineStages.investigationCase
        ? "border-purple-500/50 bg-purple-950/20 text-purple-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
    {
      id: "ENFORCEMENT",
      title: "6. Human Gated Action",
      icon: Gavel,
      active: !!orchestrationData?.pipelineStages.enforcement,
      badge: orchestrationData?.pipelineStages.enforcement?.approvalStatus || "APPROVAL GATED",
      color: orchestrationData?.pipelineStages.enforcement
        ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
        : "border-slate-700/50 bg-slate-900/40 text-slate-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Phase 29 Automated Pipeline
            </span>
            <span className="text-xs text-slate-400">Zero-Human-Bypass Orchestration</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            End-to-End Piracy Response Orchestration
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Automated correlation flow linking Ticket QR → Protected Session → Signal Detection → SOC Incident → Cryptographic Evidence → Investigation Case → Human Approval → Studio Intelligence.
          </p>
        </div>

        {/* Search Session Bar */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Session / Activation ID..."
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>
          <button
            onClick={() => handleLookup()}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Inspect Trace
          </button>
        </div>
      </div>

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

      {/* Interactive Workflow Pipeline Diagram */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Response Stage Flow
          </h3>
          {orchestrationData && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">
                Correlation ID: <code className="text-indigo-300 font-mono">{orchestrationData.correlationId}</code>
              </span>
              <span
                className={`px-2 py-0.5 rounded font-semibold border ${
                  orchestrationData.status === "ESCALATED"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : orchestrationData.status === "WARNING"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {orchestrationData.status}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className={`p-4 rounded-xl border transition-all ${stage.color} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10 uppercase">
                      {stage.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold">{stage.title}</h4>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
                  {stage.active ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                    </span>
                  ) : (
                    <span className="text-slate-500">Standby</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Orchestration Details */}
      {orchestrationData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Screening Session & Detection */}
          <div className="space-y-6">
            {/* Session Card */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-400" />
                  Protected Screening Session
                </h4>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                  {orchestrationData.pipelineStages.session.protectionStatus}
                </span>
              </div>

              <div className="text-xs space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Movie Title:</span>
                  <span className="font-medium text-slate-200">{orchestrationData.pipelineStages.session.movieTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Theatre Venue:</span>
                  <span className="font-medium text-slate-200">{orchestrationData.pipelineStages.session.theatreName} ({orchestrationData.pipelineStages.session.theatreCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Seat:</span>
                  <span className="font-mono font-semibold text-indigo-400">{orchestrationData.pipelineStages.session.seatNumber || "UNBOUND"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket Ref:</span>
                  <span className="font-mono text-slate-400">{orchestrationData.pipelineStages.session.ticketNumber || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Detection Signals */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Telemetry Detection Signals
                </h4>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Risk {orchestrationData.pipelineStages.detection.compositeRiskScore}/100
                </span>
              </div>

              {orchestrationData.pipelineStages.detection.warningMessage && (
                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{orchestrationData.pipelineStages.detection.warningMessage}</span>
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {orchestrationData.pipelineStages.detection.signals.map((sig, i) => (
                  <div key={i} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-semibold text-slate-200">{sig.signalType}</span>
                      <p className="text-[10px] text-slate-500">{new Date(sig.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {sig.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: SOC Incident & Forensic Evidence */}
          <div className="space-y-6">
            {/* SOC Incident */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Correlated SOC Incident
                </h4>
                {orchestrationData.pipelineStages.soc ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                    {orchestrationData.pipelineStages.soc.severity}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">None</span>
                )}
              </div>

              {orchestrationData.pipelineStages.soc ? (
                <div className="text-xs space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Incident Number:</span>
                    <span className="font-mono font-semibold text-rose-400">{orchestrationData.pipelineStages.soc.incidentNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Title:</span>
                    <span className="font-medium text-slate-200">{orchestrationData.pipelineStages.soc.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-slate-300">{orchestrationData.pipelineStages.soc.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">No SOC Incident required for this risk tier.</p>
              )}
            </div>

            {/* Evidence Vault Package */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  Evidence Vault & Watermark
                </h4>
                {orchestrationData.pipelineStages.evidence?.isVerified && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> SHA-256
                  </span>
                )}
              </div>

              {orchestrationData.pipelineStages.evidence ? (
                <div className="text-xs space-y-2.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Evidence Record:</span>
                    <span className="font-mono font-semibold text-cyan-300">{orchestrationData.pipelineStages.evidence.evidenceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Classification:</span>
                    <span className="font-medium text-slate-200">{orchestrationData.pipelineStages.evidence.classification}</span>
                  </div>
                  {orchestrationData.pipelineStages.evidence.watermark && (
                    <div className="p-2 rounded bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300 space-y-1 font-mono">
                      <div className="text-cyan-400 font-bold">Dynamic Session Watermark</div>
                      <div>ID: {orchestrationData.pipelineStages.evidence.watermark.watermarkId}</div>
                      <div>Slot: {orchestrationData.pipelineStages.evidence.watermark.timeSlot}</div>
                    </div>
                  )}
                  {orchestrationData.pipelineStages.evidence.sha256Hash && (
                    <div className="text-[10px] font-mono text-slate-400 truncate bg-slate-950/70 p-1.5 rounded border border-slate-800">
                      Hash: {orchestrationData.pipelineStages.evidence.sha256Hash}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">No forensic evidence compiled.</p>
              )}
            </div>
          </div>

          {/* Column 3: Case & Enforcement Gate */}
          <div className="space-y-6">
            {/* Investigation Case */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Investigation Case
                </h4>
                {orchestrationData.pipelineStages.investigationCase ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                    {orchestrationData.pipelineStages.investigationCase.status}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">None</span>
                )}
              </div>

              {orchestrationData.pipelineStages.investigationCase ? (
                <div className="text-xs space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Case Identifier:</span>
                    <span className="font-mono font-semibold text-purple-400">{orchestrationData.pipelineStages.investigationCase.caseNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Severity:</span>
                    <span className="font-medium text-slate-200">{orchestrationData.pipelineStages.investigationCase.severity}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">No case initiated.</p>
              )}
            </div>

            {/* Enforcement Human Approval Gate */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-emerald-400" />
                  Enforcement Action Proposal
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Human Gate
                </span>
              </div>

              {orchestrationData.pipelineStages.enforcement ? (
                <div className="text-xs space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Action Ref:</span>
                    <span className="font-mono font-semibold text-emerald-400">{orchestrationData.pipelineStages.enforcement.enforcementNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type:</span>
                    <span className="font-medium text-slate-200">{orchestrationData.pipelineStages.enforcement.actionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approval State:</span>
                    <span className="font-bold text-amber-400">{orchestrationData.pipelineStages.enforcement.approvalStatus}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 mt-2">
                    🛡️ Enforcement draft held in <strong>REVIEW</strong> state. Requires human approval before submission.
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">No enforcement proposal generated.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500">
          <Terminal className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-400 font-medium">No Screening Session Loaded</p>
          <p className="text-xs text-slate-600 mt-1">
            Enter an active session ID above or click a simulation test button below to trigger automated end-to-end orchestration.
          </p>
        </div>
      )}

      {/* Interactive Simulation / Test Triggers */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Live Security Signal Testing Rig
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Test deterministic risk escalation & automated pipeline without leaving the dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSimulateSignal("SESSION_HEARTBEAT", "INFO")}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition disabled:opacity-50"
          >
            Nominal Heartbeat
          </button>
          <button
            onClick={() => handleSimulateSignal("FULLSCREEN_EXIT", "LOW")}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition disabled:opacity-50"
          >
            Weak Signal (Warning)
          </button>
          <button
            onClick={() => handleSimulateSignal("CAMERA_ACTIVITY", "HIGH")}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition disabled:opacity-50"
          >
            Camera Signal (SOC Incident)
          </button>
          <button
            onClick={() => handleSimulateSignal("SCREEN_CAPTURE_SIGNAL", "CRITICAL")}
            disabled={simulating}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" /> Full Piracy Breach (E2E)
          </button>
        </div>
      </div>
    </div>
  );
};
export default EndToEndResponsePanel;
