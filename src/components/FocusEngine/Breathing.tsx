"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import BreathingRing from "./BreathingRing";
import { useActiveSession } from "@/components/ActiveSessionContext";
import {
  readBreathingSnapshot,
  writeBreathingSnapshot,
  clearBreathingSnapshot,
  createClientSessionId,
} from "@/lib/active-session-storage";

interface BreathingProps {
  onComplete: (durationSeconds: number) => void;
  durationMinutes?: number;
  zenActive?: boolean;
  onToggleZen?: () => void;
}

type SessionPhase = "ready" | "breathing" | "complete";
const READY_SECONDS = 3;

export default function Breathing({
  onComplete,
  durationMinutes,
  zenActive = false,
  onToggleZen,
}: BreathingProps) {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("ready");
  const [readyCount, setReadyCount] = useState(READY_SECONDS);
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [techniqueId, setTechniqueId] = useState<string>("box");
  const [elapsed, setElapsed] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | undefined>(undefined);

  const { setSession, updateTimer } = useActiveSession();
  const totalSeconds = (durationMinutes || 0) * 60;

  // Absolute timestamp the breathing phase started (wall-clock resume anchor).
  const breathingStartTimeRef = useRef<number>(0);
  const clientSessionIdRef = useRef<string>("");
  const restoreAttemptedRef = useRef(false);

  useEffect(() => {
    setTechniqueId(localStorage.getItem("unblock-breathing-tech") || "box");
  }, []);

  // ── Restore an in-progress breathing session after a refresh (once) ──
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const snap = readBreathingSnapshot();
    if (!snap) return;

    clientSessionIdRef.current = snap.clientSessionId;
    setTechniqueId(snap.techniqueId);

    const total = snap.durationMinutes * 60;
    const elapsedSecs = Math.max(0, Math.round((Date.now() - snap.breathingStartTime) / 1000));

    if (elapsedSecs >= total) {
      // Finished while the user was away → show completion, then log once.
      breathingStartTimeRef.current = snap.breathingStartTime;
      setFinalSeconds(total);
      setSessionPhase("complete");
      return;
    }

    breathingStartTimeRef.current = snap.breathingStartTime;
    setSessionStartTime(snap.breathingStartTime);
    setElapsed(elapsedSecs);
    setSessionPhase("breathing");
  }, []);

  // Ready countdown
  useEffect(() => {
    if (sessionPhase !== "ready") return;
    const interval = setInterval(() => {
      setReadyCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSessionPhase("breathing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionPhase]);

  // Capture the start time when a fresh breathing phase begins (not a restore).
  useEffect(() => {
    if (sessionPhase === "breathing" && breathingStartTimeRef.current === 0) {
      const now = Date.now();
      breathingStartTimeRef.current = now;
      setSessionStartTime(now);
    }
  }, [sessionPhase]);

  // Handle complete (auto-called by BreathingRing when duration is reached)
  const handleRingComplete = useCallback((elapsedSecs: number) => {
    setFinalSeconds(elapsedSecs);
    setSessionPhase("complete");
  }, []);

  // Track elapsed for manual "End Session" — anchored to the (possibly restored) start.
  useEffect(() => {
    if (sessionPhase !== "breathing") return;
    const tick = () => {
      const base = breathingStartTimeRef.current || Date.now();
      setElapsed(Math.max(0, Math.round((Date.now() - base) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionPhase]);

  // ── Persist / clear the active breathing snapshot ──
  useEffect(() => {
    if (sessionPhase === "breathing" && totalSeconds > 0 && breathingStartTimeRef.current > 0) {
      if (!clientSessionIdRef.current) {
        clientSessionIdRef.current = createClientSessionId();
      }
      writeBreathingSnapshot({
        clientSessionId: clientSessionIdRef.current,
        logged: false,
        techniqueId,
        durationMinutes: durationMinutes || 0,
        breathingStartTime: breathingStartTimeRef.current,
      });
    } else if (sessionPhase === "complete") {
      clearBreathingSnapshot();
    }
  }, [sessionPhase, techniqueId, durationMinutes, totalSeconds]);

  // ── Report breathing session to ActiveSessionContext ──
  useEffect(() => {
    if (sessionPhase === "breathing" && totalSeconds > 0) {
      setSession({
        type: "breathing",
        totalSeconds,
        secondsLeft: Math.max(0, totalSeconds - elapsed),
        sourceTab: "breathing",
      });
    } else if (sessionPhase === "complete") {
      setSession(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPhase, totalSeconds, setSession]);

  // ── Sync elapsed time to context for sidebar mini-timer ──
  useEffect(() => {
    if (sessionPhase === "breathing" && totalSeconds > 0) {
      updateTimer(Math.max(0, totalSeconds - elapsed));
    }
  }, [elapsed, sessionPhase, totalSeconds, updateTimer]);

  // Auto-dismiss on complete
  useEffect(() => {
    if (sessionPhase === "complete") {
      const waitTimer = setTimeout(() => {
        onComplete(finalSeconds);
      }, 3000);
      return () => clearTimeout(waitTimer);
    }
  }, [sessionPhase, finalSeconds, onComplete]);

  // Manual exit — clear the snapshot so a refresh won't resurrect it.
  const handleEndSession = useCallback(() => {
    clearBreathingSnapshot();
    onComplete(elapsed);
  }, [elapsed, onComplete]);

  return (
    <main className="relative w-full min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center overflow-hidden select-none bg-surface-container-low/50 rounded-2xl border border-outline-variant/10 py-12 px-6">
      {/* Visual ring area with absolute centered overlays */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center">
        {/* Ready state overlay */}
        {sessionPhase === "ready" && (
          <div className="absolute z-20 flex items-center justify-center">
            <div className="text-6xl md:text-7xl font-light tracking-tight text-white/90 leading-none font-mono">
              {readyCount}
            </div>
          </div>
        )}

        {/* Complete state overlay */}
        {sessionPhase === "complete" && (
          <div className="absolute z-20 flex items-center justify-center">
            <h2 className="text-3xl md:text-4xl font-light tracking-widest text-white/90 animate-in fade-in zoom-in duration-1000 text-center uppercase">
              Nice work
            </h2>
          </div>
        )}

        {/* Breathing ring — always relative in flow */}
        <div className={`w-full flex flex-col items-center transition-opacity duration-1000 ${
          sessionPhase === "ready" || sessionPhase === "complete" ? "opacity-30 pointer-events-none" : ""
        }`}>
          <BreathingRing
            techniqueId={techniqueId}
            active={sessionPhase === "breathing"}
            durationMinutes={durationMinutes}
            sessionStartTime={sessionStartTime}
            onComplete={handleRingComplete}
            size="full"
            showTimer={true}
            enableAudio={true}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-10 z-20 flex items-center justify-center gap-4">
        {onToggleZen && (
          <button
            onClick={onToggleZen}
            className="px-5 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase text-outline hover:text-white transition-all duration-500 hover:bg-white/5 border border-outline-variant/20 hover:border-outline-variant/40 outline-none cursor-pointer font-bold"
          >
            {zenActive ? "🧘 Exit Zen Mode" : "🧘 Go Zen Mode"}
          </button>
        )}
        <button
          onClick={handleEndSession}
          className="px-6 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase text-outline hover:text-primary transition-all duration-500 hover:border-primary/20 backdrop-blur-sm border border-transparent outline-none cursor-pointer"
        >
          End Session
        </button>
      </div>
    </main>
  );
}
