"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type SessionType = "guided" | "focus" | "breathing";

/**
 * Lightweight summary of the currently active session.
 * Published by MeditationTab / Breathing, consumed by SidebarSessionCard.
 *
 * This intentionally does NOT hold the full internal state of each session
 * component — that stays local. This only carries the minimum needed for
 * the sidebar visualizer and for the page-level "keep mounted" decision.
 */
export interface SessionSummary {
  type: SessionType;
  totalSeconds: number;
  secondsLeft: number;
  /** Which tab owns this session — used for "Return" navigation */
  sourceTab: "meditation" | "breathing";
  /** True during AI generation phase (no meaningful timer yet) */
  isGenerating?: boolean;
}

interface ActiveSessionContextValue {
  session: SessionSummary | null;
  /** Set or clear the active session */
  setSession: (session: SessionSummary | null) => void;
  /** Update only the secondsLeft field (called every second from timers) */
  updateTimer: (secondsLeft: number) => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextValue>({
  session: null,
  setSession: () => {},
  updateTimer: () => {},
});

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionSummary | null>(null);

  const setSession = useCallback((s: SessionSummary | null) => {
    setSessionState(s);
  }, []);

  const updateTimer = useCallback((secondsLeft: number) => {
    setSessionState((prev) => (prev ? { ...prev, secondsLeft } : null));
  }, []);

  return (
    <ActiveSessionContext.Provider value={{ session, setSession, updateTimer }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext);
}
