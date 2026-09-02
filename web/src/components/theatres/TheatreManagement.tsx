"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Tv,
  Layers,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  X,
  Check,
  QrCode,
  Download,
  Copy,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  TheatreItem,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  addScreenToTheatre,
  deleteScreen,
  regenerateTheatreQr,
} from "../../lib/api";

interface TheatreManagementProps {
  theatres: TheatreItem[];
  onRefresh: () => void;
}

export const TheatreManagement: React.FC<TheatreManagementProps> = ({
  theatres,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTheatre, setEditingTheatre] = useState<TheatreItem | null>(null);
  const [managingScreensTheatre, setManagingScreensTheatre] = useState<TheatreItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for Theatre
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [initialScreens, setInitialScreens] = useState(4);

  // Form states for Screen
  const [screenNum, setScreenNum] = useState("");
  const [screenName, setScreenName] = useState("");
  const [screenCap, setScreenCap] = useState("150");

  // Permanent Theatre QR Modal state (Phase 5)
  const [selectedTheatreForQr, setSelectedTheatreForQr] = useState<TheatreItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);

  // Generate Theatre QR code
  useEffect(() => {
    if (selectedTheatreForQr) {
      const qrCodeTarget = selectedTheatreForQr.permanentQrCode || selectedTheatreForQr.code;
      const landingUrl = `${window.location.origin}/theatre?code=${qrCodeTarget}`;
      QRCode.toDataURL(landingUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Theatre QR generation error:", err));
    } else {
      setQrDataUrl("");
    }
  }, [selectedTheatreForQr]);

  const handleRegenerateQr = async () => {
    if (!selectedTheatreForQr) return;
    if (
      !confirm(
        `Are you sure you want to regenerate the permanent QR code for "${selectedTheatreForQr.name}"? Previously printed physical posters will become invalid.`
      )
    ) {
      return;
    }

    setRegeneratingQr(true);
    try {
      const res = await regenerateTheatreQr(selectedTheatreForQr.id);
      if (res.success && res.data) {
        setSelectedTheatreForQr(res.data);
        onRefresh();
      } else {
        alert(res.message || "Failed to regenerate QR code");
      }
    } catch (err: any) {
      alert(err.message || "Error regenerating QR");
    } finally {
      setRegeneratingQr(false);
    }
  };

  const copyTheatreUrl = (codeTarget: string) => {
    const url = `${window.location.origin}/theatre?code=${codeTarget}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQrPoster = () => {
    if (!qrDataUrl || !selectedTheatreForQr) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `THEATRE-QR-${selectedTheatreForQr.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openCreateModal = () => {
    setError(null);
    setName("");
    setCode(`TH-${Math.floor(100 + Math.random() * 900)}`);
    setLocation("");
    setAddress("");
    setContactEmail("");
    setContactPhone("");
    setInitialScreens(4);
    setEditingTheatre(null);
    setShowAddModal(true);
  };

  const openEditModal = (t: TheatreItem) => {
    setError(null);
    setName(t.name);
    setCode(t.code);
    setLocation(t.location);
    setAddress(t.address || "");
    setContactEmail(t.contactEmail || "");
    setContactPhone(t.contactPhone || "");
    setEditingTheatre(t);
    setShowAddModal(true);
  };

  const handleSaveTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (editingTheatre) {
        const res = await updateTheatre(editingTheatre.id, {
          name,
          code,
          location,
          address,
          contactEmail,
          contactPhone,
        });
        if (!res.success) throw new Error(res.message);
      } else {
        const res = await createTheatre({
          name,
          code,
          location,
          address,
          contactEmail,
          contactPhone,
          initialScreensCount: Number(initialScreens) || 0,
        });
        if (!res.success) throw new Error(res.message);
      }
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to save theatre");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTheatre = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete theatre "${name}"?`)) return;
    try {
      const res = await deleteTheatre(id);
      if (!res.success) {
        alert(res.message || "Failed to delete theatre");
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Error deleting theatre");
    }
  };

  const handleAddScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingScreensTheatre) return;
    setError(null);
    setLoading(true);

    try {
      const res = await addScreenToTheatre(managingScreensTheatre.id, {
        screenNumber: Number(screenNum),
        name: screenName.trim() || `Screen ${screenNum}`,
        capacity: Number(screenCap) || 100,
      });
      if (!res.success) throw new Error(res.message);

      setScreenNum("");
      setScreenName("");
      onRefresh();
      // Update local managing modal reference
      setManagingScreensTheatre((prev) =>
        prev
          ? {
              ...prev,
              screens: [...prev.screens, res.data].sort((a, b) => a.screenNumber - b.screenNumber),
            }
          : null
      );
    } catch (err: any) {
      setError(err.message || "Failed to add screen");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScreen = async (screenId: string) => {
    if (!confirm("Are you sure you want to delete this screen?")) return;
    try {
      const res = await deleteScreen(screenId);
      if (!res.success) {
        alert(res.message);
        return;
      }
      onRefresh();
      setManagingScreensTheatre((prev) =>
        prev ? { ...prev, screens: prev.screens.filter((s) => s.id !== screenId) } : null
      );
    } catch (err: any) {
      alert(err.message || "Error deleting screen");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Theatres & Screen Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure multiplexes, auditoriums, seating capacities, and hardware associations
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Theatre</span>
        </button>
      </div>

      {/* Grid of Theatres */}
      {theatres.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Theatres Configured Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Add your first cinema or multiplex venue to begin scheduling shows and monitoring screens.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            + Create First Theatre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {theatres.map((theatre) => (
            <div
              key={theatre.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
            >
              <div>
                {/* Card Title & Code */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base group-hover:text-indigo-400 transition-colors">
                      {theatre.name}
                    </h3>
                    <span className="inline-block mt-1 font-mono text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                      ID: {theatre.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(theatre)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Theatre"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTheatre(theatre.id, theatre.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Theatre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Location & Contacts */}
                <div className="space-y-1.5 text-xs text-slate-400 mb-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{theatre.location}</span>
                  </div>
                  {theatre.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{theatre.contactEmail}</span>
                    </div>
                  )}
                  {theatre.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{theatre.contactPhone}</span>
                    </div>
                  )}
                </div>

                {/* Screen Badges */}
                <div className="border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-indigo-400" />
                      Screens ({theatre.screens?.length || 0})
                    </span>
                    <button
                      onClick={() => {
                        setError(null);
                        setScreenNum(String((theatre.screens?.length || 0) + 1));
                        setScreenName(`Screen ${(theatre.screens?.length || 0) + 1}`);
                        setScreenCap("150");
                        setManagingScreensTheatre(theatre);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      + Manage Screens
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {theatre.screens && theatre.screens.length > 0 ? (
                      theatre.screens.map((screen) => (
                        <span
                          key={screen.id}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 font-mono"
                        >
                          #{screen.screenNumber} &bull; {screen.capacity} seats
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No screens configured</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Shows: {theatre._count?.shows ?? 0}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTheatreForQr(theatre)}
                    className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-indigo-500/30 transition-colors"
                    title="View & Download Permanent Theatre QR"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Venue QR</span>
                  </button>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create/Edit Theatre */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              {editingTheatre ? "Edit Theatre Details" : "Register New Theatre"}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Enter the facility metadata, code identifier, and contact points.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveTheatre} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Theatre Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grand Apex Cinema"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Theatre Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GAC-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 uppercase font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    City / Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Los Angeles, CA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="ops@apexcinema.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!editingTheatre && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Initial Screens to Auto-Generate
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={initialScreens}
                    onChange={(e) => setInitialScreens(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingTheatre ? "Update Theatre" : "Create Theatre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Screens */}
      {managingScreensTheatre && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setManagingScreensTheatre(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-0.5">
              Manage Screens: {managingScreensTheatre.name}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Add, remove, or modify auditoriums and seat capacities for this theatre.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Existing screens list */}
            <div className="mb-6 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Configured Auditoriums ({managingScreensTheatre.screens?.length || 0})
              </h4>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                {managingScreensTheatre.screens?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No screens added yet.</div>
                ) : (
                  managingScreensTheatre.screens.map((sc) => (
                    <div key={sc.id} className="p-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold">
                          #{sc.screenNumber}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-200">{sc.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{sc.capacity} Seats &bull; ID: {sc.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteScreen(sc.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete Screen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add screen form */}
            <form onSubmit={handleAddScreen} className="border-t border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Add Auditorium / Screen
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Screen # *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={screenNum}
                    onChange={(e) => setScreenNum(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={screenName}
                    onChange={(e) => setScreenName(e.target.value)}
                    placeholder="e.g. Screen 5 4K"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Capacity *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={screenCap}
                    onChange={(e) => setScreenCap(e.target.value)}
                    placeholder="150"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                + Add Screen to {managingScreensTheatre.name}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Permanent Theatre QR (Phase 5) */}
      {selectedTheatreForQr && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-center">
            <button
              onClick={() => setSelectedTheatreForQr(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2">
              <Building2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-100">
              {selectedTheatreForQr.name}
            </h3>
            <p className="text-xs text-indigo-400 mb-1 font-semibold">
              Permanent Theatre Entrance QR Code
            </p>
            <p className="text-[11px] text-slate-400 mb-4 font-mono">
              Venue ID: <span className="text-slate-200 font-bold">{selectedTheatreForQr.code}</span> &bull; {selectedTheatreForQr.location}
            </p>

            {/* QR Code Graphic Frame */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl mb-4 border-4 border-indigo-500/30">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Permanent QR for ${selectedTheatreForQr.name}`}
                  className="w-64 h-64 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-xs">
                  Generating Venue QR...
                </div>
              )}
            </div>

            {/* Zero-PII Guarantee Callout */}
            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1 mb-4">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-PII Permanent Venue QR</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                This QR contains only the permanent theatre URL. Multiple visitors scan this identical QR to discover live screenings and associate individual tickets.
              </p>
            </div>

            {/* Actions Grid */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadQrPoster}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Poster</span>
                </button>

                <button
                  onClick={() => copyTheatreUrl(selectedTheatreForQr.permanentQrCode || selectedTheatreForQr.code)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/theatre?code=${selectedTheatreForQr.permanentQrCode || selectedTheatreForQr.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Scan Page</span>
                </a>

                <button
                  onClick={handleRegenerateQr}
                  disabled={regeneratingQr}
                  className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Regenerate only when explicitly requested"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingQr ? "animate-spin" : ""}`} />
                  <span>{regeneratingQr ? "Regenerating..." : "Regenerate QR"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
