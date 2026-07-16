"use client";

import { useEffect, useState, useRef } from "react";
import { BREATHING_TECHNIQUES } from "@/lib/breathingConfig";
import { useBreathingAudio } from "@/hooks/useBreathingAudio";

/**
 * BreathingRing — Reusable breathing visual with ring, pointer dot, glow, and audio.
 *
 * Used by:
 * - Standalone Breathing screen (Quick Relief)
 * - GeneratingBreathingGuide (while AI builds the reset)
 *
 * Props:
 * - techniqueId: which breathing technique to use (e.g. "relaxing_478", "box")
 * - active: whether the breathing is actively running
 * - durationMinutes: optional fixed duration (omit for indefinite looping)
 * - onComplete: called when duration is reached (only if durationMinutes is set)
 * - size: "full" (standalone screen) or "compact" (inline within another screen)
 * - showTimer: whether to show the countdown + progress bar
 * - enableAudio: whether to play breathing audio
 */

interface BreathingRingProps {
  techniqueId?: string;
  active: boolean;
  durationMinutes?: number;
  onComplete?: (elapsedSeconds: number) => void;
  /** When true, finish the current cycle then call onComplete instead of looping */
  finishAfterCycle?: boolean;
  size?: "full" | "compact";
  showTimer?: boolean;
  enableAudio?: boolean;
}

