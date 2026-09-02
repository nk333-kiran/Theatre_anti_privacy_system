"use client";

import React from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Tv,
  Film,
  CalendarCheck,
  Ticket,
  QrCode,
  Settings,
  LogOut,
  Key,
  ShieldAlert,
  Activity,
  Fingerprint,
  Radio,
  Zap,
  BrainCircuit,
  Flame,
  Globe,
  Gavel,
  BarChart3,
  Play,
  RotateCcw,
  Cpu,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { UserProfile } from "../lib/api";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user }) => {
  const router = useRouter();

  const isAdmin = user?.role === "ADMIN" || user?.role === "THEATRE_ADMIN";
  const isStaff = user?.role === "THEATRE_STAFF";
  const isProduction = user?.role === "PRODUCTION_COMPANY";

  const allNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "production-ops", label: "Production Ops Center", icon: Cpu, badge: "Phase 36", adminOnly: true },
    { id: "disaster-recovery", label: "Disaster Recovery & SLA", icon: RotateCcw, badge: "Phase 35", adminOnly: true },
    { id: "demo", label: "End-to-End Demo", icon: Play, badge: "Phase 30" },
    { id: "orchestration", label: "End-to-End Response", icon: Zap, badge: "Phase 29" },
    { id: "studio-intel", label: "Studio Intelligence", icon: BarChart3, badge: "Phase 28" },
    { id: "enforcement", label: "Piracy Enforcement", icon: Gavel, badge: "Phase 27" },
    { id: "unified-soc", label: "Unified Threat SOC", icon: ShieldAlert, badge: "Phase 20", adminOnly: true },
    { id: "governance", label: "Zero-Trust Governance", icon: ShieldCheck, badge: "Phase 19", adminOnly: true },
    { id: "external-intel", label: "External Threat Intel", icon: Globe, badge: "Phase 18", adminOnly: true },
    { id: "evidence", label: "Forensic Evidence Vault", icon: Fingerprint, badge: "Phase 17" },
    { id: "compliance", label: "Compliance & Retention", icon: ShieldCheck, badge: "Phase 17", adminOnly: true },
    { id: "realtime", label: "Real-Time SOC Response", icon: Flame, badge: "Phase 16", adminOnly: true },
    { id: "intelligence", label: "Threat Intelligence", icon: BrainCircuit, badge: "Phase 15", adminOnly: true },
    { id: "traffic", label: "Traffic & Auto-Scaling", icon: Zap, badge: "Phase 16", adminOnly: true },
    { id: "command-center", label: "Command Center", icon: Radio, badge: "Phase 14", adminOnly: true },
    { id: "investigations", label: "Forensic Cases & Tracer", icon: ShieldAlert, badge: "Phase 17", adminOnly: true },
    { id: "operations", label: "Production Operations", icon: Activity, badge: "Phase 11", adminOnly: true },
    { id: "soc", label: "Security Operations (SOC)", icon: ShieldAlert, badge: "Phase 10", adminOnly: true },
    { id: "production", label: "Studio Content & Releases", icon: Film, badge: "Phase 7" },
    { id: "drm", label: "DRM Architecture", icon: Key, badge: "Phase 9B" },
    { id: "companies", label: "Production Studios", icon: Building2, adminOnly: true },
    { id: "protection", label: "Dynamic Protection", icon: ShieldCheck, badge: "Phase 6" },
    { id: "verifications", label: "Security Verification", icon: QrCode, badge: "Phase 4" },
    { id: "theatres", label: "Theatres & Screens", icon: Building2, adminOnly: true },
    { id: "movies", label: "Movies Catalog", icon: Film, adminOnly: true },
    { id: "shows", label: "Show Schedules", icon: CalendarCheck, adminOnly: true },
    { id: "tickets", label: "Tickets & Batches", icon: Ticket, adminOnly: true },
    { id: "settings", label: "Security & Settings", icon: Settings },
  ];

  const navItems = allNavItems.filter((item) => {
    if (isProduction) {
      return item.id === "dashboard" || item.id === "demo" || item.id === "orchestration" || item.id === "studio-intel" || item.id === "enforcement" || item.id === "evidence" || item.id === "production" || item.id === "drm" || item.id === "settings";
    }
    if (isStaff) {
      return item.id === "dashboard" || item.id === "demo" || item.id === "orchestration" || item.id === "studio-intel" || item.id === "enforcement" || item.id === "evidence" || item.id === "verifications" || item.id === "settings";
    }
    return true;
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-screen">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm tracking-tight">THEATRE GUARD</h1>
            <p className="text-xs text-indigo-400 font-medium tracking-wide">ANTI-PIRACY v1.0</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Main Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-300">System Engine</span>
          </div>
          <p className="text-[11px] text-slate-400">PostgreSQL + Prisma Active</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
