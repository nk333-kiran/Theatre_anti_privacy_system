"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  Building2,
  MapPin,
  Film,
  Tv,
  Clock,
  Ticket,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  QrCode,
  Lock,
  ChevronRight,
} from "lucide-react";
import {
  PublicTheatreDirectory,
  ShowItem,
  fetchTheatreByQrCode,
  associateTicketViaTheatreQr,
} from "../../lib/api";

function TheatreLandingContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";

  const [loading, setLoading] = useState(true);
  const [theatreData, setTheatreData] = useState<PublicTheatreDirectory | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User input states
  const [selectedShowId, setSelectedShowId] = useState<string>("");
  const [ticketInput, setTicketInput] = useState<string>("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Success state payload
  const [activeSession, setActiveSession] = useState<{
    alreadyActivated?: boolean;
    activationId: string;
    activationCode?: string;
    status: string;
    ticketNumber?: string;
    seatNumber?: string;
    movieTitle?: string;
    theatreName?: string;
    screenName?: string;
    startTime?: string;
    endTime?: string;
    activatedAt?: string;
    expiresAt?: string;
  } | null>(null);

  const [sessionQrUrl, setSessionQrUrl] = useState<string>("");

  // Load theatre by QR code
  const loadTheatre = async () => {
    if (!code) {
      setError("No Theatre QR identifier found in the URL. Please scan a valid venue QR code.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchTheatreByQrCode(code);
      if (res.success && res.data) {
        setTheatreData(res.data);
        if (res.data.shows.length > 0) {
          setSelectedShowId(res.data.shows[0].id);
        }
      } else {
        setError(res.message || "Unrecognized or invalid permanent Theatre QR code.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to theatre verification server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTheatre();
  }, [code]);

  // Generate QR for activated session if present
  useEffect(() => {
    if (activeSession?.activationCode) {
      const activationUrl = `${window.location.origin}/activate?code=${activeSession.activationCode}`;
      QRCode.toDataURL(activationUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setSessionQrUrl(url))
        .catch(() => {});
    }
  }, [activeSession]);

  // Handle Ticket Association & Activation
  const handleAssociateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !selectedShowId || !ticketInput.trim()) return;

    setActivating(true);
    setActivationError(null);

    try {
      const res = await associateTicketViaTheatreQr({
        theatreQrCode: code,
        showId: selectedShowId,
        ticketIdentifier: ticketInput.trim(),
      });

      if (res.success && res.data) {
        setActiveSession(res.data);
      } else {
        setActivationError(res.message || "Failed to associate ticket with this screening.");
      }
    } catch (err: any) {
      setActivationError(err.message || "Network error while activating ticket.");
    } finally {
      setActivating(false);
    }
  };

  const selectedShow = theatreData?.shows.find((s) => s.id === selectedShowId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-x-hidden">
      {/* Dynamic Background Security Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6 my-auto py-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/20 mb-2 ring-1 ring-white/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">THEATRE GUARD</h1>
          <p className="text-xs text-indigo-400 font-medium tracking-wide">
            Permanent Venue QR &bull; Zero-PII Admission Portal
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur shadow-2xl space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <h2 className="text-sm font-semibold text-slate-200">Identifying Theatre Checkpoint...</h2>
            <p className="text-xs text-slate-400">Loading screening schedule from PostgreSQL</p>
          </div>
        )}

        {/* Global Error State */}
        {!loading && error && (
          <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-7 text-center backdrop-blur shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Venue QR Unrecognized</h2>
              <p className="text-xs text-rose-400 mt-1">{error}</p>
            </div>
            <button
              onClick={loadTheatre}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
            >
              Try Again
            </button>
          </div>
        )}

        {/* SUCCESS / ACTIVE PROTECTION STATE (Prompt 10 & 11) */}
        {!loading && !error && activeSession && (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 backdrop-blur shadow-2xl space-y-5">
            {/* Protection Active Badge */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/70 to-slate-950 border border-emerald-500/30 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Admission Protection Active
              </div>
              <h2 className="text-xl font-black text-emerald-300 tracking-tight">
                THEATRE PROTECTION ACTIVE
              </h2>
              <p className="text-[11px] text-emerald-400/80">
                Auditorium security session synchronized with {activeSession.theatreName || "Theatre"}.
              </p>
            </div>

            {/* Session QR Badge for Security Staff Scanning */}
            {sessionQrUrl && (
              <div className="text-center py-2">
                <div className="bg-white p-3 rounded-2xl inline-block shadow-xl border-2 border-emerald-500/40">
                  <img
                    src={sessionQrUrl}
                    alt="Active Admission QR"
                    className="w-44 h-44 mx-auto rounded-lg"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  Present this QR to security staff at the auditorium checkpoint
                </p>
              </div>
            )}

            {/* Details Breakdown */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Activation ID</span>
                <span className="font-mono text-[11px] font-bold text-indigo-400">
                  {activeSession.activationId}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                </span>
              </div>
              {activeSession.ticketNumber && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Ticket ID</span>
                  <span className="font-mono font-bold text-slate-200">{activeSession.ticketNumber}</span>
                </div>
              )}
              {activeSession.seatNumber && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Assigned Seat</span>
                  <span className="font-mono font-black text-amber-400 text-sm">{activeSession.seatNumber}</span>
                </div>
              )}
              {activeSession.movieTitle && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Movie</span>
                  <span className="font-semibold text-slate-200">{activeSession.movieTitle}</span>
                </div>
              )}
              {activeSession.theatreName && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Theatre / Screen</span>
                  <span className="text-slate-300">
                    {activeSession.theatreName} {activeSession.screenName ? `• ${activeSession.screenName}` : ""}
                  </span>
                </div>
              )}
              {activeSession.expiresAt && (
                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <span className="text-slate-500">Security Expiry</span>
                  <span className="text-slate-400 font-mono">
                    {new Date(activeSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setActiveSession(null);
                setTicketInput("");
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Activate Another Ticket for this Venue &rarr;
            </button>
          </div>
        )}

        {/* THEATRE QR DISCOVERY & TICKET FORM */}
        {!loading && !error && !activeSession && theatreData && (
          <div className="space-y-5">
            {/* Identified Theatre Venue Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" /> Verified Theatre Venue
                  </span>
                  <h2 className="text-lg font-bold text-slate-100 mt-1.5">{theatreData.theatre.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{theatreData.theatre.location}</span>
                    <span>&bull;</span>
                    <span className="text-indigo-400 font-semibold">{theatreData.theatre.code}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Notification during Association */}
            {activationError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{activationError}</span>
              </div>
            )}

            {/* Step 1: Select Show Session */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-indigo-400" />
                  1. Select Your Movie & Showtime
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {theatreData.shows.length} Available
                </span>
              </div>

              {theatreData.shows.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                  No active or upcoming screenings scheduled for this theatre today.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {theatreData.shows.map((show) => {
                    const isSelected = selectedShowId === show.id;
                    return (
                      <div
                        key={show.id}
                        onClick={() => setSelectedShowId(show.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-500 text-slate-100 shadow-md shadow-indigo-600/10"
                            : "bg-slate-950 hover:bg-slate-800/60 border-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-100 truncate">
                            {show.movie.title}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                            <span className="text-indigo-400 font-semibold">{show.screen.name}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {new Date(show.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {show.movie.rating || "PG-13"}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-indigo-400 bg-indigo-500"
                                : "border-slate-600"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Enter Ticket ID & Activate */}
            <form
              onSubmit={handleAssociateTicket}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl space-y-4"
            >
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  2. Connect Your Ticket ID
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Enter the unique Ticket ID (e.g. <span className="font-mono text-slate-300">TCK-12345...</span>) or QR token from your booking.
                </p>

                <input
                  type="text"
                  required
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="Enter Ticket ID (e.g. TCK-...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={activating || !selectedShowId || !ticketInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {activating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Verify Ticket & Activate Protection</span>
                  </>
                )}
              </button>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>Multi-User Permanent Theatre QR</span>
                </div>
                <p className="text-slate-500">
                  This single Theatre QR is permanently placed at the venue. Every ticket verified receives a unique Activation ID for security checkpoint admission.
                </p>
              </div>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 font-mono">
          Theatre Guard Anti-Piracy System &bull; Phase 5 Permanent Venue QR
        </p>
      </div>
    </main>
  );
}

export default function TheatreLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading Theatre Portal...
        </div>
      }
    >
      <TheatreLandingContent />
    </Suspense>
  );
}
