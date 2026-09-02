"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { WatermarkPayload } from "../../lib/api";

interface WatermarkProps {
  payload: WatermarkPayload;
  opacity?: number;
  className?: string;
}

export const Watermark: React.FC<WatermarkProps> = ({
  payload,
  opacity = 0.42,
  className = "",
}) => {
  // Live dynamic clock updated every second
  const [liveTimestamp, setLiveTimestamp] = useState<string>("");
  // Position index rotated periodically
  const [positionIndex, setPositionIndex] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setLiveTimestamp(
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
          " UTC" +
          (d.getTimezoneOffset() <= 0 ? "+" : "-") +
          Math.abs(Math.floor(d.getTimezoneOffset() / 60))
      );
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Periodic position shift every 9 seconds to prevent video crop evasion
  useEffect(() => {
    const posInterval = setInterval(() => {
      setPositionIndex((prev) => (prev + 1) % 5);
    }, 9000);
    return () => clearInterval(posInterval);
  }, []);

  // Predefined non-obstructive dynamic positions (top-left, top-right, center-shift, bottom-left, bottom-right)
  const positionClasses = [
    "top-4 left-4 text-left",
    "top-4 right-4 text-right",
    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center",
    "bottom-16 left-4 text-left",
    "bottom-16 right-4 text-right",
  ];

  const currentPositionClass = positionClasses[positionIndex];

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none z-20 transition-all duration-1000 ease-in-out ${className}`}
      style={{ opacity }}
    >
      {/* Primary Dynamic Moving Watermark Node */}
      <div
        className={`absolute ${currentPositionClass} p-2 rounded-xl backdrop-blur-[2px] bg-black/25 border border-white/10 text-white shadow-2xl transition-all duration-700 max-w-xs`}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-indigo-300 uppercase">
          <ShieldCheck className="w-3 h-3 text-indigo-400 shrink-0" />
          <span>{payload.theatreCode} &bull; {payload.screenName}</span>
        </div>

        <div className="font-mono text-xs font-black tracking-widest text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {payload.shortActivationId}
        </div>

        <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-slate-300 mt-0.5">
          <span className="font-bold text-amber-300">Seat {payload.seatNumber}</span>
          <span className="text-slate-400">{liveTimestamp}</span>
        </div>
      </div>

      {/* Secondary Micro Watermark Node (Diagonal Counter-Balance) */}
      <div
        className={`absolute ${
          positionIndex === 0 || positionIndex === 3 ? "bottom-6 right-6 text-right" : "top-6 left-6 text-left"
        } opacity-50 p-1.5 rounded-lg text-white/70 font-mono text-[9px] leading-tight transition-all duration-700`}
      >
        <div className="font-bold tracking-wider">{payload.sessionId}</div>
        <div className="text-[8px] text-slate-400">{payload.movieTitle}</div>
      </div>
    </div>
  );
};
