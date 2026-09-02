"use client";

import React from "react";
import { Bell, ShieldCheck, UserCircle } from "lucide-react";
import { UserProfile } from "../lib/api";

interface HeaderProps {
  user: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-slate-200">
          Admin Portal & Operations
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Operational
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Anti Piracy Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-300">Phase 1 Infrastructure Ready</span>
        </div>

        {/* Notification indicator */}
        <button
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/40 relative transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full"></span>
        </button>

        {/* User profile dropdown info */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-slate-200">{user?.name || "Admin User"}</div>
            <div className="text-[10px] text-indigo-400 font-mono">{user?.role || "ADMIN"}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
