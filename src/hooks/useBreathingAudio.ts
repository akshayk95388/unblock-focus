"use client";

import { useEffect, useRef } from "react";
import { BreathPhase } from "../lib/breathingConfig";

export function useBreathingAudio(
  sessionPhase: "ready" | "breathing" | "complete",
  currentPhaseDef: BreathPhase | null,
  isMoving: boolean
) {
  const oceanCtxRef = useRef<AudioContext | null>(null);
  const oceanGainRef = useRef<GainNode | null>(null);
  const oceanSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    if (sessionPhase !== "breathing") return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      oceanCtxRef.current = ctx;

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

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      filter.Q.value = 1;
      filterRef.current = filter;

      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) pannerRef.current = panner;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      oceanGainRef.current = gain;

      source.connect(filter);
      
      if (panner) {
        filter.connect(panner);
        panner.connect(gain);
      } else {
        filter.connect(gain);
      }
      
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio blocked or not supported
    }

    return () => {
      try {
        oceanSourceRef.current?.stop();
      } catch { /* ignored */ }
      oceanCtxRef.current?.close();
      oceanCtxRef.current = null;
      oceanGainRef.current = null;
      oceanSourceRef.current = null;
      pannerRef.current = null;
      filterRef.current = null;
    };
  }, [sessionPhase]);

  // Handle phase changes
  useEffect(() => {
    if (!oceanGainRef.current || !oceanCtxRef.current || !currentPhaseDef) return;
    const gain = oceanGainRef.current;
    const ctx = oceanCtxRef.current;
    const now = ctx.currentTime;

    if (pannerRef.current) {
        const targetPan = currentPhaseDef.pan || 0;
        pannerRef.current.pan.linearRampToValueAtTime(targetPan, now + 0.5);
    }

    if (filterRef.current) {
       filterRef.current.frequency.linearRampToValueAtTime(
           currentPhaseDef.pitch === "high" ? 600 : 300, 
           now + 0.5
       );
    }

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    
    if (currentPhaseDef.type === "quick-inhale") {
        gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    } else {
        gain.gain.linearRampToValueAtTime(isMoving ? 0.08 : 0, now + 0.6);
    }
  }, [currentPhaseDef, isMoving]);
}