export default function BreathingRing({
  techniqueId = "box",
  active,
  durationMinutes,
  onComplete,
  finishAfterCycle = false,
  size = "full",
  showTimer = true,
  enableAudio = true,
}: BreathingRingProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [pointerAngle, setPointerAngle] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const sessionStartRef = useRef<number>(0);

  const technique = BREATHING_TECHNIQUES[techniqueId] || BREATHING_TECHNIQUES["box"];
  const phases = technique.phases;
  const activePhase = phases[currentPhaseIndex] || phases[0];

  const isMoving =
    activePhase?.type === "inhale" ||
    activePhase?.type === "exhale" ||
    activePhase?.type === "quick-inhale";

  // Session phase for audio hook compatibility
  const sessionPhase: "ready" | "breathing" | "complete" = active ? "breathing" : "ready";

  // Audio
  useBreathingAudio(
    enableAudio ? sessionPhase : "ready",
    enableAudio ? activePhase : null,
    enableAudio ? isMoving : false
  );

  // Pre-compute cumulative phase end times so we can find current phase by clock position
  const phaseDurationsMs = phases.map((p) => (p.durationSeconds || 0) * 1000);
  const phaseCumulativeMs = phaseDurationsMs.reduce<number[]>((acc, ms, i) => {
    acc.push((acc[i - 1] ?? 0) + ms);
    return acc;
  }, []);
  const cycleMs = phaseCumulativeMs[phaseCumulativeMs.length - 1] || 1;

  const completedRef = useRef(false);
  // Tracks the absolute timestamp at which the session should end when finishAfterCycle is set.
  // Captured once at the moment finishAfterCycle transitions to true.
  const finishAtRef = useRef<number>(0);

  useEffect(() => {
    if (active) {
      sessionStartRef.current = Date.now();
      setCurrentPhaseIndex(0);
      setPointerAngle(0);
      setTotalElapsed(0);
      completedRef.current = false;
      finishAtRef.current = 0;
    }
  }, [active]);

  // When finishAfterCycle transitions to true, capture the next cycle boundary
  useEffect(() => {
    if (finishAfterCycle && active && finishAtRef.current === 0) {
      const elapsed = Date.now() - sessionStartRef.current;
      // End of the current cycle
      const nextBoundary = (Math.floor(elapsed / cycleMs) + 1) * cycleMs;
      finishAtRef.current = sessionStartRef.current + nextBoundary;
    }
  }, [finishAfterCycle, active, cycleMs]);

  // Single clock-driven interval — derives phase + progress + elapsed from Date.now().
  // Replaces both the setTimeout phase chain and the requestAnimationFrame loop.
  // Accurate in background/minimized tabs because all calculations use wall-clock time.
  useEffect(() => {
    if (!active) return;

    const tick = () => {
      if (completedRef.current) return;
      const now = Date.now();
      const totalElapsedMs = now - sessionStartRef.current;
      setTotalElapsed(totalElapsedMs);

      // Check if session duration has been reached
      if (durationMinutes) {
        const targetMs = durationMinutes * 60 * 1000;
        if (totalElapsedMs >= targetMs) {
          completedRef.current = true;
          onComplete?.(Math.round(totalElapsedMs / 1000));
          return;
        }
      }

      // Check if finishAfterCycle was triggered and we've reached the captured boundary
      if (finishAtRef.current > 0 && now >= finishAtRef.current) {
        completedRef.current = true;
        onComplete?.(Math.round(totalElapsedMs / 1000));
        return;
      }

      // Determine position within the current cycle
      const positionInCycle = totalElapsedMs % cycleMs;

      // Find which phase we are currently in
      let phaseIdx = phaseCumulativeMs.findIndex((cumMs) => positionInCycle < cumMs);
      if (phaseIdx < 0) phaseIdx = phases.length - 1;

      const phaseStartMs = phaseIdx === 0 ? 0 : phaseCumulativeMs[phaseIdx - 1];
      const phaseElapsedMs = positionInCycle - phaseStartMs;
      const phaseDurationMs = phaseDurationsMs[phaseIdx] || 1;
      const phaseProgress = Math.min(phaseElapsedMs / phaseDurationMs, 1);

      // Update current phase (triggers instruction text / audio updates)
      setCurrentPhaseIndex(phaseIdx);

      // Interpolate pointer angle between previous phase target and current phase target
      const prevAngle = phaseIdx === 0
        ? phases[phases.length - 1].targetAngle
        : phases[phaseIdx - 1].targetAngle;
      let startAngle = prevAngle;
      const endAngle = phases[phaseIdx].targetAngle;
      if (startAngle === 360 && endAngle !== 360 && endAngle > 0 && endAngle < 360) {
        startAngle = 0;
      }
      setPointerAngle(startAngle + (endAngle - startAngle) * phaseProgress);
    };

    tick(); // Immediate tick so UI is correct when returning from a background tab
    const interval = setInterval(tick, 200); // 200ms is smooth enough for visual updates

    // Snap immediately when user returns to the tab
    const handleVisibility = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, durationMinutes]);

  // Computed values
  const cycleTime = phases.reduce((acc, p) => acc + (p.durationSeconds || 0) * 1000, 0);
  const totalTarget = durationMinutes ? durationMinutes * 60 * 1000 : cycleTime * 4;
  const totalProgress = Math.max(0, Math.min(1, totalTarget > 0 ? totalElapsed / totalTarget : 0));

  const remainingMs = Math.max(0, totalTarget - totalElapsed);
  const remainingMins = Math.floor(remainingMs / 60000);
  const remainingSecs = Math.floor((remainingMs % 60000) / 1000);

  // SVG coords
  const svgCenter = 50;
  const ringRadius = 49.85;
  const pointerRad = (pointerAngle - 90) * (Math.PI / 180);
  const pointerX = svgCenter + ringRadius * Math.cos(pointerRad);
  const pointerY = svgCenter + ringRadius * Math.sin(pointerRad);
  const dot12X = svgCenter;
  const dot12Y = svgCenter - ringRadius;
  const dot6X = svgCenter;
  const dot6Y = svgCenter + ringRadius;
  const ringStroke = "rgba(255, 130, 60, 0.2)";

  const isCompact = size === "compact";
  const ringSize = isCompact
    ? "w-[200px] h-[200px] md:w-[260px] md:h-[260px]"
    : "w-[300px] h-[300px] md:w-[420px] md:h-[420px]";
  const textSize = isCompact
    ? "text-2xl md:text-3xl"
    : "text-4xl md:text-5xl";
  const glowSize = isCompact
    ? "w-[300px] h-[300px] md:w-[400px] md:h-[400px]"
    : "w-[500px] h-[500px] md:w-[600px] md:h-[600px]";

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div
          className={`absolute ${glowSize} bg-primary-container rounded-full ease-in-out transition-transform ${
            activePhase.isExpanded ? "scale-110 opacity-30" : "scale-75 opacity-15"
          }`}
          style={{
            filter: activePhase.isExpanded ? "blur(100px)" : "blur(60px)",
            transitionDuration: `${(activePhase.durationSeconds || 1) * 1000}ms`,
          }}
        />
      </div>

      {/* Ring + pointer */}
      <div
        className={`relative flex items-center justify-center rounded-full ${ringSize} ease-in-out transition-transform z-10 ${
          active && activePhase.isExpanded ? "scale-110" : "scale-90"
        }`}
        style={{
          boxShadow: "0 0 80px rgba(255, 130, 60, 0.1)",
          transitionDuration: `${(activePhase.durationSeconds || 1) * 1000}ms`,
        }}
      >
        <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "rgba(70, 45, 35, 0.3)" }} />

        <svg className="absolute w-full h-full overflow-visible" viewBox="0 0 100 100">
          <circle cx={svgCenter} cy={svgCenter} r={ringRadius} fill="transparent" stroke={ringStroke} strokeWidth="0.3" />
          <circle cx={dot12X} cy={dot12Y} r="1.2" fill={ringStroke} />
          <circle cx={dot6X} cy={dot6Y} r="1.2" fill={ringStroke} />

          {active && (
            <circle
              cx={pointerX}
              cy={pointerY}
              r="1.8"
              fill="white"
              style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.8))" }}
            />
          )}
        </svg>

        {/* Center text */}
        <div className="relative flex flex-col items-center justify-center text-center z-10 w-full">
          {active ? (
            <h2 className={`${textSize} font-light tracking-tight text-white/90 animate-in fade-in duration-700 w-64 text-center`}>
              {activePhase?.instruction}
            </h2>
          ) : (
            <div className={`${textSize} font-light tracking-tight text-white/40`}>
              ···
            </div>
          )}
        </div>
      </div>

      {/* Timer + progress (optional) */}
      {showTimer && active && (
        <div className={`${isCompact ? "mt-10 md:mt-12" : "mt-20 md:mt-24"} w-48 flex flex-col items-center gap-4 transition-opacity duration-1000`}>
          <div className="text-[10px] font-mono tracking-[0.2em] text-on-surface-variant/50 uppercase">
            {remainingMins < 10 ? `0${remainingMins}` : remainingMins}:
            {remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs}
          </div>
          <div className="h-[4px] w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${totalProgress * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
