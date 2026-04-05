"use client";

import { useEffect, useState, useRef } from "react";

interface BreathingProps {
  onComplete: () => void;
}

type BreathPhase = "inhale" | "hold1" | "exhale" | "hold2";
type SessionPhase = "ready" | "breathing";

const PHASE_DURATION = 4000; // 4 seconds per phase
const TOTAL_CYCLES = 4;
const READY_SECONDS = 3;

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: "Breathe In",
  hold1: "Hold",
  exhale: "Breathe Out",
  hold2: "Hold",
};

const PHASE_ORDER: BreathPhase[] = ["inhale", "hold1", "exhale", "hold2"];

export default function Breathing({ onComplete }: BreathingProps) {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("ready");
  const [readyCount, setReadyCount] = useState(READY_SECONDS);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("inhale");
  const [pointerAngle, setPointerAngle] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const oceanCtxRef = useRef<AudioContext | null>(null);
  const oceanGainRef = useRef<GainNode | null>(null);
  const oceanSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const animFrameRef = useRef<number>(0);
  const breathingStartRef = useRef<number>(0);



  // --- Ocean wave sound (procedural, plays during inhale/exhale, mutes during hold) ---
  useEffect(() => {
    if (sessionPhase !== "breathing") return;

    try {
      const ctx = new AudioContext();
      oceanCtxRef.current = ctx;

      // Create brown noise buffer
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      oceanSourceRef.current = source;

      // Lowpass filter for ocean texture
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      filter.Q.value = 1;

      // Gain node — starts at 0
      const gain = ctx.createGain();
      gain.gain.value = 0;
      oceanGainRef.current = gain;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Web Audio not supported
    }

    return () => {
      try {
        oceanSourceRef.current?.stop();
      } catch { /* already stopped */ }
      oceanCtxRef.current?.close();
      oceanCtxRef.current = null;
      oceanGainRef.current = null;
      oceanSourceRef.current = null;
    };
  }, [sessionPhase]);

  // --- Fade ocean sound in/out based on breath phase ---
  useEffect(() => {
    if (!oceanGainRef.current || !oceanCtxRef.current) return;
    const gain = oceanGainRef.current;
    const ctx = oceanCtxRef.current;
    const now = ctx.currentTime;

    const isMoving = breathPhase === "inhale" || breathPhase === "exhale";
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(isMoving ? 0.08 : 0, now + 0.6);
  }, [breathPhase]);

  // --- Ready countdown ---
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

  // --- Breathing animation loop ---
  useEffect(() => {
    if (sessionPhase !== "breathing") return;

    breathingStartRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - breathingStartRef.current;
      const cycleTime = PHASE_DURATION * 4;
      const totalTime = cycleTime * TOTAL_CYCLES;

      if (elapsed >= totalTime) {
        cancelAnimationFrame(animFrameRef.current);
        setTimeout(() => onCompleteRef.current(), 0);
        return;
      }

      setTotalElapsed(elapsed);

      const cycleElapsed = elapsed % cycleTime;
      const phaseIndex = Math.min(Math.floor(cycleElapsed / PHASE_DURATION), 3);
      const phaseElapsed = cycleElapsed - phaseIndex * PHASE_DURATION;
      const phaseProgress = Math.min(phaseElapsed / PHASE_DURATION, 1);

      setBreathPhase(PHASE_ORDER[phaseIndex]);

      let angle = 0;
      switch (phaseIndex) {
        case 0: angle = phaseProgress * 180; break;
        case 1: angle = 180; break;
        case 2: angle = 180 + phaseProgress * 180; break;
        case 3: angle = 360; break;
      }

      setPointerAngle(angle);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [sessionPhase]);

  const totalProgress = totalElapsed / (PHASE_DURATION * 4 * TOTAL_CYCLES);

  // SVG config — matches Timer's viewBox="0 0 100 100" approach
  const svgCenter = 50;
  const ringRadius = 49.85;

  // Pointer position from angle
  const pointerRad = (pointerAngle - 90) * (Math.PI / 180);
  const pointerX = svgCenter + ringRadius * Math.cos(pointerRad);
  const pointerY = svgCenter + ringRadius * Math.sin(pointerRad);

  // Marker dot positions (12 and 6 o'clock)
  const dot12X = svgCenter;
  const dot12Y = svgCenter - ringRadius;
  const dot6X = svgCenter;
  const dot6Y = svgCenter + ringRadius;

  const ringStroke = "rgba(255, 130, 60, 0.2)"; // border-primary/20 match

  return (
    <main className="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden select-none bg-background">
      {/* Warm amber glow behind circle */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[600px] md:h-[600px] bg-primary-container rounded-full transition-all duration-[4000ms] ease-in-out ${
            (breathPhase === "inhale" || breathPhase === "hold1")
              ? "scale-110 opacity-30"
              : "scale-75 opacity-15"
          }`}
          style={{ filter: (breathPhase === "inhale" || breathPhase === "hold1") ? "blur(100px)" : "blur(60px)" }}
        />
      </div>

      {/* The Central Breathing Core */}
      <div className="relative flex flex-col items-center justify-center z-10">
        {/* Outer ring container — breathes with scale animation */}
        <div 
          className={`relative flex items-center justify-center rounded-full w-[300px] h-[300px] md:w-[420px] md:h-[420px] transition-transform duration-[4000ms] ease-in-out ${
            sessionPhase === "breathing"
              ? breathPhase === "inhale" || breathPhase === "hold1"
                ? "scale-110"
                : "scale-90"
              : "scale-90"
          }`}
          style={{ boxShadow: "0 0 80px rgba(255, 130, 60, 0.1)" }}
        >
          {/* Solid Warm Background Fill & Single Outer Boundary */}
          <div 
            className="absolute inset-0 rounded-full" 
            style={{ backgroundColor: "rgba(70, 45, 35, 0.3)" }}
          />

          {/* SVG Ring + dots + pointer — overlaid on the glass circle edge */}
          <svg className="absolute w-full h-full overflow-visible" viewBox="0 0 100 100">
            {/* The boundary ring — sits right on the glass circle edge */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={ringRadius}
              fill="transparent"
              stroke={ringStroke}
              strokeWidth="0.3"
            />

            {/* Marker dot at 12 o'clock */}
            <circle cx={dot12X} cy={dot12Y} r="1.2" fill={ringStroke} />

            {/* Marker dot at 6 o'clock */}
            <circle cx={dot6X} cy={dot6Y} r="1.2" fill={ringStroke} />

            {/* Moving pointer — white with glow */}
            {sessionPhase === "breathing" && (
              <circle
                cx={pointerX}
                cy={pointerY}
                r="1.8"
                fill="white"
                style={{
                  filter: "drop-shadow(0 0 3px rgba(255,255,255,0.8))",
                }}
              />
            )}
          </svg>

          {/* Central Text */}
          <div className="relative flex flex-col items-center justify-center text-center z-10">
            {sessionPhase === "ready" ? (
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white/90 leading-none mb-2">
                  {readyCount}
                </div>
              </div>
            ) : (
              <h2
                key={breathPhase}
                className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white/90 animate-in fade-in duration-700"
              >
                {PHASE_LABELS[breathPhase]}
              </h2>
            )}
          </div>
        </div>

        {/* Progress bar (no label) */}
        <div
          className={`mt-20 md:mt-24 transition-opacity duration-1000 ${
            sessionPhase === "ready" ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="w-48 h-[4px] bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full"
              style={{ width: `${totalProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Skip button */}
      <div className="absolute bottom-16 z-10">
        <button
          onClick={onComplete}
          className="px-6 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase text-outline hover:text-primary transition-all duration-500 ghost-border hover:border-primary/20 backdrop-blur-sm"
        >
          Skip
        </button>
      </div>
    </main>
  );
}
