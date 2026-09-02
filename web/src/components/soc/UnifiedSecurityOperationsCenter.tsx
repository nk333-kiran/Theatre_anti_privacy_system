"use client";

import React, { useEffect, useState } from "react";
import {
  fetchSocSummary,
  fetchSocIncidents,
  fetchSocWorkflows,
  fetchSocWorkflowExecutions,
  transitionSocIncidentStatus,
  escalateSocIncident,
  assignSocAnalyst,
  fetchSocIncidentTimeline,
  SocSummary,
  SocIncident,
  SocWorkflow,
  createSocIncident,
  createSocWorkflow,
} from "@/lib/api";
import { SOCMetricsDashboard } from "./SOCMetricsDashboard";

const LIFECYCLE_STAGES = [
  "DETECTED",
  "TRIAGED",
  "INVESTIGATING",
  "CONTAINMENT_PENDING",
  "CONTAINED",
  "MONITORING",
  "RESOLVED",
  "CLOSED",
];

export const UnifiedSecurityOperationsCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"operations" | "incidents" | "workflows" | "metrics">("operations");
  const [summary, setSummary] = useState<SocSummary | null>(null);
  const [incidents, setIncidents] = useState<SocIncident[]>([]);
  const [workflows, setWorkflows] = useState<SocWorkflow[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [selectedIncident, setSelectedIncident] = useState<SocIncident | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);

  // Form states
  const [assignAnalystId, setAssignAnalystId] = useState("");
  const [assignAnalystEmail, setAssignAnalystEmail] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateRiskScore, setEscalateRiskScore] = useState(85);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [newRisk, setNewRisk] = useState(75);

  const [newWfName, setNewWfName] = useState("");
  const [newWfDesc, setNewWfDesc] = useState("");
  const [newWfTrigger, setNewWfTrigger] = useState("THREAT_RISK_THRESHOLD");
  const [newWfAction, setNewWfAction] = useState("NOTIFY_SOC");

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadAllData() {
    try {
      const [sumRes, incRes, wfRes, execRes] = await Promise.all([
        fetchSocSummary(),
        fetchSocIncidents(),
        fetchSocWorkflows(),
        fetchSocWorkflowExecutions(),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (incRes.success) setIncidents(incRes.data);
      if (wfRes.success) setWorkflows(wfRes.data);
      if (execRes.success) setExecutions(execRes.data);
    } catch (err) {
      console.error("Failed to load SOC data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusTransition(incidentId: string, newStatus: string) {
    try {
      const res = await transitionSocIncidentStatus(incidentId, newStatus);
      if (res.success) {
        await loadAllData();
        if (selectedIncident && selectedIncident.id === incidentId) {
          setSelectedIncident(res.data);
        }
      }
    } catch (err) {
      alert("Failed to transition status: " + err);
    }
  }

  async function handleAssignSubmit() {
    if (!selectedIncident || !assignAnalystId) return;
    try {
      const res = await assignSocAnalyst(selectedIncident.id, assignAnalystId, assignAnalystEmail);
      if (res.success) {
        setShowAssignModal(false);
        setAssignAnalystId("");
        setAssignAnalystEmail("");
        await loadAllData();
      }
    } catch (err) {
      alert("Failed to assign analyst: " + err);
    }
  }

  async function handleEscalateSubmit() {
    if (!selectedIncident || !escalateReason) return;
    try {
      const res = await escalateSocIncident(selectedIncident.id, {
        reason: escalateReason,
        riskScore: Number(escalateRiskScore),
      });
      if (res.success) {
        setShowEscalateModal(false);
        setEscalateReason("");
        await loadAllData();
      }
    } catch (err) {
      alert("Failed to escalate incident: " + err);
    }
  }

  async function handleViewTimeline(incident: SocIncident) {
    setSelectedIncident(incident);
    try {
      const res = await fetchSocIncidentTimeline(incident.id);
      if (res.success) {
        setTimeline(res.data);
        setShowTimelineModal(true);
      }
    } catch (err) {
      alert("Failed to fetch timeline: " + err);
    }
  }

  async function handleCreateIncident() {
    if (!newTitle) return;
    try {
      const res = await createSocIncident({
        title: newTitle,
        description: newDesc,
        severity: newSeverity,
        riskScore: Number(newRisk),
      });
      if (res.success) {
        setShowNewIncidentModal(false);
        setNewTitle("");
        setNewDesc("");
        await loadAllData();
      }
    } catch (err) {
      alert("Failed to create incident: " + err);
    }
  }

  async function handleCreateWorkflow() {
    if (!newWfName) return;
    try {
      const res = await createSocWorkflow({
        name: newWfName,
        description: newWfDesc,
        triggerType: newWfTrigger,
        triggerCondition: { minRiskScore: 75 },
        actionType: newWfAction,
      });
      if (res.success) {
        setShowNewWorkflowModal(false);
        setNewWfName("");
        setNewWfDesc("");
        await loadAllData();
      }
    } catch (err) {
      alert("Failed to create workflow: " + err);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to Unified Security Operations Center (SOC)...</span>
        </div>
      </div>
    );
  }

  const postureColors = {
    OPTIMAL: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    GUARDED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    ELEVATED: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    CRITICAL: "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse",
  };

  const currentPosture = summary?.overallPosture || "OPTIMAL";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Global Header & Unified Posture Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Unified Security Operations Center (SOC)
              </h1>
              <span className={`px-3 py-1 text-xs font-black uppercase rounded-full border ${postureColors[currentPosture]}`}>
                {currentPosture} POSTURE
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Enterprise threat monitoring, real-time threat intelligence correlation, and policy-driven incident response automation.
            </p>
          </div>

          {/* Threat Risk Score Gauge */}
          <div className="flex items-center gap-5 bg-slate-950/80 border border-slate-800 rounded-xl px-5 py-3 shadow-inner">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global Threat Risk</div>
              <div className="text-xs text-slate-500">Autonomous Deterministic 0–100</div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black ${
                (summary?.globalThreatRiskScore ?? 0) >= 80
                  ? "text-rose-400"
                  : (summary?.globalThreatRiskScore ?? 0) >= 60
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}>
                {summary?.globalThreatRiskScore ?? 0}
              </span>
              <span className="text-xs text-slate-500 font-bold">/100</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "operations"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Unified Threat Operations
          </button>
          <button
            onClick={() => setActiveTab("incidents")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "incidents"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Incident Lifecycle Manager ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "workflows"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Security Automation Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "metrics"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Performance Metrics & KPIs
          </button>
        </div>
      </div>

      {/* 2. Explainable Automated Recommendations */}
      {summary && summary.recommendations.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span>⚡</span> Explainable Automated Advisory Recommendations ({summary.recommendations.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Advisory-First Guarantee • Approval Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.recommendations.map((rec) => (
              <div key={rec.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">{rec.category}</span>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {rec.requiredApproval}
                  </span>
                </div>
                <div className="text-xs text-slate-200"><span className="font-bold text-amber-400">WHY:</span> {rec.why}</div>
                <div className="text-xs text-slate-400"><span className="font-bold text-cyan-400">EVIDENCE:</span> {rec.evidence}</div>
                <div className="text-xs text-slate-400"><span className="font-bold text-rose-400">RISK:</span> {rec.risk}</div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">
                  <span className="font-bold">RECOMMENDED ACTION:</span> {rec.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: OPERATIONS SUMMARY */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Break-Glass Indicator */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span>🚨</span> Active Break-Glass
                </h3>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  (summary?.activeBreakGlassSessions?.length ?? 0) > 0
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {summary?.activeBreakGlassSessions?.length ?? 0} ACTIVE
                </span>
              </div>
              {(summary?.activeBreakGlassSessions?.length ?? 0) === 0 ? (
                <div className="text-xs text-slate-500 py-2">No emergency sessions active.</div>
              ) : (
                <div className="space-y-2">
                  {summary?.activeBreakGlassSessions?.map((bg) => (
                    <div key={bg.id} className="p-2.5 bg-slate-950/80 border border-rose-900/40 rounded-lg text-xs">
                      <div className="font-bold text-rose-400">{bg.sessionIdentifier}</div>
                      <div className="text-slate-300 text-[11px] truncate">{bg.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privileged Operations Queue */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span>🔐</span> Privileged Actions
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {summary?.pendingPrivilegedApprovals?.length ?? 0} PENDING
                </span>
              </div>
              {(summary?.pendingPrivilegedApprovals?.length ?? 0) === 0 ? (
                <div className="text-xs text-slate-500 py-2">All two-person approvals clear.</div>
              ) : (
                <div className="space-y-2">
                  {summary?.pendingPrivilegedApprovals?.map((pa) => (
                    <div key={pa.id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                      <div className="font-bold text-cyan-400">{pa.actionType}</div>
                      <div className="text-slate-400 text-[11px] truncate">{pa.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* External IOC Matches */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span>🌐</span> IOC Correlations
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {summary?.recentIocMatches?.length ?? 0} MATCHES
                </span>
              </div>
              {(summary?.recentIocMatches?.length ?? 0) === 0 ? (
                <div className="text-xs text-slate-500 py-2">No darkweb IOC hits in current stream.</div>
              ) : (
                <div className="space-y-2">
                  {summary?.recentIocMatches?.map((m) => (
                    <div key={m.id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                      <div className="font-bold text-purple-400">{m.indicator?.value || "IOC Indicator"}</div>
                      <div className="text-slate-400 text-[11px]">Confidence: {m.confidence}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Active Incidents Ledger */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔥</span> Critical & High Threat Incidents
              </h2>
              <button
                onClick={() => setActiveTab("incidents")}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                View Complete Lifecycle Ledger &rarr;
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No active incidents. Threat baseline optimal.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Incident Number</th>
                      <th className="p-3">Title & Source</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Risk</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assigned</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {incidents.slice(0, 5).map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-cyan-400">{inc.incidentNumber}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-200">{inc.title}</div>
                          <div className="text-slate-500 text-[10px]">{inc.source} • {inc.theatre?.name || "Global"}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            inc.severity === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : inc.severity === "HIGH"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-300">{inc.riskScore}/100</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {inc.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">
                          {inc.assignedTo?.name || "Unassigned"}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleViewTimeline(inc)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                          >
                            Timeline
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENTS LIFECYCLE */}
      {activeTab === "incidents" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Unified Incident Lifecycle & Response
            </h2>
            <button
              onClick={() => setShowNewIncidentModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg transition-colors"
            >
              + Create Security Incident
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {incidents.map((inc) => (
              <div key={inc.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-cyan-400">{inc.incidentNumber}</span>
                      <h3 className="text-base font-bold text-white">{inc.title}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-black rounded ${
                        inc.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : inc.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {inc.severity}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {inc.description || "No description provided."} • Venue: {inc.theatre?.name || "Global Stream"} • Risk: {inc.riskScore}/100
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setShowAssignModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                    >
                      Assign ({inc.assignedTo?.name || "None"})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setShowEscalateModal(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/40 transition-colors"
                    >
                      Escalate
                    </button>
                    <button
                      onClick={() => handleViewTimeline(inc)}
                      className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/40 transition-colors"
                    >
                      Timeline
                    </button>
                  </div>
                </div>

                {/* State Machine Lifecycle Stepper */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    Lifecycle State Progression
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {LIFECYCLE_STAGES.map((stage) => {
                      const isCurrent = inc.status === stage;
                      return (
                        <button
                          key={stage}
                          onClick={() => handleStatusTransition(inc.id, stage)}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                            isCurrent
                              ? "bg-cyan-500 text-slate-950 shadow-md ring-2 ring-cyan-400"
                              : "bg-slate-950/70 hover:bg-slate-800 text-slate-400 border border-slate-800"
                          }`}
                        >
                          {stage}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WORKFLOW ENGINE */}
      {activeTab === "workflows" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚙️</span> Security Automation Workflows & Rule Registry
            </h2>
            <button
              onClick={() => setShowNewWorkflowModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg transition-colors"
            >
              + Create Workflow Rule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => (
              <div key={wf.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{wf.name}</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PRIORITY {wf.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{wf.description || "No description."}</p>
                <div className="p-3 bg-slate-950/80 rounded-lg font-mono text-[11px] space-y-1 text-slate-300">
                  <div><span className="text-amber-400">TRIGGER:</span> {wf.triggerType}</div>
                  <div><span className="text-cyan-400">ACTION:</span> {wf.actionType}</div>
                  <div className="text-slate-500 truncate">COND: {wf.triggerCondition}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Execution History */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📜</span> Automation Execution History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Rule Name</th>
                    <th className="p-3">Trigger Event</th>
                    <th className="p-3">Decision</th>
                    <th className="p-3">Action Taken</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Correlation ID</th>
                    <th className="p-3">Executed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {executions.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-200">{ex.workflow?.name || "Workflow"}</td>
                      <td className="p-3 font-mono text-[11px] text-amber-400">{ex.triggerEvent}</td>
                      <td className="p-3 font-bold text-slate-300">{ex.decision}</td>
                      <td className="p-3 text-cyan-400">{ex.actionTaken}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          ex.status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        }`}>
                          {ex.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">{ex.correlationId}</td>
                      <td className="p-3 text-slate-400">{new Date(ex.executedAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: METRICS DASHBOARD */}
      {activeTab === "metrics" && <SOCMetricsDashboard />}

      {/* TIMELINE MODAL */}
      {showTimelineModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Incident Timeline: {selectedIncident.incidentNumber}
                </h3>
                <p className="text-xs text-slate-400">{selectedIncident.title}</p>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {timeline.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400">{item.eventType}</span>
                    <span className="text-slate-500 text-[10px]">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300">{item.description}</div>
                  {item.actorEmail && (
                    <div className="text-[10px] text-slate-500">Actor: {item.actorEmail}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowTimelineModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN ANALYST MODAL */}
      {showAssignModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Assign Security Analyst</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Analyst User ID</label>
                <input
                  type="text"
                  value={assignAnalystId}
                  onChange={(e) => setAssignAnalystId(e.target.value)}
                  placeholder="e.g. user-uuid-or-id"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Analyst Email</label>
                <input
                  type="email"
                  value={assignAnalystEmail}
                  onChange={(e) => setAssignAnalystEmail(e.target.value)}
                  placeholder="analyst@theatre.com"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATE MODAL */}
      {showEscalateModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-rose-400">Escalate Incident Severity</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Escalation Reason</label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="State justification for severity escalation..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white h-20"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Risk Score (0–100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={escalateRiskScore}
                  onChange={(e) => setEscalateRiskScore(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalateSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW INCIDENT MODAL */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Security Incident</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Tampered QR scan stream anomaly"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detailed telemetry observations..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Risk Score (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRisk}
                    onChange={(e) => setNewRisk(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIncident}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Create Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW WORKFLOW MODAL */}
      {showNewWorkflowModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Security Automation Rule</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Workflow Name</label>
                <input
                  type="text"
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  placeholder="e.g. Critical Threat SOC Dispatcher"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newWfDesc}
                  onChange={(e) => setNewWfDesc(e.target.value)}
                  placeholder="Automated dispatch policy..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Trigger Type</label>
                <select
                  value={newWfTrigger}
                  onChange={(e) => setNewWfTrigger(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="THREAT_RISK_THRESHOLD">THREAT_RISK_THRESHOLD</option>
                  <option value="REPEAT_IOC_CORRELATION">REPEAT_IOC_CORRELATION</option>
                  <option value="EVIDENCE_TAMPERING">EVIDENCE_TAMPERING</option>
                  <option value="COORDINATED_ATTACK">COORDINATED_ATTACK</option>
                  <option value="BREAK_GLASS_ACTIVE">BREAK_GLASS_ACTIVE</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Action Type</label>
                <select
                  value={newWfAction}
                  onChange={(e) => setNewWfAction(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="NOTIFY_SOC">NOTIFY_SOC</option>
                  <option value="CREATE_CRITICAL_ALERT">CREATE_CRITICAL_ALERT</option>
                  <option value="CREATE_INVESTIGATION">CREATE_INVESTIGATION</option>
                  <option value="ESCALATE_INCIDENT">ESCALATE_INCIDENT</option>
                  <option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL (Two-Person Queue)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewWorkflowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Save Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
