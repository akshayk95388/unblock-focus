"use client";

import { useActiveSession } from "@/components/ActiveSessionContext";

interface SidebarSessionCardProps {
  currentTab: string;
  onStartFocusDirectly: () => void;
  onResumeSession: () => void;
}

/**
 * Dynamic right-sidebar card with three visual states:
 * 1. Idle — "25:00 Start focus session" button (original design)
 * 2. Active + viewing session tab — Flow State Visualizer (bobbing bars + %)
 * 3. Active + on different tab — Mini ticking timer with resume link
 */
export default function SidebarSessionCard({
  currentTab,
  onStartFocusDirectly,
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
      <button
        onClick={onStartFocusDirectly}
        className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-300 border border-outline-variant/10 w-full cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-30 group-hover:opacity-40 transition-opacity" />
        <div className="relative z-10">
          <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 group-hover:text-primary-container transition-colors">
            Focus Session
          </p>
          <div className="text-5xl font-light tracking-tighter text-on-surface mb-2 font-mono tabular-nums">
            25:00
          </div>
          <p className="text-on-surface-variant text-xs font-medium group-hover:text-on-surface transition-colors">
            Start focus session →
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-container-highest group-hover:bg-primary transition-colors" />
      </button>
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
      ? Math.round(
          ((session.totalSeconds - session.secondsLeft) / session.totalSeconds) *
            100
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
    <div className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden border border-outline-variant/10 w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-4 w-full">
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

        {/* Ticking countdown or generating state */}
        {session.isGenerating ? (
          <p className="text-lg font-medium text-on-surface-variant/60 tracking-wide">
            Building your session…
          </p>
        ) : (
          <div className="text-4xl font-light tracking-tighter text-primary-container font-mono tabular-nums">
            {formatTime(session.secondsLeft)}
          </div>
        )}

        {/* Resume link */}
        <button
          onClick={onResumeSession}
          className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors font-medium"
        >
          Resume full view →
        </button>
      </div>
    </div>
  );
}
