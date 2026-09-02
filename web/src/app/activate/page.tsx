"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  Film,
  Tv,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  verifyActivationToken,
  activateTicketCode,
  VerificationData,
} from "../../lib/api";

function ActivationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("code") || searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [activatedPayload, setActivatedPayload] = useState<{
    alreadyActivated: boolean;
    activationId: string;
    status: string;
    activatedAt?: string;
    expiresAt?: string;
    ticketNumber?: string;
    seatNumber?: string;
    movieTitle?: string;
    theatreName?: string;
    screenName?: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Load and verify token on scan
  useEffect(() => {
    if (!token) {
      setError("No activation token provided in the QR code.");
      setLoading(false);
      return;
    }

    const checkToken = async () => {
      setLoading(true);
      try {
        const res = await verifyActivationToken(token);
        if (res.success && res.data) {
          setData(res.data);
          if (res.data.activationStatus === "ACTIVE") {
            // Already active
            setActivatedPayload({
              alreadyActivated: true,
              activationId: res.data.activationId,
              status: "ACTIVE",
              activatedAt: res.data.activatedAt,
              expiresAt: res.data.expiresAt,
              ticketNumber: res.data.ticketId,
              seatNumber: res.data.seatNumber,
              movieTitle: res.data.movie.title,
              theatreName: res.data.theatre.name,
              screenName: res.data.screen.name,
              startTime: res.data.show.startTime,
              endTime: res.data.show.endTime,
            });
          }
        } else {
          setError(res.message || "Invalid or unverified activation token.");
        }
      } catch (err: any) {
        setError(err.message || "Network error communicating with validation server.");
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  // Execute Activation
  const handleActivate = async () => {
    if (!token) return;
    setActivating(true);
    setError(null);

    try {
      const res = await activateTicketCode(token);
      if (res.success && res.data) {
        setActivatedPayload(res.data);
      } else {
        setError(res.message || "Failed to activate ticket.");
      }
    } catch (err: any) {
      setError(err.message || "Activation request failed.");
    } finally {
      setActivating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Security Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6 my-auto">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/20 mb-3 ring-1 ring-white/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">THEATRE GUARD</h1>
          <p className="text-xs text-indigo-400 font-medium tracking-wide">
            Anti-Piracy QR Verification & Activation Portal
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur shadow-2xl space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <h2 className="text-sm font-semibold text-slate-200">Verifying Cryptographic Token...</h2>
            <p className="text-xs text-slate-400">Validating digital signature with PostgreSQL</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-7 text-center backdrop-blur shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Verification Blocked</h2>
              <p className="text-xs text-rose-400 mt-1 max-w-xs mx-auto">{error}</p>
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Security Notice: This token may be expired, cancelled, or corrupted. Please contact cinema staff for assistance.
            </div>
          </div>
        )}

        {/* ACTIVE State (Prompt 11: Display "THEATRE PROTECTION ACTIVE" with Activation ID) */}
        {!loading && !error && activatedPayload && (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 backdrop-blur shadow-2xl space-y-5">
            {/* Protection Active Badge */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/30 text-center space-y-2 relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Live Verification
              </div>
              <h2 className="text-lg font-extrabold text-emerald-300 tracking-tight">
                THEATRE PROTECTION ACTIVE
              </h2>
              <p className="text-[11px] text-emerald-400/80">
                Auditorium security protocols and device monitoring synchronized.
              </p>
            </div>

            {/* Activation Details */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Activation ID</span>
                <span className="font-mono text-[11px] font-bold text-indigo-400">
                  {activatedPayload.activationId}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                </span>
              </div>
              {activatedPayload.ticketNumber && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Ticket ID</span>
                  <span className="font-mono text-slate-200">{activatedPayload.ticketNumber}</span>
                </div>
              )}
              {activatedPayload.seatNumber && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Assigned Seat</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {activatedPayload.seatNumber}
                  </span>
                </div>
              )}
              {activatedPayload.movieTitle && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Movie</span>
                  <span className="font-semibold text-slate-200">{activatedPayload.movieTitle}</span>
                </div>
              )}
              {activatedPayload.theatreName && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Theatre / Screen</span>
                  <span className="text-slate-300">
                    {activatedPayload.theatreName} &bull; {activatedPayload.screenName}
                  </span>
                </div>
              )}
              {activatedPayload.expiresAt && (
                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <span className="text-slate-500">Security Expiry</span>
                  <span className="text-slate-400 font-mono">
                    {new Date(activatedPayload.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center text-[11px] text-slate-500">
              Present this active screen when entering the auditorium checkpoint.
            </div>
          </div>
        )}

        {/* PENDING State: Prompt User to Activate */}
        {!loading && !error && !activatedPayload && data && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                <Lock className="w-3 h-3" /> Secure Token Validated
              </span>
              <h2 className="text-lg font-bold text-slate-100">Activate Your Admission</h2>
              <p className="text-xs text-slate-400">
                Confirm entry to initialize auditorium anti-piracy protection.
              </p>
            </div>

            {/* Ticket Card Summary */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-slate-200 text-sm">{data.movie.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {data.movie.rating || "PG-13"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{data.theatre.name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Tv className="w-3.5 h-3.5 text-slate-500" />
                  <span>{data.screen.name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(data.show.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-amber-400 font-mono text-sm">Seat {data.seatNumber}</span>
                </div>
              </div>
            </div>

            {/* Activate Button */}
            <button
              onClick={handleActivate}
              disabled={activating}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {activating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Activate Ticket Protection</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-500 font-mono">
              Ticket ID: {data.ticketId}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-600">
          Theatre Anti-Piracy QR Activation &bull; Zero Private Data in QR Payload
        </p>
      </div>
    </main>
  );
}

export default function ActivationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading activation portal...
        </div>
      }
    >
      <ActivationContent />
    </Suspense>
  );
}
