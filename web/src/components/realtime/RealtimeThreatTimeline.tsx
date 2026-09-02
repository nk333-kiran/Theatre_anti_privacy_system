"use client";

import React, { useState } from "react";
import {
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Flame,
  Key,
  Tv,
  Film,
  Camera,
  Activity,
  UserCheck,
} from "lucide-react";
import { RealtimeThreatEventItem } from "../../lib/api";

interface RealtimeThreatTimelineProps {
  events: RealtimeThreatEventItem[];
  loading?: boolean;
}

export const RealtimeThreatTimeline: React.FC<RealtimeThreatTimelineProps> = ({ events, loading }) => {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "DRM_LICENSE_DENIED":
      case "DRM_LICENSE_REVOKED":
        return <Key className="w-4 h-4 text-rose-400" />;
      case "PLAYBACK_TERMINATED":
      case "PLAYBACK_DENIED":
        return <Tv className="w-4 h-4 text-amber-400" />;
      case "SCREENSHOT_ATTEMPT_DETECTED":
        return <Camera className="w-4 h-4 text-indigo-400" />;
      case "STAFF_VERIFICATION":
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Activity className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "text-rose-400 bg-rose-950/80 border-rose-600/50";
      case "HIGH":
        return "text-amber-400 bg-amber-950/80 border-amber-600/50";
      case "MEDIUM":
        return "text-indigo-400 bg-indigo-950/80 border-indigo-600/50";
      default:
        return "text-slate-400 bg-slate-900 border-slate-700";
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Streaming security timeline...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
        No realtime security events recorded in the current active window.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" /> Correlated Real-Time Security Timeline
        </h3>
        <span className="text-xs text-slate-400 font-mono">{events.length} Events Ingested</span>
      </div>

      <div className="relative border-l-2 border-slate-800 ml-4 space-y-4 pl-6">
        {events.map((evt) => {
          const isExpanded = expandedEventId === evt.id;
          let parsedMeta: any = null;
          try {
            parsedMeta = evt.metadata ? JSON.parse(evt.metadata) : null;
          } catch (_) {}

          return (
            <div key={evt.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-indigo-500 group-hover:scale-125 transition-transform" />

              <div
                onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {getEventIcon(evt.eventType)}
                    <span className="text-xs font-bold text-slate-100 font-mono">{evt.eventType}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getSeverityBadge(evt.severity)}`}>
                      {evt.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </span>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span>Source: <strong className="text-slate-300">{evt.source}</strong></span>
                  {evt.theatre && <span>Venue: <strong className="text-slate-300">{evt.theatre.name}</strong></span>}
                  {evt.movie && <span>Title: <strong className="text-slate-300">{evt.movie.title}</strong></span>}
                </div>

                {/* Expanded Telemetry Detail */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 bg-slate-900/40 p-3 rounded-lg text-xs">
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
                      <div>Event ID: <span className="text-slate-200">{evt.eventId}</span></div>
                      <div>Correlation ID: <span className="text-slate-200">{evt.correlationId}</span></div>
                      {evt.activationId && <div>Activation ID: <span className="text-slate-200">{evt.activationId}</span></div>}
                      {evt.playbackSessionId && <div>Session ID: <span className="text-slate-200">{evt.playbackSessionId}</span></div>}
                    </div>

                    {parsedMeta && (
                      <div className="mt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sanitized Telemetry Metadata</span>
                        <pre className="p-2 rounded bg-slate-950 text-[10px] text-emerald-400 font-mono overflow-x-auto">
                          {JSON.stringify(parsedMeta, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
