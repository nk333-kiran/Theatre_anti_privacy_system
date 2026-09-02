"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Zap,
  Activity,
  Layers,
  FileText,
  Sliders,
  History,
  Key,
  Laptop,
  Clock,
  Plus,
  ArrowUpRight,
  Eye,
  Check,
  Ban,
  Fingerprint,
} from "lucide-react";
import {
  GovernanceStatsData,
  SecurityPolicyItem,
  AccessDecisionItem,
  DeviceTrustRecordItem,
  PrivilegedActionItem,
  BreakGlassSessionItem,
  fetchGovernanceStats,
  fetchSecurityPolicies,
  createSecurityPolicy,
  updateSecurityPolicy,
  rollbackSecurityPolicy,
  fetchAccessDecisions,
  fetchDeviceTrustRecords,
  updateDeviceTrustStatus,
  fetchPrivilegedActions,
  approvePrivilegedAction,
  rejectPrivilegedAction,
  fetchBreakGlassSessions,
  startBreakGlassSession,
  closeBreakGlassSession,
  reviewBreakGlassSession,
} from "../../lib/api";

export const EnterpriseGovernanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"POLICIES" | "DECISIONS" | "PRIVILEGED" | "DEVICES" | "BREAKGLASS">("POLICIES");
  const [stats, setStats] = useState<GovernanceStatsData | null>(null);
  const [policies, setPolicies] = useState<SecurityPolicyItem[]>([]);
  const [decisions, setDecisions] = useState<AccessDecisionItem[]>([]);
  const [privilegedActions, setPrivilegedActions] = useState<PrivilegedActionItem[]>([]);
  const [devices, setDevices] = useState<DeviceTrustRecordItem[]>([]);
  const [breakGlassSessions, setBreakGlassSessions] = useState<BreakGlassSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Feedback
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<SecurityPolicyItem | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form States
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyDesc, setNewPolicyDesc] = useState("");
  const [newPolicyType, setNewPolicyType] = useState("ACCESS_CONTROL");
  const [newPolicyPriority, setNewPolicyPriority] = useState(100);
  const [newPolicyRules, setNewPolicyRules] = useState(
    JSON.stringify(
      [
        {
          id: "rule-1",
          name: "Enforce Minimum Trust Score",
          effect: "ALLOW",
          condition: { minTrustScore: 60 },
        },
      ],
      null,
      2
    )
  );

  // Rollback Form
  const [rollbackVersion, setRollbackVersion] = useState<number>(1);
  const [rollbackReason, setRollbackReason] = useState("");

  // Break-Glass Form
  const [bgReason, setBgReason] = useState("");
  const [bgDuration, setBgDuration] = useState(60);

  // Review Form
  const [reviewNotes, setReviewNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, policiesData, decisionsData, privilegedData, devicesData, bgData] = await Promise.all([
        fetchGovernanceStats().catch(() => null),
        fetchSecurityPolicies().catch(() => []),
        fetchAccessDecisions().catch(() => []),
        fetchPrivilegedActions().catch(() => []),
        fetchDeviceTrustRecords().catch(() => []),
        fetchBreakGlassSessions().catch(() => []),
      ]);

      setStats(statsData);
      setPolicies(policiesData);
      setDecisions(decisionsData);
      setPrivilegedActions(privilegedData);
      setDevices(devicesData);
      setBreakGlassSessions(bgData);
    } catch (err: any) {
      console.error("Failed to load governance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;

    try {
      let parsedRules: any = [];
      try {
        parsedRules = JSON.parse(newPolicyRules);
      } catch {
        throw new Error("Policy rules must be valid JSON");
      }

      await createSecurityPolicy({
        name: newPolicyName,
        description: newPolicyDesc,
        policyType: newPolicyType,
        priority: Number(newPolicyPriority),
        rules: parsedRules,
      });

      setActionFeedback({ type: "success", text: "Security policy registered successfully" });
      setShowPolicyModal(false);
      setNewPolicyName("");
      setNewPolicyDesc("");
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to create policy" });
    }
  };

  const handleRollbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;

    try {
      await rollbackSecurityPolicy(selectedPolicy.id, Number(rollbackVersion), rollbackReason);
      setActionFeedback({ type: "success", text: `Policy rolled back to version ${rollbackVersion}` });
      setShowRollbackModal(false);
      setSelectedPolicy(null);
      setRollbackReason("");
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to rollback policy" });
    }
  };

  const handleApprovePrivileged = async (id: string) => {
    const notes = prompt("Enter approval justification notes:", "Approved after security posture review.");
    if (notes === null) return;

    try {
      await approvePrivilegedAction(id, notes);
      setActionFeedback({ type: "success", text: "Privileged action approved with one-time execution token" });
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to approve action" });
    }
  };

  const handleRejectPrivileged = async (id: string) => {
    const reason = prompt("Enter rejection reason:", "Insufficient justification or elevated risk.");
    if (reason === null) return;

    try {
      await rejectPrivilegedAction(id, reason);
      setActionFeedback({ type: "success", text: "Privileged action rejected" });
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to reject action" });
    }
  };

  const handleUpdateDeviceTrust = async (id: string, trustStatus: any) => {
    const reason = prompt(`Enter reason for marking device as ${trustStatus}:`, "Manual SOC assessment override");
    if (reason === null) return;

    try {
      await updateDeviceTrustStatus(id, trustStatus, reason);
      setActionFeedback({ type: "success", text: `Device trust status updated to ${trustStatus}` });
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to update device trust" });
    }
  };

  const handleStartBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgReason.trim() || bgReason.trim().length < 10) {
      alert("Please provide a comprehensive emergency justification (min 10 characters)");
      return;
    }

    try {
      await startBreakGlassSession(bgReason, Number(bgDuration));
      setActionFeedback({ type: "success", text: "BREAK-GLASS EMERGENCY SESSION ACTIVATED" });
      setShowBreakGlassModal(false);
      setBgReason("");
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to start emergency session" });
    }
  };

  const handleCloseBreakGlass = async (id: string) => {
    const notes = prompt("Enter emergency session closure notes:", "Emergency resolved, restoring standard controls.");
    if (notes === null) return;

    try {
      await closeBreakGlassSession(id, notes);
      setActionFeedback({ type: "success", text: "Break-Glass session closed" });
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to close emergency session" });
    }
  };

  const handleReviewBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !reviewNotes.trim()) return;

    try {
      await reviewBreakGlassSession(selectedSessionId, reviewNotes);
      setActionFeedback({ type: "success", text: "Post-incident compliance review recorded" });
      setShowReviewModal(false);
      setSelectedSessionId(null);
      setReviewNotes("");
      loadData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Failed to submit review" });
    }
  };

  const activeBg = breakGlassSessions.find((s) => s.isActive && new Date(s.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      {/* Emergency Active Banner */}
      {activeBg && (
        <div className="p-4 rounded-2xl bg-rose-600/20 border-2 border-rose-500/80 text-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse shadow-2xl">
          <div className="flex items-center gap-3">
            <Flame className="w-7 h-7 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>BREAK-GLASS EMERGENCY SESSION ACTIVE</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500 text-white font-mono">{activeBg.sessionIdentifier}</span>
              </div>
              <p className="text-xs text-rose-300/90 mt-0.5 max-w-2xl">
                Reason: {activeBg.reason} • Activated by: {activeBg.activatorEmail || activeBg.activatedBy} • Expires at: {new Date(activeBg.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleCloseBreakGlass(activeBg.id)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/40 whitespace-nowrap"
          >
            Close Emergency Access
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                Phase 19 Governance
              </span>
              <span className="text-xs text-slate-500">• Zero-Trust Architecture</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-400" /> Enterprise Zero-Trust & Governance Center
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Continuous identity, device, tenant, and threat verification. Multi-signature privileged approvals and audited break-glass emergency controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPolicyModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Policy</span>
            </button>
            <button
              onClick={() => setShowBreakGlassModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
            >
              <Flame className="w-4 h-4" />
              <span>Break-Glass</span>
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
            <span className="text-xs text-slate-400 font-medium">Zero-Trust Posture</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.overallTrustPosture ?? "OPTIMAL"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Continuous verification active</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Policies</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.activePolicies ?? 0} <span className="text-xs font-normal text-slate-500">/ {stats?.totalPolicies ?? 0}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Priority-ordered rule sets</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Access Decisions</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {stats?.totalDecisions ?? 0}
          </div>
          <div className="text-[11px] text-rose-400 mt-1">Denied: {stats?.deniedDecisions ?? 0}</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Pending Approvals</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {stats?.pendingApprovals ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Privileged operation queue</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Device Posture</span>
            <Laptop className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {stats?.trustedDevicesCount ?? 0} <span className="text-xs font-normal text-slate-500">Trusted</span>
          </div>
          <div className="text-[11px] text-rose-400 mt-1">Suspicious: {stats?.suspiciousDevicesCount ?? 0}</div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("POLICIES")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "POLICIES"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📜 Security Policies ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab("DECISIONS")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "DECISIONS"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          ⚡ Access Decisions ({decisions.length})
        </button>
        <button
          onClick={() => setActiveTab("PRIVILEGED")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "PRIVILEGED"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🔒 Privileged Approvals ({privilegedActions.length})
        </button>
        <button
          onClick={() => setActiveTab("DEVICES")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "DEVICES"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          💻 Device Trust ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab("BREAKGLASS")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
            activeTab === "BREAKGLASS"
              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🚨 Break-Glass Stations ({breakGlassSessions.length})
        </button>
      </div>

      {/* TAB 1: POLICIES */}
      {activeTab === "POLICIES" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Active Security Policies & Rule Precedence
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated in priority order (lowest index first). Changes generate immutable version snapshots.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Policy Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Tenant Scope</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-400">#{p.priority}</td>
                    <td className="p-3 font-semibold text-slate-200">
                      <div>{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs">{p.description}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{p.policyType}</td>
                    <td className="p-3 font-mono text-indigo-400 font-bold">v{p.version}</td>
                    <td className="p-3 text-slate-400">{p.tenantType || "GLOBAL"}</td>
                    <td className="p-3">
                      {p.isEnabled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-700 text-zinc-400">
                          DISABLED
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedPolicy(p);
                          setShowRollbackModal(true);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold"
                      >
                        Rollback History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACCESS DECISIONS */}
      {activeTab === "DECISIONS" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Explainable Zero-Trust Decision Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous audit trail of all access evaluations with deterministic trust/risk scores and triggered reason codes.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Decision</th>
                  <th className="p-3">Actor / Role</th>
                  <th className="p-3">Resource & Action</th>
                  <th className="p-3">Trust Score</th>
                  <th className="p-3">Reason Codes</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {decisions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No access decisions recorded yet.
                    </td>
                  </tr>
                ) : (
                  decisions.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold">
                        {d.decision === "ALLOW" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ALLOW
                          </span>
                        ) : d.decision === "APPROVAL_REQUIRED" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            APPROVAL REQUIRED
                          </span>
                        ) : d.decision === "STEP_UP" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            STEP UP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            DENY
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-200">
                        <div>{d.actorEmail || d.actorId || "Anonymous"}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{d.actorRole || "NO_ROLE"}</div>
                      </td>
                      <td className="p-3 text-slate-300">
                        <span className="font-mono text-indigo-400 font-bold">{d.action}</span> on {d.resourceType}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className={d.trustScore >= 80 ? "text-emerald-400" : d.trustScore >= 50 ? "text-amber-400" : "text-rose-400"}>
                          {d.trustScore}/100
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {d.reasonCodes}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[11px] text-right">
                        {new Date(d.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRIVILEGED ACTIONS */}
      {activeTab === "PRIVILEGED" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" /> Multi-Signature Privileged Action Approvals
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High-impact actions (DRM key revocations, playback termination, policy alterations) require two-person administrator authorization.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Requester</th>
                  <th className="p-3">Target Resource</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expiration</th>
                  <th className="p-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {privilegedActions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No privileged actions in queue.
                    </td>
                  </tr>
                ) : (
                  privilegedActions.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-200">
                        {act.actionType}
                      </td>
                      <td className="p-3 text-slate-300">
                        <div>{act.requesterEmail || act.requestedBy}</div>
                        <div className="text-[11px] text-slate-500">{act.requesterRole}</div>
                      </td>
                      <td className="p-3 text-slate-300">
                        <div>{act.targetResource}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{act.reason}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {act.riskLevel}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            act.approvalStatus === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : act.approvalStatus === "PENDING_APPROVAL"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                              : act.approvalStatus === "EXECUTED"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-zinc-700 text-zinc-400"
                          }`}
                        >
                          {act.approvalStatus}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {new Date(act.expiresAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-right">
                        {act.approvalStatus === "PENDING_APPROVAL" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRejectPrivileged(act.id)}
                              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded text-xs font-semibold"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprovePrivileged(act.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-md shadow-emerald-600/20"
                            >
                              Approve
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DEVICE TRUST */}
      {activeTab === "DEVICES" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-purple-400" /> Privacy-Preserving Device Trust Posture
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Endpoints evaluated via cryptographic SHA-256 fingerprint hashes without exposing raw hardware signatures.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Device Name</th>
                  <th className="p-3">SHA-256 Fingerprint Hash</th>
                  <th className="p-3">Trust Posture</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Last Seen IP</th>
                  <th className="p-3 text-right">Trust Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-200">
                      <div>{d.deviceName || "Unknown Endpoint"}</div>
                      <div className="text-[11px] text-slate-500">Observed {d.observationCount} times</div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      {d.deviceFingerprintHash}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.trustStatus === "TRUSTED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : d.trustStatus === "SUSPICIOUS"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : d.trustStatus === "BLOCKED"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {d.trustStatus}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-300">
                      {d.trustScore}/100
                    </td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">
                      {d.lastSeenIp || "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {d.trustStatus !== "TRUSTED" && (
                          <button
                            onClick={() => handleUpdateDeviceTrust(d.id, "TRUSTED")}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-semibold"
                          >
                            Trust
                          </button>
                        )}
                        {d.trustStatus !== "BLOCKED" && (
                          <button
                            onClick={() => handleUpdateDeviceTrust(d.id, "BLOCKED")}
                            className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded text-xs font-semibold"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BREAK-GLASS */}
      {activeTab === "BREAKGLASS" && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" /> Break-Glass Emergency Administrator Stations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Audited emergency bypass sessions with mandatory justification, real-time SOC alerting, and post-session compliance reviews.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Session ID</th>
                  <th className="p-3">Activator</th>
                  <th className="p-3">Justification Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Post-Review</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {breakGlassSessions.map((bg) => (
                  <tr key={bg.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-rose-400">
                      {bg.sessionIdentifier}
                    </td>
                    <td className="p-3 text-slate-200">
                      <div>{bg.activatorEmail || bg.activatedBy}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{new Date(bg.activatedAt).toLocaleString()}</div>
                    </td>
                    <td className="p-3 text-slate-300 max-w-sm truncate">
                      {bg.reason}
                    </td>
                    <td className="p-3">
                      {bg.isActive && new Date(bg.expiresAt) > new Date() ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                          ACTIVE EMERGENCY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-700 text-zinc-400">
                          CLOSED
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {bg.postReviewCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          REVIEWED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PENDING REVIEW
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {bg.isActive && (
                          <button
                            onClick={() => handleCloseBreakGlass(bg.id)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                          >
                            Close
                          </button>
                        )}
                        {!bg.postReviewCompleted && (
                          <button
                            onClick={() => {
                              setSelectedSessionId(bg.id);
                              setShowReviewModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold"
                          >
                            Submit Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NEW POLICY */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Create Security Policy
              </h2>
              <button onClick={() => setShowPolicyModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Policy Name</label>
                <input
                  type="text"
                  placeholder="e.g. 4K Screening Zero-Trust DRM Gate"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Policy Type</label>
                  <select
                    value={newPolicyType}
                    onChange={(e) => setNewPolicyType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ACCESS_CONTROL">Access Control</option>
                    <option value="PLAYBACK_AUTHORIZATION">Playback Authorization</option>
                    <option value="DRM_LICENSE">DRM License</option>
                    <option value="EVIDENCE_ACCESS">Evidence Access</option>
                    <option value="INVESTIGATION_CASE">Investigation Case</option>
                    <option value="THREAT_INTEL">Threat Intel</option>
                    <option value="ADMIN_OPERATIONS">Admin Operations</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Priority Index (1–100)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newPolicyPriority}
                    onChange={(e) => setNewPolicyPriority(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Rules JSON Specification</label>
                <textarea
                  rows={6}
                  value={newPolicyRules}
                  onChange={(e) => setNewPolicyRules(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ROLLBACK POLICY */}
      {showRollbackModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" /> Rollback Policy Version
              </h2>
              <button onClick={() => setShowRollbackModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRollbackSubmit} className="space-y-4">
              <div className="text-xs text-slate-300">
                Current: <strong>{selectedPolicy.name}</strong> (v{selectedPolicy.version})
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Target Version Snapshot</label>
                <select
                  value={rollbackVersion}
                  onChange={(e) => setRollbackVersion(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {selectedPolicy.versions?.map((v) => (
                    <option key={v.id} value={v.version}>
                      v{v.version} — {v.changeReason || "Version snapshot"} ({new Date(v.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Rollback Justification</label>
                <textarea
                  rows={3}
                  placeholder="Explain reason for restoring prior policy snapshot..."
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRollbackModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Execute Rollback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: START BREAK-GLASS */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" /> Start Break-Glass Emergency Session
              </h2>
              <button onClick={() => setShowBreakGlassModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartBreakGlass} className="space-y-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-200">
                Break-Glass access grants elevated emergency authorization. This action emits an immediate CRITICAL SOC alert and requires mandatory post-session audit review.
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Mandatory Emergency Reason</label>
                <textarea
                  rows={4}
                  placeholder="Comprehensive technical explanation of emergency condition requiring break-glass bypass..."
                  value={bgReason}
                  onChange={(e) => setBgReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Duration (Minutes, max 120)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={bgDuration}
                  onChange={(e) => setBgDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30"
                >
                  Activate Emergency Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POST-INCIDENT REVIEW */}
      {showReviewModal && selectedSessionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Submit Post-Incident Compliance Review
              </h2>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewBreakGlass} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Compliance Auditor Notes</label>
                <textarea
                  rows={4}
                  placeholder="Record formal post-session compliance audit notes confirming authorized actions taken during emergency..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseGovernanceDashboard;
