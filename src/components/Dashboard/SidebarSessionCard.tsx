"use client";

import { useActiveSession } from "@/components/ActiveSessionContext";

interface SidebarSessionCardProps {
  currentTab: string;
  onResumeSession: () => void;
}

/**
 * Dynamic right-sidebar card with three visual states:
 * 1. Idle — Motivational quote card
 * 2. Active + viewing session tab — Flow State Visualizer (bobbing bars + %)
 * 3. Active + on different tab — Mini ticking timer with resume link
 */
export default function SidebarSessionCard({
  currentTab,
  onResumeSession,
}: SidebarSessionCardProps) {
  const { session } = useActiveSession();

  // Determine if the user is currently viewing the session's own tab
  const isOnSessionTab =
    session &&
    ((session.sourceTab === "meditation" && currentTab === "meditation") ||
      (session.sourceTab === "breathing" && currentTab === "breathing"));

  // ── State 1: No active session (idle) ──
  if (!session) {
    return (
      <div className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden border border-outline-variant/10 w-full">
        <span className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-30 pointer-events-none" />
        <span className="relative z-10 flex flex-col items-center">
          <svg
            className="w-6 h-6 text-primary/80 mb-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <span className="text-base md:text-lg font-light text-on-surface-variant italic leading-relaxed block">
            <span className="block mb-2">You&apos;re not lazy.</span>
            <span className="block mb-2">You&apos;re blocked.</span>
            <span className="block">Different problem.</span>
          </span>
        </span>
      </div>
    );
  }

  // ── Shared computed values ──
  const label =
    session.type === "guided"
      ? "Guided Active"
      : session.type === "focus"
        ? "Focus Active"
        : "Breathing Active";

  const progress =
    session.totalSeconds > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((session.totalSeconds - session.secondsLeft) /
                session.totalSeconds) *
                100
            )
          )
        )
      : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.floor(Math.max(0, secs) % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── State 2: Active + viewing session tab → Flow Visualizer ──
  if (isOnSessionTab) {
    return (
      <div className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden border border-outline-variant/10 w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-5 w-full">
          {/* Status pill */}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-green-400 shrink-0"
              style={{ animation: "pulse 2s ease-in-out infinite" }}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              {session.isGenerating ? "Building…" : label}
            </span>
          </div>

          {/* Flow wave bars */}
          <div className="flex items-end justify-center gap-[5px] h-10">
            {[1.6, 1.2, 0.9, 1.4, 1.1].map((dur, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-primary/60"
                style={{
                  height: "32px",
                  animation: `flow-bob ${dur}s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                  transformOrigin: "bottom",
                }}
              />
            ))}
          </div>

          {/* Percentage + progress bar */}
          <div className="w-full space-y-2">
            <p className="text-[10px] font-bold text-on-surface-variant/60 tracking-wider">
              {session.isGenerating ? "Generating…" : `${progress}% complete`}
            </p>
            <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700 ease-out"
                style={{ width: `${session.isGenerating ? 0 : progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── State 3: Active + different tab → Mini ticking timer ──
  return (
    <button
      onClick={onResumeSession}
      className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-300 border border-outline-variant/10 w-full cursor-pointer"
    >
      <span className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
      <span className="relative z-10 flex flex-col items-center gap-4 w-full">
        {/* Status pill */}
        <span className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0"
            style={{ animation: "pulse 2s ease-in-out infinite" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant group-hover:text-on-surface transition-colors">
            {session.isGenerating ? "Building…" : label}
          </span>
        </span>

        {/* Ticking countdown or generating state */}
        {session.isGenerating ? (
          <span className="text-lg font-medium text-on-surface-variant/60 tracking-wide block">
            Building your session…
          </span>
        ) : (
          <span className="text-4xl font-light tracking-tighter text-primary-container font-mono tabular-nums block">
            {formatTime(session.secondsLeft)}
          </span>
        )}

        {/* Return helper link style */}
        <span className="text-xs text-on-surface-variant/60 group-hover:text-primary transition-colors font-medium">
          Return →
        </span>
      </span>
      <span className="absolute bottom-0 left-0 right-0 h-1 bg-surface-container-highest group-hover:bg-primary transition-colors block" />
    </button>
  );
}
