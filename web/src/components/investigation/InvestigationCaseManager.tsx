"use client";

import React, { useState, useEffect } from "react";
import {
  InvestigationCaseItem,
  EvidenceRecordItem,
  fetchInvestigationCases,
  fetchInvestigationCaseById,
  createInvestigationCase,
  updateCaseStatus,
  addCaseNote,
  linkEvidenceToCase,
  fetchEvidenceList,
  verifyInvestigationIntegrity,
  triggerAutomatedEvidencePackage,
  requestCaseContainment,
  resolveInvestigationCase,
  closeInvestigationCase,
} from "../../lib/api";
import {
  ShieldAlert,
  Fingerprint,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  RefreshCw,
  Film,
  Building2,
  Lock,
  Plus,
  Send,
  Eye,
  Zap,
  ArrowRight,
  Database,
  FileCheck,
  Sparkles,
  Layers,
  FileText,
} from "lucide-react";

export default function InvestigationCaseManager() {
  const [cases, setCases] = useState<InvestigationCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Case detail
  const [selectedCase, setSelectedCase] = useState<InvestigationCaseItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals & forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkEvidenceModal, setShowLinkEvidenceModal] = useState(false);
  const [availableEvidence, setAvailableEvidence] = useState<EvidenceRecordItem[]>([]);

  // Create Case Form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSeverity, setNewSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [newThreatClass, setNewThreatClass] = useState("PLAYBACK_PIRACY_ACTIVITY");

  // Note form
  const [noteContent, setNoteContent] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(true);

  // Link Evidence form
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [evidenceRelevance, setEvidenceRelevance] = useState("");

  // Status transition
  const [statusReason, setStatusReason] = useState("");
  const [transitioningStatus, setTransitioningStatus] = useState(false);

  // Automated Evidence & Integrity Verification state
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    isIntegrityValid: boolean;
    totalEvidenceCount: number;
    verifiedCount: number;
    tamperedCount: number;
    verifiedAt: string;
    details: Array<{ evidenceNumber: string; status: string; isValid: boolean }>;
  } | null>(null);
  const [generatingPackage, setGeneratingPackage] = useState(false);

  useEffect(() => {
    loadCases();
  }, [filterStatus]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== "ALL") params.status = filterStatus;
      const data = await fetchInvestigationCases(params);
      const validArray: InvestigationCaseItem[] = Array.isArray(data)
        ? data
        : ((data as any)?.data && Array.isArray((data as any).data)
          ? (data as any).data
          : (data as any)?.cases && Array.isArray((data as any).cases)
            ? (data as any).cases
            : []);
      setCases(validArray);
    } catch (err) {
      console.error("Failed to load cases:", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = async (caseItem: InvestigationCaseItem) => {
    setLoadingDetail(true);
    setIntegrityResult(null);
    try {
      const detailed = await fetchInvestigationCaseById(caseItem.id);
      setSelectedCase(detailed);
    } catch (_) {
      setSelectedCase(caseItem);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await createInvestigationCase({
        title: newTitle,
        description: newDescription,
        severity: newSeverity,
        threatClassification: newThreatClass,
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      await loadCases();
      handleSelectCase(created);
    } catch (err: any) {
      alert(`Failed to create case: ${err.message}`);
    }
  };

  const handleStatusTransition = async (nextStatus: string) => {
    if (!selectedCase) return;
    setTransitioningStatus(true);
    try {
      await updateCaseStatus(
        selectedCase.id,
        nextStatus,
        statusReason || `Status transitioned to ${nextStatus}`
      );
      setStatusReason("");
      await loadCases();
      const detailed = await fetchInvestigationCaseById(selectedCase.id);
      setSelectedCase(detailed);
    } catch (err: any) {
      alert(`Status transition failed: ${err.message}`);
    } finally {
      setTransitioningStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !noteContent.trim()) return;
    try {
      await addCaseNote(selectedCase.id, noteContent, isInternalNote);
      setNoteContent("");
      const detailed = await fetchInvestigationCaseById(selectedCase.id);
      setSelectedCase(detailed);
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    }
  };

  const handleOpenLinkEvidence = async () => {
    setShowLinkEvidenceModal(true);
    try {
      const list = await fetchEvidenceList();
      setAvailableEvidence(list || []);
    } catch (err) {
      console.error("Failed to load evidence for linking:", err);
    }
  };

  const handleLinkEvidence = async () => {
    if (!selectedCase || !selectedEvidenceId) return;
    try {
      await linkEvidenceToCase(selectedCase.id, selectedEvidenceId, evidenceRelevance);
      setShowLinkEvidenceModal(false);
      setSelectedEvidenceId("");
      setEvidenceRelevance("");
      const detailed = await fetchInvestigationCaseById(selectedCase.id);
      setSelectedCase(detailed);
    } catch (err: any) {
      alert(`Failed to link evidence: ${err.message}`);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!selectedCase) return;
    setVerifyingIntegrity(true);
    try {
      const result = await verifyInvestigationIntegrity(selectedCase.id);
      setIntegrityResult(result);
    } catch (err: any) {
      alert(`Integrity verification failed: ${err.message}`);
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  const handleGenerateAutomatedPackage = async () => {
    if (!selectedCase) return;
    setGeneratingPackage(true);
    try {
      await triggerAutomatedEvidencePackage(selectedCase.id, {
        signalType: "SCREEN_CAPTURE_SIGNAL",
        riskScore: 80,
        severity: "HIGH",
      });
      const detailed = await fetchInvestigationCaseById(selectedCase.id);
      setSelectedCase(detailed);
      await loadCases();
    } catch (err: any) {
      alert(`Failed to generate automated evidence package: ${err.message}`);
    } finally {
      setGeneratingPackage(false);
    }
  };

  const safeCases: InvestigationCaseItem[] = Array.isArray(cases) ? cases : [];

  const filteredCases = safeCases.filter((c) => {
    if (!c) return false;
    if (!searchQuery) return true;
    const q = (searchQuery || "").toLowerCase();
    return (
      (c.caseNumber && c.caseNumber.toLowerCase().includes(q)) ||
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.threatClassification && c.threatClassification.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Search cases by Case#, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 flex-1 max-w-sm"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="TRIAGED">TRIAGED</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="CONTAINED">CONTAINED</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Investigation Case</span>
          </button>
        </div>
      </div>

      {/* Grid: Cases list + Case Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Case List */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              <p className="text-xs">Loading investigation cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              <p className="text-sm font-semibold text-slate-300">No active cases found.</p>
              <p className="text-xs mt-1">Open a new case or trigger automated mobile event correlation.</p>
            </div>
          ) : (
            filteredCases.map((item) => {
              const isSelected = selectedCase?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectCase(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-950/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {item.caseNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        item.status === "CLOSED" || item.status === "RESOLVED"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : item.status === "CONTAINED"
                          ? "bg-blue-950 text-blue-300 border border-blue-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span
                      className={`font-bold ${
                        item.severity === "CRITICAL"
                          ? "text-red-400"
                          : item.severity === "HIGH"
                          ? "text-orange-400"
                          : "text-blue-400"
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      {item._count ? `${item._count.evidenceLinks} evidence items` : ""}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Case Detail & Actions */}
        <div className="lg:col-span-2">
          {selectedCase ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      {selectedCase.caseNumber}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-white border border-slate-700">
                      {selectedCase.status}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        selectedCase.severity === "CRITICAL"
                          ? "text-red-400 bg-red-950 border border-red-800"
                          : selectedCase.severity === "HIGH"
                          ? "text-orange-400 bg-orange-950 border border-orange-800"
                          : "text-blue-400 bg-blue-950 border border-blue-800"
                      }`}
                    >
                      {selectedCase.severity}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">{selectedCase.title}</h2>
                  {selectedCase.description && (
                    <p className="text-xs text-slate-400 mt-1">{selectedCase.description}</p>
                  )}
                </div>

                {/* Status Transition Selector */}
                <div className="space-y-1.5 flex-shrink-0">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Advance Lifecycle Status
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedCase.status}
                      onChange={(e) => handleStatusTransition(e.target.value)}
                      disabled={transitioningStatus}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="TRIAGED">TRIAGED</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="CONTAINED">CONTAINED</option>
                      <option value="ESCALATED">ESCALATED</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AUTOMATED EVIDENCE & TELEMETRY SECTION (PHASE 26) */}
              <div className="bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Automated Evidence & Forensic Telemetry
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleVerifyIntegrity}
                      disabled={verifyingIntegrity}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/40 flex items-center gap-1.5 transition"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>{verifyingIntegrity ? "Verifying..." : "Verify SHA-256 Integrity"}</span>
                    </button>
                    <button
                      onClick={handleGenerateAutomatedPackage}
                      disabled={generatingPackage}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Capture Package</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">BOUND SCREENING SESSION</span>
                    <span className="text-indigo-300 font-bold truncate block">
                      {selectedCase.playbackSessionId || "ACTIVE CHECKPOINT"}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">EVIDENCE VAULT ITEMS</span>
                    <span className="text-white font-bold block">
                      {selectedCase.evidenceLinks?.length ?? 0} Recorded Packages
                    </span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">INTEGRITY STATUS</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>SHA-256 DETERMINISTIC</span>
                    </span>
                  </div>
                </div>

                {/* Integrity Verification Result Banner */}
                {integrityResult && (
                  <div className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                    integrityResult.isIntegrityValid
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>Verification Result: {integrityResult.isIntegrityValid ? "100% VALID" : "TAMPER DETECTED"}</span>
                      <span className="text-[10px]">{integrityResult.verifiedCount}/{integrityResult.totalEvidenceCount} verified</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Cryptographic SHA-256 checksums verified against original Evidence Vault records.
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Evidence Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Linked Forensic Evidence ({selectedCase.evidenceLinks?.length ?? 0})
                  </h3>
                  <button
                    onClick={handleOpenLinkEvidence}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Evidence Record</span>
                  </button>
                </div>

                {selectedCase.evidenceLinks && selectedCase.evidenceLinks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCase.evidenceLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1 font-mono text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-indigo-400">
                            {link.evidenceRecord.evidenceNumber}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800/50">
                            {link.evidenceRecord.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate font-sans">{link.evidenceRecord.title}</p>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Classification: {link.evidenceRecord.classification}</span>
                          <span>SHA-256: {link.evidenceRecord.integrityHash ? link.evidenceRecord.integrityHash.slice(0, 10) + "..." : "VALID"}</span>
                        </div>
                        {link.relevance && (
                          <p className="text-[11px] text-slate-400 italic font-sans mt-1">"{link.relevance}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No forensic evidence linked to this case yet.</p>
                )}
              </div>

              {/* Timeline & Status History */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Case Activity Timeline & Correlation Trace
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                  {selectedCase.timelineEvents?.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs flex justify-between items-start gap-3"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-indigo-400 text-[11px] block">{evt.title}</span>
                        <p className="text-slate-300 text-xs font-mono">{evt.description}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyst Notes Section */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Analyst Notes ({selectedCase.notes?.length ?? 0})
                </h3>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {selectedCase.notes?.map((note) => (
                    <div key={note.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="font-bold text-indigo-300">{note.author?.name || "Analyst"}</span>
                        <span className="text-[10px] font-mono">{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-200">{note.content}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="space-y-2 pt-2">
                  <textarea
                    rows={2}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add an investigation note or forensic hypothesis..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>Internal SOC Note</span>
                    </label>
                    <button
                      type="submit"
                      disabled={!noteContent.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition"
                    >
                      Post Note
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500">
              <ShieldAlert className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Select an investigation case</p>
              <p className="text-xs max-w-sm mt-1">
                View automated forensic evidence packages, session watermarks, and cryptographic integrity traces.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Case */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Anti-Piracy Investigation Case</h3>
            <form onSubmit={handleCreateCase} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Case Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Unidentified Camera Capture - Auditorium 4"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description / Context
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe observed piracy signal or watermark match..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Classification
                  </label>
                  <select
                    value={newThreatClass}
                    onChange={(e) => setNewThreatClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="PLAYBACK_PIRACY_ACTIVITY">Playback Piracy</option>
                    <option value="WATERMARK_LEAK_CONFIRMED">Watermark Leak</option>
                    <option value="OPTICAL_CAMCORD_PIRACY">Optical Camcord</option>
                    <option value="DRM_INTEGRITY_BREACH">DRM Breach</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/30"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Evidence */}
      {showLinkEvidenceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Link Evidence Vault Record</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Select Evidence Record
                </label>
                <select
                  value={selectedEvidenceId}
                  onChange={(e) => setSelectedEvidenceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose from Vault --</option>
                  {availableEvidence.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.evidenceNumber} - {ev.title} ({ev.classification})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Relevance / Correlation Reason
                </label>
                <input
                  type="text"
                  value={evidenceRelevance}
                  onChange={(e) => setEvidenceRelevance(e.target.value)}
                  placeholder="e.g. Matches watermark pattern on leaked clip"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkEvidenceModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedEvidenceId}
                  onClick={handleLinkEvidence}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  Link Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
