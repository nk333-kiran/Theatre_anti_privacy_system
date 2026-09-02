"use client";

import React from "react";
import { Flame, Building2, Tv, Film, Play, Shield } from "lucide-react";

interface ThreatRiskHeatmapProps {
  theatres?: Array<{ id: string; name: string; riskScore?: number; activeShows?: number }>;
  movies?: Array<{ id: string; title: string; riskScore?: number }>;
  sessions?: Array<{ id: string; sessionToken: string; riskScore?: number; theatreName?: string }>;
}

export const ThreatRiskHeatmap: React.FC<ThreatRiskHeatmapProps> = ({
  theatres = [],
  movies = [],
  sessions = [],
}) => {
  const getCellColor = (score: number = 0) => {
    if (score >= 80) return "bg-rose-500/20 border-rose-500/50 text-rose-300";
    if (score >= 60) return "bg-amber-500/20 border-amber-500/50 text-amber-300";
    if (score >= 40) return "bg-indigo-500/20 border-indigo-500/50 text-indigo-300";
    if (score >= 20) return "bg-sky-500/20 border-sky-500/50 text-sky-300";
    return "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
  };

  const getLevelName = (score: number = 0) => {
    if (score >= 80) return "CRITICAL";
    if (score >= 60) return "HIGH";
    if (score >= 40) return "ELEVATED";
    if (score >= 20) return "GUARDED";
    return "LOW";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400" /> Multi-Dimensional Threat Risk Heatmap
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">0-19 LOW</span>
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">20-39 GUARDED</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">40-59 ELEVATED</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">60-79 HIGH</span>
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">80-100 CRITICAL</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Theatres Heatmap */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-lg">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Cinema Venues Risk
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {theatres.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2">No active theatre venues recorded.</p>
            ) : (
              theatres.map((th) => {
                const score = th.riskScore ?? 10;
                return (
                  <div
                    key={th.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${getCellColor(
                      score
                    )}`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{th.name}</span>
                      <span className="text-[10px] text-slate-400">{th.activeShows ?? 0} active auditoriums</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold">{score}/100</span>
                      <span className="text-[10px] block opacity-80">{getLevelName(score)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Movies Heatmap */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-lg">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-cyan-400" /> Content Releases Risk
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {movies.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2">No active movie releases recorded.</p>
            ) : (
              movies.map((m) => {
                const score = m.riskScore ?? 15;
                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${getCellColor(
                      score
                    )}`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{m.title}</span>
                      <span className="text-[10px] text-slate-400">Content ID: {m.id.substring(0, 8)}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold">{score}/100</span>
                      <span className="text-[10px] block opacity-80">{getLevelName(score)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Sessions Heatmap */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-lg">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-amber-400" /> Active Playback Sessions
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2">No playback sessions active.</p>
            ) : (
              sessions.map((s) => {
                const score = s.riskScore ?? 5;
                return (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${getCellColor(
                      score
                    )}`}
                  >
                    <div>
                      <span className="text-xs font-mono font-bold block">{s.sessionToken.substring(0, 14)}...</span>
                      <span className="text-[10px] text-slate-400">{s.theatreName || "Auditorium Stream"}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold">{score}/100</span>
                      <span className="text-[10px] block opacity-80">{getLevelName(score)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
