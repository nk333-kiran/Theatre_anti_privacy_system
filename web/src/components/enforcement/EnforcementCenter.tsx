"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  Send,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Hash,
  Fingerprint,
  Building2,
  Film,
  ExternalLink,
  Lock,
  ChevronRight,
  Gavel,
  Scale,
  Ban,
  FileText,
  UserCheck,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import {
  EnforcementActionItem,
  EnforcementPackageData,
  EnforcementStatus,
  EnforcementActionType,
  fetchEnforcementActions,
  createEnforcementAction,
  fetchEnforcementActionById,
  submitEnforcementForReview,
  approveEnforcementAction,
  rejectEnforcementAction,
  submitEnforcementAction,
  completeEnforcementAction,
  cancelEnforcementAction,
  verifyEnforcementPackage,
  UserProfile,
} from "../../lib/api";

interface EnforcementCenterProps {
  user?: UserProfile | null;
  onRefreshGlobal?: () => void;
  onNavigateToCase?: (caseId: string) => void;
}

const LIFECYCLE_STEPS: EnforcementStatus[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SUBMITTED",
  "COMPLETED",
];

export const EnforcementCenter: React.FC<EnforcementCenterProps> = ({
  user,
  onRefreshGlobal,
  onNavigateToCase,
}) => {
  const [enforcements, setEnforcements] = useState<EnforcementActionItem[]>([]);
  const [selectedEnforcement, setSelectedEnforcement] = useState<EnforcementActionItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeModal, setActiveModal] = useState<
    "CREATE" | "PACKAGE" | "APPROVE" | "REJECT" | "SUBMIT" | "COMPLETE" | "CANCEL" | "VERIFY" | null
  >(null);

  // Form states
  const [newCaseId, setNewCaseId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newActionType, setNewActionType] = useState<EnforcementActionType>("TAKEDOWN_NOTICE");
  const [newTargetEntity, setNewTargetEntity] = useState("Global Piracy Cyberlock Intake");
  const [actionNotes, setActionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [subRef, setSubRef] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isAdminOrApprover = user?.role === "ADMIN" || user?.role === "THEATRE_ADMIN" || user?.role === "PRODUCTION_COMPANY";

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchEnforcementActions({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      const validArray: EnforcementActionItem[] = Array.isArray(data)
        ? data
        : ((data as any)?.data && Array.isArray((data as any).data)
          ? (data as any).data
          : []);
      setEnforcements(validArray);
      if (selectedEnforcement) {
        const refreshed = validArray.find((e) => e && e.id === selectedEnforcement.id);
        if (refreshed) setSelectedEnforcement(refreshed);
      }
    } catch (err: any) {
      console.error("Failed to load enforcement actions:", err);
      setEnforcements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseId || !newTitle) {
      showNotification("error", "Case ID and Title are required");
      return;
    }

    setActionLoading(true);
    try {
      const created = await createEnforcementAction({
        caseId: newCaseId,
        title: newTitle,
        description: newDescription,
        actionType: newActionType,
        targetEntity: newTargetEntity,
      });
      showNotification("success", `Enforcement ${created.enforcementNumber} created successfully!`);
      setActiveModal(null);
      setNewCaseId("");
      setNewTitle("");
      setNewDescription("");
      loadData();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to create enforcement action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedEnforcement) return;
    setActionLoading(true);
    try {
      const updated = await submitEnforcementForReview(selectedEnforcement.id, actionNotes);
      setSelectedEnforcement(updated);
      showNotification("success", `Enforcement ${updated.enforcementNumber} submitted for executive review.`);
      setActionNotes("");
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to submit for review");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedEnforcement) return;
    setActionLoading(true);
    try {
      const updated = await approveEnforcementAction(selectedEnforcement.id, actionNotes);
      setSelectedEnforcement(updated);
      showNotification("success", `Enforcement ${updated.enforcementNumber} approved by ${user?.email}!`);
      setActiveModal(null);
      setActionNotes("");
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEnforcement || !rejectionReason) {
      showNotification("error", "Rejection reason is required");
      return;
    }
    setActionLoading(true);
    try {
      const updated = await rejectEnforcementAction(selectedEnforcement.id, rejectionReason, actionNotes);
      setSelectedEnforcement(updated);
      showNotification("success", `Enforcement ${updated.enforcementNumber} marked as REJECTED.`);
      setActiveModal(null);
      setRejectionReason("");
      setActionNotes("");
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitTransmission = async () => {
    if (!selectedEnforcement) return;
    setActionLoading(true);
    try {
      const updated = await submitEnforcementAction(selectedEnforcement.id, subRef || undefined, actionNotes);
      setSelectedEnforcement(updated);
      showNotification("success", `Enforcement package transmitted to ${updated.targetEntity}!`);
      setActiveModal(null);
      setSubRef("");
      setActionNotes("");
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Submission failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedEnforcement) return;
    setActionLoading(true);
    try {
      const updated = await completeEnforcementAction(
        selectedEnforcement.id,
        resolutionSummary || "Enforcement response verified & takedown confirmed"
      );
      setSelectedEnforcement(updated);
      showNotification("success", `Enforcement ${updated.enforcementNumber} marked as COMPLETED.`);
      setActiveModal(null);
      setResolutionSummary("");
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Completion failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedEnforcement) return;
    setActionLoading(true);
    try {
      const updated = await cancelEnforcementAction(
        selectedEnforcement.id,
        rejectionReason || "Cancelled by security officer"
      );
      setSelectedEnforcement(updated);
      showNotification("success", `Enforcement ${updated.enforcementNumber} cancelled.`);
      setActiveModal(null);
      setRejectionReason("");
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyIntegrity = async (enforcementId: string) => {
    setActionLoading(true);
    try {
      const res = await verifyEnforcementPackage(enforcementId);
      setVerificationResult(res);
      setActiveModal("VERIFY");
    } catch (err: any) {
      showNotification("error", "Integrity check failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const safeEnforcements: EnforcementActionItem[] = Array.isArray(enforcements) ? enforcements : [];

  const filteredEnforcements = safeEnforcements.filter((e) => {
    if (!e) return false;
    const term = (searchTerm || "").toLowerCase();
    return (
      (e.enforcementNumber && e.enforcementNumber.toLowerCase().includes(term)) ||
      (e.caseNumber && e.caseNumber.toLowerCase().includes(term)) ||
      (e.title && e.title.toLowerCase().includes(term)) ||
      (e.movieTitle && e.movieTitle.toLowerCase().includes(term)) ||
      (e.theatreCode && e.theatreCode.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status: EnforcementStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "REVIEW":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse";
      case "APPROVED":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "SUBMITTED":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      case "COMPLETED":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "REJECTED":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "CANCELLED":
        return "bg-slate-700/40 text-slate-400 border-slate-700";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/40 text-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Piracy Response & Enforcement Center
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Phase 27
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Evidence-backed takedown notices, forensic referrals, and human-in-the-loop legal response orchestration.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
            <button
              onClick={() => setActiveModal("CREATE")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all border border-indigo-400/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Enforcement Action</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <div className="text-[11px] text-slate-400 font-medium">Active Enforcements</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">
              {safeEnforcements.filter((e) => e && !["COMPLETED", "CANCELLED"].includes(e.status)).length}
            </div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending Review
            </div>
            <div className="text-lg font-bold text-amber-300 mt-0.5">
              {safeEnforcements.filter((e) => e && e.status === "REVIEW").length}
            </div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <div className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Approved & Ready
            </div>
            <div className="text-lg font-bold text-cyan-300 mt-0.5">
              {safeEnforcements.filter((e) => e && e.status === "APPROVED").length}
            </div>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Completed
            </div>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">
              {safeEnforcements.filter((e) => e && e.status === "COMPLETED").length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Enforcement Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            {/* Search & Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search enforcement, case #, movie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredEnforcements.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No enforcement actions found matching your criteria.
                </div>
              ) : (
                filteredEnforcements.map((item) => {
                  const isSelected = selectedEnforcement?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedEnforcement(item)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50"
                          : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {item.enforcementNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                        {item.title}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span className="flex items-center gap-1 font-mono">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {item.caseNumber}
                        </span>
                        <span>{item.actionType.replace(/_/g, " ")}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-800/60">
                        <span>{item.theatreCode || "ALL VENUES"}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Enforcement Detail (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedEnforcement ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Top Banner & Status Tracker */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-indigo-400">
                      {selectedEnforcement.enforcementNumber}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                        selectedEnforcement.status
                      )}`}
                    >
                      {selectedEnforcement.status}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-100 mt-1">
                    {selectedEnforcement.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyIntegrity(selectedEnforcement.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Verify SHA-256</span>
                  </button>
                  <button
                    onClick={() => setActiveModal("PACKAGE")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>View Package</span>
                  </button>
                </div>
              </div>

              {/* Lifecycle Progress Stepper */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Enforcement Lifecycle Workflow
                </div>
                <div className="grid grid-cols-5 gap-1 relative">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const currentIndex = LIFECYCLE_STEPS.indexOf(selectedEnforcement.status);
                    const isPassed = currentIndex >= idx && !["REJECTED", "CANCELLED"].includes(selectedEnforcement.status);
                    const isCurrent = selectedEnforcement.status === step;
                    return (
                      <div key={step} className="flex flex-col items-center text-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCurrent
                              ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                              : isPassed
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {isPassed && !isCurrent ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] font-semibold mt-1.5 ${
                            isCurrent
                              ? "text-indigo-400"
                              : isPassed
                              ? "text-slate-300"
                              : "text-slate-500"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* References & Context Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-medium">Investigation Case Reference</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {selectedEnforcement.caseNumber}
                    </span>
                    {onNavigateToCase && (
                      <button
                        onClick={() => onNavigateToCase(selectedEnforcement.caseId)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>Open Case</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Severity: <span className="font-semibold text-slate-300">{selectedEnforcement.severity}</span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-medium">Target & Jurisdiction</div>
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {selectedEnforcement.targetEntity || "Designated Agency"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Type: <span className="font-mono text-indigo-300">{selectedEnforcement.actionType}</span>
                  </div>
                </div>
              </div>

              {/* Action Workflow Buttons */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Required Workflow Actions
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Zero Automatic Actions &bull; Human Confirmation Required
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedEnforcement.status === "DRAFT" && (
                    <button
                      onClick={handleSubmitForReview}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Review</span>
                    </button>
                  )}

                  {selectedEnforcement.status === "REVIEW" && isAdminOrApprover && (
                    <>
                      <button
                        onClick={() => setActiveModal("APPROVE")}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Enforcement</span>
                      </button>
                      <button
                        onClick={() => setActiveModal("REJECT")}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {selectedEnforcement.status === "APPROVED" && (
                    <button
                      onClick={() => setActiveModal("SUBMIT")}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Enforcement Package</span>
                    </button>
                  )}

                  {selectedEnforcement.status === "SUBMITTED" && (
                    <button
                      onClick={() => setActiveModal("COMPLETE")}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Concluded</span>
                    </button>
                  )}

                  {!["COMPLETED", "CANCELLED"].includes(selectedEnforcement.status) && (
                    <button
                      onClick={() => setActiveModal("CANCEL")}
                      disabled={actionLoading}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold transition"
                    >
                      <span>Cancel Action</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline & Audit Log */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Immutable Audit Trail & Timeline</span>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5 max-h-52 overflow-y-auto">
                  {selectedEnforcement.timeline.map((evt) => (
                    <div key={evt.id} className="text-xs space-y-0.5 border-l-2 border-indigo-500/40 pl-3 py-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-300">{evt.title}</span>
                        <span className="font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{evt.description}</p>
                      <div className="text-[10px] text-indigo-400/80 font-mono">
                        Actor: {evt.actorEmail} ({evt.actorRole})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Gavel className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No Enforcement Action Selected</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an item from the enforcement queue on the left to inspect its evidence package, approval status, and lifecycle actions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Create Enforcement Action */}
      {activeModal === "CREATE" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Initiate Enforcement Response</span>
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Investigation Case ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UUID of active investigation case"
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Enforcement Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DMCA Takedown: Screener Leak on Cyberlock Host"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Enforcement Action Type</label>
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value as EnforcementActionType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="TAKEDOWN_NOTICE">Takedown Notice (DMCA / EU CD)</option>
                  <option value="LEGAL_CEASE_DESIST">Legal Cease & Desist Order</option>
                  <option value="PLATFORM_COPYRIGHT_CLAIM">Platform Copyright Strike</option>
                  <option value="FORENSIC_LAW_ENFORCEMENT_REFERRAL">Forensic Law Enforcement Referral</option>
                  <option value="AUDITORIUM_SEAT_BLACKLIST">Auditorium Seat & Device Blacklist</option>
                  <option value="DISTRIBUTOR_SECURITY_ALERT">Distributor Security Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Entity / Host</label>
                <input
                  type="text"
                  value={newTargetEntity}
                  onChange={(e) => setNewTargetEntity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Description & Incident Rationale</label>
                <textarea
                  rows={3}
                  placeholder="Provide background context for review officers..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  {actionLoading ? "Generating..." : "Generate Package & Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Evidence Package Inspector */}
      {activeModal === "PACKAGE" && selectedEnforcement?.package && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span>Evidence-Backed Enforcement Package</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Package ID: {selectedEnforcement.package.packageId}
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
              {/* Package Hash Verification Banner */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">
                    Canonical SHA-256 Package Integrity Hash
                  </div>
                  <div className="font-mono text-[11px] text-cyan-300 break-all bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20">
                    {selectedEnforcement.package.packageIntegrityHash}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>VERIFIED</span>
                </div>
              </div>

              {/* Watermark Attribution */}
              {selectedEnforcement.package.watermarkAttribution && (
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cryptographic Watermark Attribution</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      Watermark ID: <span className="font-mono text-indigo-300">{selectedEnforcement.package.watermarkAttribution.watermarkId}</span>
                    </div>
                    <div>
                      Confidence Score: <span className="font-bold text-emerald-400">{selectedEnforcement.package.watermarkAttribution.confidenceScore}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Records List */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300">
                  Attached Evidence Items ({selectedEnforcement.package.evidenceRecords.length})
                </div>
                <div className="space-y-1.5">
                  {selectedEnforcement.package.evidenceRecords.map((ev) => (
                    <div key={ev.evidenceId} className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <div className="font-mono font-bold text-slate-200">{ev.evidenceNumber}</div>
                        <div className="text-slate-400">{ev.classification} &bull; {ev.source}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          SHA-256 Valid
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Compliance & Redaction Certification</span>
                </div>
                {selectedEnforcement.package.complianceNotice}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Executive Approval */}
      {activeModal === "APPROVE" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emerald-400 pb-3 border-b border-slate-800">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Confirm Executive Approval</h3>
            </div>
            <p className="text-xs text-slate-400">
              You are approving <span className="text-slate-200 font-semibold">{selectedEnforcement?.enforcementNumber}</span>. This authorizes transmission to legal entities and platform host networks.
            </p>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1">Approval Notes & Rationale</label>
              <textarea
                rows={3}
                placeholder="Cryptographic evidence verified; authorization granted..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
              >
                {actionLoading ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rejection */}
      {activeModal === "REJECT" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400 pb-3 border-b border-slate-800">
              <XCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Reject Enforcement Action</h3>
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1">
                Rejection Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="State the reason for rejecting this enforcement action..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Submit Transmission */}
      {activeModal === "SUBMIT" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-indigo-400 pb-3 border-b border-slate-800">
              <Send className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Dispatch Enforcement Package</h3>
            </div>
            <p className="text-xs text-slate-400">
              Transmit the approved evidence package to <span className="text-slate-200 font-semibold">{selectedEnforcement?.targetEntity}</span>.
            </p>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1">External Intake / Docket Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. DMCA-TKT-98421"
                value={subRef}
                onChange={(e) => setSubRef(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTransmission}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
              >
                {actionLoading ? "Transmitting..." : "Transmit Package"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Complete */}
      {activeModal === "COMPLETE" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emerald-400 pb-3 border-b border-slate-800">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Conclude Enforcement Response</h3>
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1">Resolution Summary</label>
              <textarea
                rows={3}
                placeholder="Host stream taken down; copyright claim honored..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
              >
                {actionLoading ? "Concluding..." : "Complete Enforcement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Integrity Verification Result */}
      {activeModal === "VERIFY" && verificationResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-cyan-400 pb-3 border-b border-slate-800">
              <Fingerprint className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Cryptographic Integrity Report</h3>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Integrity Status:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full border ${
                    verificationResult.isValid
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  {verificationResult.isValid ? "SHA-256 MATCH VERIFIED" : "INTEGRITY MISMATCH"}
                </span>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Calculated Hash:</div>
                <div className="font-mono text-[10px] text-cyan-300 break-all">{verificationResult.calculatedHash}</div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
