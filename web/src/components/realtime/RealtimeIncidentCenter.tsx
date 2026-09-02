"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Key,
  Tv,
  Ban,
  Fingerprint,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  RealtimeIncidentNotificationItem,
  approveResponseAction,
  rejectResponseAction,
  executeCustomRealtimeAction,
} from "../../lib/api";

interface RealtimeIncidentCenterProps {
  notifications: RealtimeIncidentNotificationItem[];
  onRefresh?: () => void;
  onNavigateToForensics?: () => void;
}

export const RealtimeIncidentCenter: React.FC<RealtimeIncidentCenterProps> = ({
  notifications,
  onRefresh,
  onNavigateToForensics,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNotification, setSelectedNotification] = useState<RealtimeIncidentNotificationItem | null>(null);
  const [executing, setExecuting] = useState(false);

  const filtered = notifications.filter((item) => {
    if (filterSeverity && item.severity !== filterSeverity) return false;
    if (searchQuery && !item.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleExecuteAction = async (actionType: string, targetId?: string) => {
    if (!confirm(`Are you sure you want to execute containment action [${actionType}]?`)) return;
    setExecuting(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      await executeCustomRealtimeAction(
        {
          actionType,
          targetId: targetId || selectedNotification?.theatreId || undefined,
          reason: `Manual execution from Real-Time Incident Center: ${selectedNotification?.message || actionType}`,
        },
        token
      );
      alert(`Successfully executed containment action: ${actionType}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setExecuting(false);
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" /> Real-Time SOC Incident & Response Center
          </h3>
          <p className="text-xs text-slate-400">Live operational incident queue with administrator-controlled containment triggers.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Incident List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
              No active incident notifications matching criteria.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNotification(item)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  selectedNotification?.id === item.id
                    ? "bg-slate-900 border-indigo-500/80 shadow-lg"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getSeverityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">{item.notificationType}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{new Date(item.sentAt).toLocaleTimeString()}</span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">{item.message}</p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  {item.theatre && <span>Venue: <strong className="text-slate-200">{item.theatre.name}</strong></span>}
                  {item.movie && <span>Movie: <strong className="text-slate-200">{item.movie.title}</strong></span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Detail & Action Panel */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl h-fit">
          {selectedNotification ? (
            <div className="space-y-4">
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getSeverityBadge(selectedNotification.severity)}`}>
                  {selectedNotification.severity}
                </span>
                <h4 className="text-base font-bold text-white mt-1.5">{selectedNotification.notificationType}</h4>
                <span className="text-[11px] font-mono text-slate-500">Sent: {new Date(selectedNotification.sentAt).toLocaleString()}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {selectedNotification.message}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Administrator Response Actions</span>

                <button
                  onClick={() => handleExecuteAction("REVOKE_PLAYBACK_SESSION")}
                  disabled={executing}
                  className="w-full px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Revoke Playback Session</span>
                </button>

                <button
                  onClick={() => handleExecuteAction("REVOKE_DRM_LICENSE")}
                  disabled={executing}
                  className="w-full px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Revoke DRM License</span>
                </button>

                <button
                  onClick={() => handleExecuteAction("BLACKLIST_TOKEN")}
                  disabled={executing}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Blacklist Security Token</span>
                </button>

                {onNavigateToForensics && (
                  <button
                    onClick={onNavigateToForensics}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Open Forensic Investigation</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Select an incident from the queue to inspect correlated signals and execute containment actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
