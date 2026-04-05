"use client";

import { useEffect, useState, useRef } from "react";

interface BreathingProps {
  onComplete: () => void;
}

export default function Breathing({ onComplete }: BreathingProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale">("inhale");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Countdown timer
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Breathing phase toggle every 4 seconds (8s cycle = 4 inhale + 4 exhale)
    breathIntervalRef.current = setInterval(() => {
      setBreathPhase((prev) => (prev === "inhale" ? "exhale" : "inhale"));
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${minutes}:${secs.toString().padStart(2, "0")}`;

  return (
    <main className="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Subtle Branding */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40 z-10">
        <span className="text-xs tracking-[0.3em] uppercase text-on-surface-variant">
          Unblock
        </span>
        <span className="text-[10px] tracking-[0.1em] text-outline">
          Sanctuary Mode
        </span>
      </div>

      {/* Atmospheric Depth Layers */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central Primary Glow (Sunset Glow) */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[600px] md:h-[600px] bg-primary-container rounded-full transition-all duration-[4000ms] ease-in-out ${
            breathPhase === "inhale"
              ? "scale-110 opacity-30 blur-[100px]"
              : "scale-75 opacity-15 blur-[60px]"
          }`}
          style={{ filter: breathPhase === "inhale" ? "blur(100px)" : "blur(60px)" }}
        />
        {/* Secondary Wash (Indigo Calm) */}
        <div className="absolute bottom-0 left-0 w-full h-[512px] bg-gradient-to-t from-secondary-container/10 to-transparent" />
      </div>

      {/* The Central Breathing Core */}
      <div className="relative flex flex-col items-center justify-center z-10">
        {/* Breathing Circle (Glassmorphism) */}
        <div
          className={`relative w-72 h-72 md:w-96 md:h-96 rounded-full flex items-center justify-center transition-transform duration-[4000ms] ease-in-out ${
            breathPhase === "inhale" ? "scale-110" : "scale-90"
          }`}
          style={{
            boxShadow: "0 0 80px rgba(255, 130, 60, 0.1)",
          }}
        >
          {/* Inner Glass Layer */}
          <div className="absolute inset-0 rounded-full bg-surface-variant/20 backdrop-blur-2xl border border-on-surface-variant/10" />

          {/* Inner Stroke Detail */}
          <div className="absolute inset-4 rounded-full border-[0.5px] border-primary/20" />

          {/* Display Countdown */}
          <div className="relative flex flex-col items-center">
            <span className="text-[10px] tracking-[0.2em] uppercase text-outline/60 mb-2">
              Time Remaining
            </span>
            <span className="text-6xl md:text-8xl font-thin tracking-tighter text-on-surface tabular-nums">
              {display}
            </span>
          </div>
        </div>

        {/* Synchronized Instructions */}
        <div className="mt-12 flex flex-col items-center h-20">
          <div
            className={`flex flex-col items-center transition-all duration-1000 ease-in-out ${
              breathPhase === "inhale"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            {breathPhase === "inhale" && (
              <>
                <h2 className="text-3xl md:text-5xl font-light tracking-tight text-primary">
                  Inhale...
                </h2>
                <p className="text-xs tracking-widest text-outline mt-2 uppercase">
                  Fill your lungs with focus
                </p>
              </>
            )}
          </div>
          <div
            className={`flex flex-col items-center transition-all duration-1000 ease-in-out absolute ${
              breathPhase === "exhale"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            {breathPhase === "exhale" && (
              <>
                <h2 className="text-3xl md:text-5xl font-light tracking-tight text-secondary">
                  Exhale...
                </h2>
                <p className="text-xs tracking-widest text-outline mt-2 uppercase">
                  Release all visual noise
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-16 flex flex-col items-center gap-6 z-10">
        <div className="flex items-center gap-12 text-on-surface-variant/40">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="text-[9px] tracking-widest uppercase">
              Deep Rhythm
            </span>
          </div>
          <div className="w-[1px] h-8 bg-outline-variant/20" />
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.143 17.082a24.248 24.248 0 0 0 5.714 0m-5.714 0a1.5 1.5 0 0 1 .386-1.237L12 13.174l2.671 2.671a1.5 1.5 0 0 1 .386 1.237m-5.714 0A1.503 1.503 0 0 1 8 18.5V21h8v-2.5a1.503 1.503 0 0 1-1.143-1.418"
              />
            </svg>
            <span className="text-[9px] tracking-widest uppercase">
              Zero Distraction
            </span>
          </div>
        </div>

        {/* Exit button (subtle) */}
        <button
          onClick={onComplete}
          className="px-6 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase text-outline hover:text-primary transition-all duration-500 ghost-border hover:border-primary/20 backdrop-blur-sm"
        >
          Skip
        </button>
      </div>

      {/* Phase metadata (desktop) */}
      <div className="hidden lg:flex absolute bottom-12 right-12 flex-col items-end opacity-20">
        <span className="text-[10px] tracking-tighter">
          Phase: Calibration
        </span>
        <span className="text-[10px] tracking-tighter">
          BPM: 6.0 (Optimal)
        </span>
      </div>
    </main>
  );
}
