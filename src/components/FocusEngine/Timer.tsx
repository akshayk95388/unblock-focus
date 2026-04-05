"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface TimerProps {
  intentText: string;
  durationSeconds: number;
  onComplete: (actualSeconds: number) => void;
  onQuit: (elapsedSeconds: number) => void;
}

export default function Timer({
  intentText,
  durationSeconds,
  onComplete,
  onQuit,
}: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [showQuitTrap, setShowQuitTrap] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const originalTitleRef = useRef<string>("");
  const completedRef = useRef(false);

  // Format time display
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // Calculate progress (0 to 1)
  const progress = 1 - secondsLeft / durationSeconds;

  // SVG ring calculation
  const ringRadius = 48; // percentage
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference * (1 - progress);

  // Mount animation
  useEffect(() => {
    setMounted(true);
    originalTitleRef.current = document.title;
    startTimeRef.current = Date.now();
  }, []);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          // Defer to avoid "Cannot update a component while rendering" warning
          if (!completedRef.current) {
            completedRef.current = true;
            const elapsed = Math.round(
              (Date.now() - startTimeRef.current) / 1000
            );
            setTimeout(() => onComplete(elapsed), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onComplete]);

  // Update tab title
  useEffect(() => {
    document.title = `(${display}) Focus — Unblock`;
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [display]);

  // Audio management
  const toggleAudio = useCallback(() => {
    if (!audioRef.current) {
      // Use a brown noise generator via Web Audio API
      try {
        const ctx =
          (window as unknown as { __unblockAudioCtx?: AudioContext })
            .__unblockAudioCtx || new AudioContext();

        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate brown noise
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5; // Amplify
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Create a gain node for volume control
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.3;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Fade in
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);

        source.start();

        // Store a fake audio element reference for toggling
        const fakeAudio = new Audio();
        (fakeAudio as unknown as { _source: AudioBufferSourceNode })._source =
          source;
        (fakeAudio as unknown as { _gain: GainNode })._gain = gainNode;
        (fakeAudio as unknown as { _ctx: AudioContext })._ctx = ctx;
        audioRef.current = fakeAudio;

        setIsAudioPlaying(true);
      } catch (e) {
        console.warn("Audio failed:", e);
      }
    } else {
      const audio = audioRef.current as unknown as {
        _source: AudioBufferSourceNode;
        _gain: GainNode;
        _ctx: AudioContext;
      };

      if (isAudioPlaying) {
        // Fade out and stop
        audio._gain.gain.linearRampToValueAtTime(
          0,
          audio._ctx.currentTime + 0.5
        );
        setTimeout(() => {
          try {
            audio._source.stop();
          } catch {
            /* already stopped */
          }
          audioRef.current = null;
        }, 600);
        setIsAudioPlaying(false);
      }
    }
  }, [isAudioPlaying]);

  // Auto-start audio on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      toggleAudio();
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          const audio = audioRef.current as unknown as {
            _source: AudioBufferSourceNode;
          };
          audio._source.stop();
        } catch {
          /* already stopped */
        }
      }
    };
  }, []);

  const handleEndSession = () => {
    setShowQuitTrap(true);
  };

  const handleConfirmQuit = () => {
    // Stop audio
    if (audioRef.current) {
      try {
        const audio = audioRef.current as unknown as {
          _source: AudioBufferSourceNode;
        };
        audio._source.stop();
      } catch {
        /* already stopped */
      }
    }
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    onQuit(elapsed);
  };

  const handleStayFocused = () => {
    setShowQuitTrap(false);
  };

  return (
    <main
      className={`relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden px-6 transition-opacity duration-700 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-container/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-[100px]" />
      </div>

      {/* Intent Display */}
      <div
        className={`z-10 mb-12 text-center transition-all duration-700 delay-100 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <span className="text-[11px] uppercase tracking-[0.2em] text-primary mb-4 block font-medium opacity-80">
          Current Objective
        </span>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl mx-auto text-on-surface leading-tight">
          {intentText}
        </h1>
      </div>

      {/* Timer Ring */}
      <div
        className={`relative z-10 transition-all duration-700 delay-300 ${
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="relative flex items-center justify-center w-[300px] h-[300px] md:w-[420px] md:h-[420px]">
          {/* SVG Progress Ring */}
          <svg className="absolute w-full h-full" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={ringRadius}
              fill="transparent"
              stroke="#353436"
              strokeWidth="1.5"
            />
            {/* Progress ring */}
            <circle
              cx="50"
              cy="50"
              r={ringRadius}
              fill="transparent"
              stroke="url(#timer-gradient)"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-1000 linear"
              transform="rotate(-90 50 50)"
            />
            <defs>
              <linearGradient
                id="timer-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#FF823C" />
                <stop offset="100%" stopColor="#3f3d98" />
              </linearGradient>
            </defs>
          </svg>

          {/* Timer Display (Glass Circle) */}
          <div className="glass-panel w-[240px] h-[240px] md:w-[340px] md:h-[340px] rounded-full flex flex-col items-center justify-center border border-white/5 shadow-[0_0_60px_-15px_rgba(255,130,60,0.15)]">
            <div className="text-6xl md:text-[7.5rem] font-black tracking-tighter text-primary-container leading-none mb-2 tabular-nums">
              {display}
            </div>
            <div className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold text-on-surface/40">
              Minutes Remaining
            </div>
          </div>
        </div>
      </div>

      {/* Audio Controls */}
      <div
        className={`z-20 mt-12 md:mt-16 glass-panel px-6 md:px-8 py-4 rounded-full flex items-center gap-6 md:gap-8 border border-white/5 transition-all duration-700 delay-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
              />
            </svg>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface/40 font-bold">
              Atmosphere
            </div>
            <div className="text-sm font-semibold text-on-surface">
              Brown Noise
            </div>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-white/10" />

        <button
          onClick={toggleAudio}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
            isAudioPlaying
              ? "bg-primary text-on-primary-fixed"
              : "bg-surface-container-highest text-on-surface/60"
          }`}
        >
          {isAudioPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="h-6 w-[1px] bg-white/10 hidden md:block" />

        <div className="hidden md:flex items-center gap-2">
          <svg
            className="w-4 h-4 text-on-surface/40"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
            />
          </svg>
          <div className="w-20 h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="w-2/3 h-full bg-primary/60 rounded-full" />
          </div>
        </div>
      </div>

      {/* End Session Button */}
      <div
        className={`z-10 mt-10 md:mt-12 transition-all duration-700 delay-700 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={handleEndSession}
          className="px-8 py-3 rounded-full text-sm font-medium text-on-surface/30 hover:text-on-surface/80 hover:bg-surface-container-low transition-all duration-300"
        >
          End Focus Session
        </button>
      </div>

      {/* ===== QUIT TRAP OVERLAY ===== */}
      {showQuitTrap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="max-w-md w-full mx-6 text-center">
            {/* Warning icon */}
            <div className="w-16 h-16 mx-auto mb-8 rounded-full bg-error-container/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-error"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface mb-4">
              Your brain is trying
              <br />
              to trick you.
            </h2>

            <p className="text-on-surface-variant text-lg mb-2">
              You only have{" "}
              <span className="text-primary-container font-bold">
                {display}
              </span>{" "}
              left.
            </p>
            <p className="text-on-surface-variant/60 text-sm mb-10">
              The discomfort you feel right now is your brain resisting the
              shift. Push through it — the hardest part is almost over.
            </p>

            {/* Stay button (primary action — make it VERY prominent) */}
            <button
              onClick={handleStayFocused}
              className="glow-button w-full px-8 py-5 rounded-xl text-base font-bold mb-4"
            >
              Stay Focused
            </button>

            {/* Quit button (deliberately small, hostile) */}
            <button
              onClick={handleConfirmQuit}
              className="px-6 py-2 text-xs text-on-surface/20 hover:text-on-surface/50 transition-colors"
            >
              I want to quit anyway
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
