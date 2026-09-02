"use client";

import React, { useEffect, useState } from "react";
import { fetchSocMetrics, SocMetrics } from "@/lib/api";

export const SOCMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SocMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      const res = await fetchSocMetrics();
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error("Failed to load SOC metrics:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading SOC Performance Metrics & KPIs...</div>;
  }

  if (!metrics) {
    return <div className="p-8 text-center text-rose-400">Unable to load SOC metrics.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Mean Time to Acknowledge (MTTA)
          </div>
          <div className="text-3xl font-black text-amber-400">
            {metrics.meanTimeToAcknowledgeMin} <span className="text-base font-normal text-slate-400">min</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">Target SLA: &lt; 5 min</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Mean Time to Resolve (MTTR)
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {metrics.meanTimeToResolveMin} <span className="text-base font-normal text-slate-400">min</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">Target SLA: &lt; 30 min</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Workflow Success Rate
          </div>
          <div className="text-3xl font-black text-cyan-400">
            {metrics.workflowSuccessRate}<span className="text-base font-normal text-slate-400">%</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">{metrics.workflowExecutionsCount} automated runs</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Active Incidents
          </div>
          <div className="text-3xl font-black text-rose-400">
            {metrics.totalActiveIncidents}
          </div>
          <div className="text-xs text-rose-500 mt-2 font-medium">
            {metrics.criticalIncidentsCount} Critical / {metrics.highIncidentsCount} High
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Threats by Theatre */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span>🏢</span> Top Threat Correlated Venues
          </h3>
          {metrics.threatsByTheatre.length === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center">No active venue anomalies detected.</div>
          ) : (
            <div className="space-y-3">
              {metrics.threatsByTheatre.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                  <span className="text-sm font-semibold text-slate-200">{item.theatreName}</span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {item.incidentCount} incidents
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Threats by Movie */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span>🎬</span> Content Target Distributions
          </h3>
          {metrics.threatsByMovie.length === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center">No active movie content threats logged.</div>
          ) : (
            <div className="space-y-3">
              {metrics.threatsByMovie.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                  <span className="text-sm font-semibold text-slate-200">{item.movieTitle}</span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {item.incidentCount} anomalies
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
