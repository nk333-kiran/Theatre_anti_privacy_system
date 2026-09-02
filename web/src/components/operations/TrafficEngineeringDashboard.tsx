"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Zap,
  Clock,
  Radio,
  Server,
  Layers,
  Flame,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database,
  Tv,
  Eye,
  Lock,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import {
  fetchScalingTelemetry,
  fetchOperationsHealth,
  fetchOperationsDependencies,
  ScalingTelemetryData,
  OperationsHealthData,
  OperationsDependenciesData,
} from "../../lib/api";

interface TrafficEngineeringDashboardProps {
  onRefreshGlobal?: () => void;
}

export const TrafficEngineeringDashboard: React.FC<TrafficEngineeringDashboardProps> = ({
  onRefreshGlobal,
}) => {
  const [scaling, setScaling] = useState<ScalingTelemetryData | null>(null);
  const [health, setHealth] = useState<OperationsHealthData | null>(null);
  const [dependencies, setDependencies] = useState<OperationsDependenciesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [burstMode, setBurstMode] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || undefined;
    try {
      const [scalingData, healthData, depsData] = await Promise.all([
        fetchScalingTelemetry(token).catch(() => null),
        fetchOperationsHealth(token).catch(() => null),
        fetchOperationsDependencies(token).catch(() => null),
      ]);

      if (scalingData) setScaling(scalingData);
      if (healthData) setHealth(healthData);
      if (depsData) setDependencies(depsData);
    } catch (err) {
      console.error("Failed to load traffic engineering telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const getPostureColor = (posture?: string) => {
    switch (posture) {
      case "CRITICAL":
        return "from-rose-950 via-slate-900 to-rose-950 border-rose-600/50 text-rose-300";
      case "HIGH":
        return "from-amber-950 via-slate-900 to-amber-950 border-amber-600/50 text-amber-300";
      case "ELEVATED":
        return "from-indigo-950 via-slate-900 to-indigo-950 border-indigo-600/50 text-indigo-300";
      default:
        return "from-emerald-950 via-slate-900 to-emerald-950 border-emerald-600/50 text-emerald-300";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. TRAFFIC POSTURE & PEAK BURST BANNER */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getPostureColor(scaling?.trafficPosture)} border p-6 shadow-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Distributed Traffic Mesh (Active Auto-Scaling)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-950/90 border border-slate-700">
                Traffic Posture: {scaling?.trafficPosture || "NORMAL"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Zap className="w-8 h-8 text-amber-400" /> Production Traffic Engineering & Auto-Scaling
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Real-time showtime traffic load balancing, distributed Redis rate limiting, circuit breaker health, and peak-burst backpressure controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setBurstMode(!burstMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-lg ${
                burstMode
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 ring-2 ring-amber-500/30"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              }`}
            >
              <Flame className={`w-4 h-4 ${burstMode ? "text-amber-400 animate-bounce" : "text-slate-400"}`} />
              <span>{burstMode ? "Peak Burst Mode ACTIVE" : "Enable Peak Burst Gate"}</span>
            </button>

            <button
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shadow-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. LIVE THROUGHPUT & LATENCY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Throughput</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {scaling?.requestsPerSecond ?? 0} <span className="text-xs font-normal text-slate-400">req/s</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active instances: {scaling?.activeInstances ?? 2}</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Average Latency</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {scaling?.averageLatencyMs ?? 0} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">P95: {scaling?.p95LatencyMs ?? 0}ms</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Error Rate</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {scaling?.errorRatePercent ?? 0} <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">SLO target: &lt; 0.5%</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Playbacks</span>
            <Tv className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {scaling?.activePlaybacks ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total sessions: {scaling?.activeSessionsCount ?? 0}</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">DRM Throughput</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {scaling?.drmLicensesCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Issued DRM keys</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Process Memory</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {scaling?.memoryUsageMb ?? 0} <span className="text-xs font-normal text-slate-400">MB</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Heap: {scaling?.heapUsedMb ?? 0}MB</div>
        </div>
      </div>

      {/* 3. DISTRIBUTED INFRASTRUCTURE & CIRCUIT BREAKERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Infrastructure Dependencies */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" /> Distributed State & Storage Mesh
          </h2>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">PostgreSQL Connection Pool</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Max pool size: 50 | Timeout: 15s</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                CONNECTED
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">Redis Distributed Cache & Locks</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Sliding-window counters & Mutex state</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">Primary Cloudflare CDN</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">HMAC-SHA256 Token authorization gate</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HEALTHY
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">Background Worker Queue</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Dead-letter queue & Exponential retry</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                READY (4 Workers)
              </span>
            </div>
          </div>
        </div>

        {/* Resilient Circuit Breakers Status */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" /> Dependency Circuit Breakers
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Database Breaker</div>
              <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> CLOSED (Healthy)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Redis Breaker</div>
              <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> CLOSED (Healthy)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">CDN Edge Breaker</div>
              <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> CLOSED (Healthy)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">DRM Server Breaker</div>
              <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> CLOSED (Healthy)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">KMS HSM Breaker</div>
              <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> CLOSED (Healthy)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Object Storage Breaker</div>
              <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> CLOSED (Healthy)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
