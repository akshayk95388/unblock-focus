"use client";

import { useEffect, useState, useRef } from "react";
import { BREATHING_TECHNIQUES, BreathPhase } from "@/lib/breathingConfig";
import { useBreathingAudio } from "@/hooks/useBreathingAudio";

interface BreathingProps {
  onComplete: (durationSeconds: number) => void;
  durationMinutes?: number;
}

type SessionPhase = "ready" | "breathing" | "complete";
const READY_SECONDS = 3;

export default function Breathing({ onComplete, durationMinutes }: BreathingProps) {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("ready");
  const [readyCount, setReadyCount] = useState(READY_SECONDS);
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [techniqueId, setTechniqueId] = useState<string>("box");

  useEffect(() => {
    setTechniqueId(localStorage.getItem("unblock-breathing-tech") || "box");
  }, []);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  
  const [pointerAngle, setPointerAngle] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const animFrameRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(0);
  const phaseStartRef = useRef<number>(0);
  const manualHoldTimeAccRef = useRef<number>(0);

  const technique = BREATHING_TECHNIQUES[techniqueId] || BREATHING_TECHNIQUES["box"];
  const phases = technique.phases;
  const activePhase = phases[currentPhaseIndex] || phases[0];

  const isMoving = activePhase?.type === "inhale" || activePhase?.type === "exhale" || activePhase?.type === "quick-inhale";
  
  useBreathingAudio(sessionPhase, activePhase, isMoving);

  // Ready countdown
  useEffect(() => {
    if (sessionPhase !== "ready") return;
    const interval = setInterval(() => {
      setReadyCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSessionPhase("breathing");
          sessionStartRef.current = Date.now();
          phaseStartRef.current = Date.now();
          manualHoldTimeAccRef.current = 0;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionPhase]);

  // Handle Complete Phase
  useEffect(() => {
    if (sessionPhase === "complete") {
      const waitTimer = setTimeout(() => {
         onComplete(finalSeconds);
      }, 3000);
      return () => clearTimeout(waitTimer);
    }
  }, [sessionPhase, finalSeconds, onComplete]);

  // Phase Progression Scheduler
  useEffect(() => {
    if (sessionPhase !== "breathing") return;
    const ms = (activePhase.durationSeconds || 0) * 1000;
    const timer = setTimeout(() => {
      let nextPhase = currentPhaseIndex + 1;
      
      // If we are completing a full technique loop, check if session is officially over
      if (nextPhase >= phases.length) {
         const now = Date.now();
         const cycleTime = phases.reduce((acc: any, p: any) => acc + (p.durationSeconds || 0) * 1000, 0);
         const totalTimeTarget = durationMinutes ? durationMinutes * 60 * 1000 : cycleTime * 4;
         const elapsed = now - sessionStartRef.current - manualHoldTimeAccRef.current;
         
         if (elapsed >= totalTimeTarget) {
             setFinalSeconds(Math.round(elapsed / 1000));
             setSessionPhase("complete");
             return;
         }
         nextPhase = 0; // Wrap around for next cycle
      }

      phaseStartRef.current = Date.now();
      setCurrentPhaseIndex(nextPhase);
    }, ms);

    return () => clearTimeout(timer);
  }, [currentPhaseIndex, sessionPhase, activePhase, phases.length]);

  // Main UI Animation Tick & Global Timeout logic
  useEffect(() => {
    if (sessionPhase !== "breathing") return;

    const tick = () => {
      const now = Date.now();
      
      let elapsed = now - sessionStartRef.current - manualHoldTimeAccRef.current;
      
      const cycleTime = phases.reduce((acc, p) => acc + (p.durationSeconds || 0) * 1000, 0);
      const totalTimeTarget = durationMinutes ? durationMinutes * 60 * 1000 : cycleTime * 4;

      setTotalElapsed(elapsed);

      // Render the pointer angle interpolating from previous to current target
      const ms = (activePhase.durationSeconds || 0) * 1000;
         const phaseElapsed = now - phaseStartRef.current;
         const phaseProgress = Math.min(phaseElapsed / (ms || 1), 1);
         
         let startAngle = 0;
         if (currentPhaseIndex > 0) {
             startAngle = phases[currentPhaseIndex - 1].targetAngle;
         } else {
             startAngle = phases[phases.length - 1].targetAngle;
         }
         
         let endAngle = activePhase.targetAngle;
         if (startAngle === 360 && endAngle !== 360 && endAngle > 0 && endAngle < 360) {
            startAngle = 0; // Prevent backward spinning
         }

         setPointerAngle(startAngle + (endAngle - startAngle) * phaseProgress)

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [sessionPhase, currentPhaseIndex, activePhase, phases, durationMinutes, onComplete]);

  const totalCycleTime = phases.reduce((acc, p) => acc + (p.durationSeconds || 0) * 1000, 0);
  const totalTarget = durationMinutes ? durationMinutes * 60 * 1000 : totalCycleTime * 4;
  const totalProgress = Math.max(0, Math.min(1, totalTarget > 0 ? totalElapsed / totalTarget : 0));
  
  const remainingMs = Math.max(0, totalTarget - totalElapsed);
  const remainingMins = Math.floor(remainingMs / 60000);
  const remainingSecs = Math.floor((remainingMs % 60000) / 1000);

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

  return (
    <main className="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden select-none bg-background">
      
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[600px] md:h-[600px] bg-primary-container rounded-full ease-in-out transition-transform ${
            activePhase.isExpanded ? "scale-110 opacity-30" : "scale-75 opacity-15"
          }`}
          style={{ 
            filter: activePhase.isExpanded ? "blur(100px)" : "blur(60px)",
            transitionDuration: `${(activePhase.durationSeconds || 1) * 1000}ms`
          }}
        />
      </div>

      <div className="relative flex flex-col items-center justify-center z-10 w-full">
        <div 
          className={`relative flex items-center justify-center rounded-full w-[300px] h-[300px] md:w-[420px] md:h-[420px] ease-in-out transition-transform ${
            sessionPhase === "breathing" && activePhase.isExpanded
              ? "scale-110" : "scale-90"
          }`}
          style={{ 
             boxShadow: "0 0 80px rgba(255, 130, 60, 0.1)",
             transitionDuration: `${(activePhase.durationSeconds || 1) * 1000}ms`
          }}
        >
          <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "rgba(70, 45, 35, 0.3)" }} />

          <svg className="absolute w-full h-full overflow-visible" viewBox="0 0 100 100">
            <circle cx={svgCenter} cy={svgCenter} r={ringRadius} fill="transparent" stroke={ringStroke} strokeWidth="0.3" />
            <circle cx={dot12X} cy={dot12Y} r="1.2" fill={ringStroke} />
            <circle cx={dot6X} cy={dot6Y} r="1.2" fill={ringStroke} />

            {sessionPhase === "breathing" && (
              <circle
                cx={pointerX} cy={pointerY} r="1.8" fill="white"
                style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.8))" }}
              />
            )}
          </svg>

          <div className="relative flex flex-col items-center justify-center text-center z-10 w-full">
            {sessionPhase === "ready" ? (
              <div className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white/90 leading-none mb-2">
                {readyCount}
              </div>
            ) : sessionPhase === "complete" ? (
              <div className="flex flex-col items-center justify-center h-full">
               <h2 className="text-3xl md:text-4xl font-light tracking-widest text-white/90 animate-in fade-in zoom-in duration-1000 text-center uppercase">
                 Nice work
               </h2>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white/90 animate-in fade-in duration-700 w-64 text-center">
                  {activePhase?.instruction}
                </h2>
              </div>
            )}
          </div>
        </div>

        <div className={`mt-20 md:mt-24 w-48 flex flex-col items-center gap-4 transition-opacity duration-1000 ${(sessionPhase === "ready" || sessionPhase === "complete") ? "opacity-0" : "opacity-100"}`}>
          <div className="text-[10px] font-mono tracking-[0.2em] text-on-surface-variant/50 uppercase">
            {remainingMins < 10 ? `0${remainingMins}` : remainingMins}:{remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs}
          </div>
          <div className="h-[4px] w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${totalProgress * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 z-20">
        <button
          onClick={() => onComplete(Math.round(totalElapsed / 1000))}
          className="px-6 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase text-outline hover:text-primary transition-all duration-500 hover:border-primary/20 backdrop-blur-sm border border-transparent outline-none"
        >
          End Session
        </button>
      </div>
    </main>
  );
}
