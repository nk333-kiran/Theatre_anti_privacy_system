"use client";

import React, { useState, useEffect } from "react";
import {
  EvidenceRecordItem,
  EvidenceChainEventItem,
  fetchEvidenceList,
  fetchEvidenceById,
  fetchEvidenceChain,
  verifyEvidenceIntegrity,
  toggleEvidenceLegalHold,
  exportEvidenceRecord,
} from "../../lib/api";

export default function EvidenceVault() {
  const [evidenceList, setEvidenceList] = useState<EvidenceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Detail states
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecordItem | null>(null);
  const [chainEvents, setChainEvents] = useState<EvidenceChainEventItem[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);
  const [showChainModal, setShowChainModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showLegalHoldModal, setShowLegalHoldModal] = useState(false);

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Action states
  const [holdReason, setHoldReason] = useState("");
  const [exportFormat, setExportFormat] = useState<"JSON" | "CSV" | "REPORT">("REPORT");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadEvidence();
  }, [filterStatus, filterClass]);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== "ALL") params.status = filterStatus;
      if (filterClass !== "ALL") params.classification = filterClass;
      const data = await fetchEvidenceList(params);
      const validArray: EvidenceRecordItem[] = Array.isArray(data)
        ? data
        : ((data as any)?.data && Array.isArray((data as any).data)
          ? (data as any).data
          : (data as any)?.evidence && Array.isArray((data as any).evidence)
            ? (data as any).evidence
            : []);
      setEvidenceList(validArray);
    } catch (err: any) {
      console.error("Failed to load evidence:", err);
      setEvidenceList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvidence = async (item: EvidenceRecordItem) => {
    try {
      const detailed = await fetchEvidenceById(item.id);
      setSelectedEvidence(detailed);
    } catch (_) {
      setSelectedEvidence(item);
    }
  };

  const handleOpenChain = async (evidenceId: string) => {
    setLoadingChain(true);
    setShowChainModal(true);
    try {
      const events = await fetchEvidenceChain(evidenceId);
      setChainEvents(events || []);
    } catch (err) {
      console.error("Failed to fetch chain:", err);
    } finally {
      setLoadingChain(false);
    }
  };

  const handleVerify = async (evidenceId: string) => {
    setVerifyingId(evidenceId);
    setVerificationResult(null);
    try {
      const res = await verifyEvidenceIntegrity(evidenceId);
      setVerificationResult(res);
      await loadEvidence();
      if (selectedEvidence && selectedEvidence.id === evidenceId) {
        const updated = await fetchEvidenceById(evidenceId);
        setSelectedEvidence(updated);
      }
    } catch (err: any) {
      setVerificationResult({ isValid: false, error: err.message });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleToggleLegalHold = async () => {
    if (!selectedEvidence) return;
    const isHold = selectedEvidence.retentionStatus !== "LEGAL_HOLD";
    try {
      await toggleEvidenceLegalHold(selectedEvidence.id, holdReason || "Legal audit requirement", isHold);
      setActionMessage(`Legal hold ${isHold ? "applied" : "released"} successfully.`);
      setShowLegalHoldModal(false);
      setHoldReason("");
      await loadEvidence();
      const updated = await fetchEvidenceById(selectedEvidence.id);
      setSelectedEvidence(updated);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleExport = async () => {
    if (!selectedEvidence) return;
    try {
      const result = await exportEvidenceRecord(selectedEvidence.id, exportFormat);
      // Trigger file download in browser
      const blob = new Blob([result.data], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setActionMessage(`Exported ${result.filename} successfully`);
      setShowExportModal(false);
    } catch (err: any) {
      setActionMessage(`Export failed: ${err.message}`);
    }
  };

  const safeEvidenceList: EvidenceRecordItem[] = Array.isArray(evidenceList) ? evidenceList : [];

  const filteredEvidence = safeEvidenceList.filter((item) => {
    if (!item) return false;
    if (!searchQuery) return true;
    const q = (searchQuery || "").toLowerCase();
    return (
      (item.evidenceNumber && item.evidenceNumber.toLowerCase().includes(q)) ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.source && item.source.toLowerCase().includes(q)) ||
      (item.theatre?.name && item.theatre.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-bold tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 rounded-full uppercase">
              Cryptographic Proof Vault
            </span>
            <span className="text-xs text-slate-400">SHA-256 Chain of Custody</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 tracking-tight">Forensic Evidence & Case Vault</h1>
          <p className="text-sm text-slate-400 mt-1">
            Tamper-evident forensic records, cryptographic hash chains, and legal compliance exports.
          </p>
        </div>

        {actionMessage && (
          <div className="px-4 py-2 bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-xs rounded-xl flex items-center gap-2">
            <span>ℹ️ {actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="hover:text-white font-bold ml-2">
              ×
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Search</label>
          <input
            type="text"
            placeholder="Search EV-Number, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COLLECTED">COLLECTED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="FLAGGED_TAMPERED">FLAGGED_TAMPERED</option>
            <option value="LEGAL_HOLD">LEGAL_HOLD</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Classification</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Classifications</option>
            <option value="WATERMARK_MATCH">WATERMARK_MATCH</option>
            <option value="SCREEN_RECORDING_CAPTURE">SCREEN_RECORDING_CAPTURE</option>
            <option value="SESSION_ANOMALY">SESSION_ANOMALY</option>
            <option value="DRM_TAMPER_LOG">DRM_TAMPER_LOG</option>
            <option value="UNAUTHORIZED_FEED">UNAUTHORIZED_FEED</option>
            <option value="PHYSICAL_SENSOR_TRIGGER">PHYSICAL_SENSOR_TRIGGER</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={loadEvidence}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors border border-slate-700"
          >
            🔄 Refresh Vault
          </button>
        </div>
      </div>

      {/* Main Grid: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
              <p>Scanning cryptographic evidence vault...</p>
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <p className="text-base font-semibold text-slate-400">No evidence records found.</p>
              <p className="text-xs mt-1">Acquired forensic captures will appear here with cryptographic integrity proofs.</p>
            </div>
          ) : (
            filteredEvidence.map((item) => {
              const isTampered = item.status === "FLAGGED_TAMPERED";
              const isHold = item.retentionStatus === "LEGAL_HOLD";
              const isVerified = item.status === "VERIFIED";

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectEvidence(item)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    selectedEvidence?.id === item.id
                      ? "bg-slate-850 border-indigo-500 shadow-lg shadow-indigo-950/30"
                      : isTampered
                      ? "bg-red-950/20 border-red-800/60 hover:border-red-600"
                      : isHold
                      ? "bg-amber-950/20 border-amber-800/60 hover:border-amber-600"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                          {item.evidenceNumber}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isTampered
                              ? "bg-red-900/80 text-red-300 border border-red-700"
                              : isHold
                              ? "bg-amber-900/80 text-amber-300 border border-amber-700"
                              : isVerified
                              ? "bg-emerald-900/80 text-emerald-300 border border-emerald-700"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                          {item.classification}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            item.severity === "CRITICAL"
                              ? "text-red-400 bg-red-950"
                              : item.severity === "HIGH"
                              ? "text-orange-400 bg-orange-950"
                              : "text-blue-400 bg-blue-950"
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">{item.title}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-3">
                        <span>🏛️ {item.theatre?.name || "Global / Studio"}</span>
                        <span>🎬 {item.movie?.title || "Asset"}</span>
                        <span>📡 {item.source}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-2 flex-shrink-0">
                      <span className="text-xs font-mono text-slate-500 block">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerify(item.id);
                        }}
                        disabled={verifyingId === item.id}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-lg transition-colors"
                      >
                        {verifyingId === item.id ? "Checking..." : "🔍 Verify"}
                      </button>
                    </div>
                  </div>

                  {item.integrityHash && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>SHA-256: {item.integrityHash.substring(0, 24)}...</span>
                      <span className="text-slate-400">
                        {item.artifacts?.length ?? 0} Artifact(s) • {item.chainEvents?.length ?? 0} Chain Blocks
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Evidence Detail Drawer */}
        <div className="space-y-4">
          {selectedEvidence ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 sticky top-6">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-indigo-400 font-bold">{selectedEvidence.evidenceNumber}</span>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedEvidence.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvidence(null)}
                  className="text-slate-500 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOpenChain(selectedEvidence.id)}
                  className="px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  ⛓️ Chain of Custody
                </button>
                <button
                  onClick={() => handleVerify(selectedEvidence.id)}
                  disabled={verifyingId === selectedEvidence.id}
                  className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  {verifyingId === selectedEvidence.id ? "Verifying..." : "🛡️ Verify Integrity"}
                </button>
                <button
                  onClick={() => setShowLegalHoldModal(true)}
                  className="px-3 py-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  ⚖️ {selectedEvidence.retentionStatus === "LEGAL_HOLD" ? "Release Hold" : "Apply Legal Hold"}
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  📥 Export Dossier
                </button>
              </div>

              {/* Verification Result Toast */}
              {verificationResult && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    verificationResult.isValid && !verificationResult.tamperDetected
                      ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
                      : "bg-red-950/80 border-red-800 text-red-200"
                  }`}
                >
                  <p className="font-bold">
                    {verificationResult.isValid && !verificationResult.tamperDetected
                      ? "✅ Integrity Verified (Record, Artifacts & Hash Chain intact)"
                      : "❌ Tamper Detected!"}
                  </p>
                  {verificationResult.details && (
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                      {verificationResult.details.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Meta Info */}
              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-white">{selectedEvidence.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Retention:</span>
                    <span className="font-bold text-indigo-300">{selectedEvidence.retentionStatus}</span>
                  </div>
                  {selectedEvidence.retentionExpiresAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expires:</span>
                      <span className="text-slate-300 font-mono">
                        {new Date(selectedEvidence.retentionExpiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedEvidence.legalHoldReason && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-amber-400 font-bold block">Legal Hold Reason:</span>
                      <p className="text-slate-300 mt-0.5">{selectedEvidence.legalHoldReason}</p>
                    </div>
                  )}
                </div>

                {/* Canonical Hash */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Canonical Record Hash (SHA-256):</span>
                  <span className="font-mono text-emerald-400 text-[11px] break-all">
                    {selectedEvidence.integrityHash || "Unassigned"}
                  </span>
                </div>

                {/* Artifacts list */}
                <div>
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                    Evidence Artifacts ({selectedEvidence.artifacts?.length ?? 0})
                  </h4>
                  {selectedEvidence.artifacts && selectedEvidence.artifacts.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEvidence.artifacts.map((art) => (
                        <div key={art.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                          <div className="flex justify-between font-semibold text-white">
                            <span>📄 {art.artifactName}</span>
                            <span className="text-slate-500 font-mono text-[10px]">{art.fileSizeBytes} B</span>
                          </div>
                          <p className="font-mono text-[10px] text-slate-400 break-all">
                            SHA: {art.sha256Hash}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No raw artifacts attached.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/60">
              <p className="text-sm font-semibold">Select an evidence record</p>
              <p className="text-xs mt-1">View cryptographic signatures, chain blocks, and export legal reports.</p>
            </div>
          )}
        </div>
      </div>

      {/* CHAIN OF CUSTODY MODAL */}
      {showChainModal && selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Cryptographic Audit Trail</span>
                <h3 className="text-lg font-bold text-white">
                  Chain of Custody: {selectedEvidence.evidenceNumber}
                </h3>
              </div>
              <button onClick={() => setShowChainModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            {loadingChain ? (
              <div className="p-8 text-center text-slate-500">
                <p>Traversing hash chain...</p>
              </div>
            ) : chainEvents.length === 0 ? (
              <p className="text-slate-400 text-sm">No chain of custody blocks recorded.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {chainEvents.map((evt, idx) => (
                  <div key={evt.id} className="relative pl-10 space-y-1">
                    <div className="absolute left-2.5 top-1 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-slate-900" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Block #{idx + 1}: {evt.eventType}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Actor: {evt.actorEmail || evt.actorId || "System"} ({evt.actorRole || "SYSTEM"})
                    </p>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[10px] space-y-1 text-slate-400">
                      <div>Prev: {evt.previousChainHash.substring(0, 32)}...</div>
                      <div className="text-emerald-400">Hash: {evt.currentChainHash}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-right pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowChainModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL HOLD MODAL */}
      {showLegalHoldModal && selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {selectedEvidence.retentionStatus === "LEGAL_HOLD" ? "Release Legal Hold" : "Apply Legal Hold"}
            </h3>
            <p className="text-xs text-slate-400">
              Legal holds prevent automatic expiration, retention purge, and lifecycle archival for litigation compliance.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Reason / Case Reference</label>
              <textarea
                rows={3}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="e.g., Subpoena issued by Federal Court / Studio legal discovery..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLegalHoldModal(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleLegalHold}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Export Evidence Dossier</h3>
            <p className="text-xs text-slate-400">
              Generate a sanitized forensic export containing hash verification, chain of custody blocks, and non-PII technical telemetry.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(["REPORT", "JSON", "CSV"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${
                      exportFormat === fmt
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
              >
                Generate & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
