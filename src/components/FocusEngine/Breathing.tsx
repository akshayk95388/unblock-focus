"use client";

import { useEffect, useState, useCallback } from "react";
import BreathingRing from "./BreathingRing";
import { useActiveSession } from "@/components/ActiveSessionContext";

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

  const { setSession, updateTimer } = useActiveSession();
  const totalSeconds = (durationMinutes || 0) * 60;

  useEffect(() => {
    setTechniqueId(localStorage.getItem("unblock-breathing-tech") || "box");
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

  // Handle complete (auto-called by BreathingRing when duration is reached)
  const handleRingComplete = useCallback((elapsedSecs: number) => {
    setFinalSeconds(elapsedSecs);
    setSessionPhase("complete");
  }, []);

  // Track elapsed for manual "End Session"
  useEffect(() => {
    if (sessionPhase !== "breathing") return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionPhase]);

  // ── Report breathing session to ActiveSessionContext ──
  useEffect(() => {
    if (sessionPhase === "breathing" && totalSeconds > 0) {
      setSession({
        type: "breathing",
        totalSeconds,
        secondsLeft: totalSeconds,
        sourceTab: "breathing",
      });
    } else if (sessionPhase === "complete") {
      setSession(null);
    }
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
          onClick={() => onComplete(elapsed)}
          className="px-6 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase text-outline hover:text-primary transition-all duration-500 hover:border-primary/20 backdrop-blur-sm border border-transparent outline-none cursor-pointer"
        >
          End Session
        </button>
      </div>
    </main>
  );
}
