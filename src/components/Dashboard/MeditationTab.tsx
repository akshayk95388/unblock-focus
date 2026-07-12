"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getHabits, type Habit } from "@/lib/habits";
import { saveSession, toggleFavorite, type SubtitleEntry } from "@/lib/sessions";
import { track } from "@/lib/mixpanel";
import BreathingRing from "@/components/FocusEngine/BreathingRing";
import Confetti from "@/components/FocusEngine/Confetti";
import CustomSelect from "@/components/ui/CustomSelect";

export interface ReplayConfig {
  audioUrl: string;
  title: string;
  subtitles: SubtitleEntry[];
  duration: number;
  returnTab: string;
}

interface MeditationSubtitleEntry {
  text: string;
  start_ms: number;
  end_ms: number;
}

interface MeditationTabProps {
  initialStressor?: string;
  directFocusMode?: boolean;
  onSessionComplete?: () => void;
  initialDurationMins?: number;
  initialVoice?: string;
  initialMusic?: string;
  onZenModeChange?: (active: boolean) => void;
  zenActive?: boolean;
  onToggleZen?: () => void;
  replayConfig?: ReplayConfig | null;
  onClearReplay?: () => void;
}

// ===== Breathing Guide shown during AI generation =====
function GeneratingBreathingGuide({
  percent,
  stage,
  audioReady,
  onTransition,
  zenActive,
  onToggleZen,
  onCancel,
}: {
  percent: number;
  stage: string;
  audioReady: boolean;
  onTransition: () => void;
  zenActive: boolean;
  onToggleZen?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="bg-surface-container-low/40 border border-outline-variant/10 rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[520px]">
      {/* BreathingRing — 4-7-8 technique, compact, loops until audio is ready */}
      <div className="flex-1 flex items-center justify-center w-full py-4">
        <BreathingRing
          techniqueId="relaxing_478"
          active={true}
          size="compact"
          showTimer={false}
          enableAudio={true}
          finishAfterCycle={audioReady}
          onComplete={onTransition}
        />
      </div>

      {/* Status text */}
      <div className="space-y-2 max-w-md z-10 mb-6 flex flex-col items-center">
        <p className="text-xs text-on-surface-variant/60">
          {audioReady
            ? "Your reset is ready. Finishing this breath cycle..."
            : "Breathe while we build your personalized reset"}
        </p>
        <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest">
          4-7-8 Relaxing Breath
        </p>
        {audioReady && (
          <button
            onClick={onTransition}
            className="mt-2 text-[10px] uppercase tracking-widest text-primary hover:text-primary-container transition-colors font-bold underline decoration-dotted"
          >
            Listen now →
          </button>
        )}
      </div>

      {/* Generation progress bar — subtle, at the bottom */}
      <div className="w-full max-w-sm z-10 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-on-surface-variant/40 font-mono">
          <span>{audioReady ? "Ready" : stage}</span>
          <span>{audioReady ? "100%" : `${percent}%`}</span>
        </div>
        <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500 ease-out"
            style={{ width: audioReady ? "100%" : `${percent}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 z-10 flex items-center justify-center gap-4">
        {onToggleZen && (
          <button
            onClick={onToggleZen}
            className="px-5 py-2 rounded-full text-[10px] tracking-wider uppercase text-outline hover:text-white transition-all border border-outline-variant/20 hover:bg-white/5 cursor-pointer font-bold"
          >
            {zenActive ? "🧘 Exit Zen Mode" : "🧘 Go Zen Mode"}
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-[10px] tracking-wider uppercase text-outline hover:text-error transition-all border border-transparent hover:border-error/20 hover:bg-error-container/5 cursor-pointer font-bold"
          >
            End Session
          </button>
        )}
      </div>
    </div>
  );
}

export default function MeditationTab({
  initialStressor = "",
  directFocusMode = false,
  onSessionComplete,
  initialDurationMins = 3,
  initialVoice = "gentle_female",
  initialMusic = "none",
  onZenModeChange,
  zenActive = false,
  onToggleZen,
  replayConfig,
  onClearReplay,
}: MeditationTabProps) {
  // Input settings
  const [stressor, setStressor] = useState(initialStressor);
  const [durationMins, setDurationMins] = useState(initialDurationMins);
  const [voice, setVoice] = useState(initialVoice);
  const [music, setMusic] = useState(initialMusic);

  // Post-reset settings (moved from idle form)
  const [llmFocusTask, setLlmFocusTask] = useState("");
  const [workTask, setWorkTask] = useState("");
  const [focusDuration, setFocusDuration] = useState(25);
  const [showFocusCustom, setShowFocusCustom] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);

  // Sync LLM task or default to Focused Work
  useEffect(() => {
    if (llmFocusTask) {
      setWorkTask(llmFocusTask);
    } else {
      setWorkTask("Focused Work");
    }
  }, [llmFocusTask]);

  // App state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [status, setStatus] = useState<
    "idle" | "generating" | "playing" | "post_reset" | "focus_timer" | "session_complete" | "failed"
  >(replayConfig ? "playing" : directFocusMode ? "post_reset" : initialStressor.trim() ? "generating" : "idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Buffered audio ready flag — lets breathing finish its cycle before transitioning
  const [audioReady, setAudioReady] = useState(replayConfig ? true : false);

  // Progress state
  const [stage, setStage] = useState("");
  const [percent, setPercent] = useState(0);

  // Audio / Subtitle state
  const [audioUrl, setAudioUrl] = useState<string | null>(replayConfig ? replayConfig.audioUrl : null);
  const [title, setTitle] = useState(replayConfig ? replayConfig.title : "Guided Session");
  const [subtitles, setSubtitles] = useState<MeditationSubtitleEntry[]>(
    replayConfig ? (replayConfig.subtitles as MeditationSubtitleEntry[]) : []
  );
  const [actualDuration, setActualDuration] = useState(replayConfig ? replayConfig.duration : 0);

  // Replay mode
  const [isReplay, setIsReplay] = useState(replayConfig ? true : false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [breathState, setBreathState] = useState<"inhale" | "exhale" | "hold" | "normal">("normal");
  const [sessionLogged, setSessionLogged] = useState(false);

  // Focus Timer State
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(0);
  const [focusStartTime, setFocusStartTime] = useState(0);
  const [focusTimerUsed, setFocusTimerUsed] = useState(false);
  const [showQuitTrap, setShowQuitTrap] = useState(false);

  // Track whether a reset was done (for session logging)
  const [resetDone, setResetDone] = useState(replayConfig ? true : false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const autoStartedRef = useRef(false);

  // Load habits
  useEffect(() => {
    async function loadHabits() {
      const list = await getHabits();
      setHabits(list);
      if (list.length > 0) {
        const found = list.find(
          (h) =>
            h.name.toLowerCase().includes("meditation") ||
            h.name.toLowerCase().includes("breath") ||
            h.name.toLowerCase().includes("focus")
        );
        setSelectedHabitId(found ? found.id : list[0].id);
      }
    }
    loadHabits();
  }, []);

  // When pre-filled from the dashboard, skip the setup form and generate immediately.
  // A ref guard prevents a duplicate job (e.g. React strict-mode double effects).
  useEffect(() => {
    if (initialStressor && initialStressor.trim() && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setStressor(initialStressor);
      handleGenerate(initialStressor);
    }
  }, [initialStressor]);

  // Clean up SSE stream
  const cleanupStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupStream();
  }, [cleanupStream]);

  // Fallback to go back to the dashboard if the state ever lands on idle
  useEffect(() => {
    if (status === "idle") {
      onSessionComplete?.();
    }
  }, [status, onSessionComplete]);

  // Coordinate Zen Mode status
  useEffect(() => {
    const isSessionActive = status === "generating" || status === "playing" || status === "focus_timer";
    onZenModeChange?.(isSessionActive);
    return () => {
      onZenModeChange?.(false);
    };
  }, [status, onZenModeChange]);

  // Fetch final status
  const fetchStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/status/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "complete" || data.current_stage === "complete") {
          setAudioUrl(data.audio_url);
          setTitle(data.title || "Guided Session");
          setActualDuration(data.duration_s || durationMins * 60);

          if (data.focus_task) {
            setLlmFocusTask(data.focus_task);
          }

          if (data.subtitles) {
            if (Array.isArray(data.subtitles)) {
              setSubtitles(data.subtitles);
            } else if (data.subtitles && typeof data.subtitles === "object" && Array.isArray((data.subtitles as any).events)) {
              setSubtitles((data.subtitles as any).events);
            }
          } else {
            setSubtitles([
              { text: "Take a moment to settle in.", start_ms: 0, end_ms: 4000 },
              { text: "Notice your breathing.", start_ms: 5000, end_ms: 10000 },
              { text: "Let go of what you don't need right now.", start_ms: 11000, end_ms: 16000 },
            ]);
          }
          setAudioReady(true);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "We couldn't finish building your session. Please try again.");
        }
      }
    } catch (err) {
      console.error("Error fetching status:", err);
      setStatus("failed");
      setError("We couldn't reach the server. Please try again.");
    }
  };

  // Start Generation
  const handleGenerate = async (stressorOverride?: string) => {
    const text = stressorOverride || stressor;
    if (!text.trim()) return;

    setStatus("generating");
    setError(null);
    setPercent(0);
    setStage("Warming up…");
    setSessionLogged(false);
    setResetDone(true);
    setAudioReady(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stressor: text,
          duration_mins: durationMins,
          voice,
          music,
        }),
      });

      if (!response.ok) {
        throw new Error("We couldn't start your session. Please try again.");
      }

      const body = await response.json();
      const id = body.job_id;
      setJobId(id);

      // Setup EventSource for real-time progress stream
      cleanupStream();
      const es = new EventSource(`/api/generate/stream/${id}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setPercent(data.pct || 0);
          setStage(data.stage || "Building your session…");

          if (data.stage === "complete" || data.pct >= 100) {
            cleanupStream();
            fetchStatus(id);
          } else if (data.stage === "failed") {
            cleanupStream();
            setStatus("failed");
            setError(data.error || "We couldn't finish building your session. Please try again.");
          }
        } catch (e) {
          console.error("Error parsing progress SSE event:", e);
        }
      };

      es.onerror = () => {
        console.warn("SSE stream error. Falling back to status polling.");
        cleanupStream();

        let pollCount = 0;
        const interval = setInterval(async () => {
          pollCount++;
          if (pollCount > 120) {
            clearInterval(interval);
            setStatus("failed");
            setError("This is taking longer than expected. Please try again.");
            return;
          }

          try {
            const check = await fetch(`/api/status/${id}`);
            if (check.ok) {
              const info = await check.json();
              setPercent(info.progress_pct || 0);
              setStage(info.current_stage || "Building your session…");

              if (info.status === "complete") {
                clearInterval(interval);
                setAudioUrl(info.audio_url);
                setTitle(info.title || "Guided Session");
                setActualDuration(info.duration_s || durationMins * 60);

                if (info.focus_task) {
                  setLlmFocusTask(info.focus_task);
                }

                if (info.subtitles) {
                  if (Array.isArray(info.subtitles)) {
                    setSubtitles(info.subtitles);
                  } else if (info.subtitles && typeof info.subtitles === "object" && Array.isArray((info.subtitles as any).events)) {
                    setSubtitles((info.subtitles as any).events);
                  }
                }
                setAudioReady(true);
              } else if (info.status === "failed") {
                clearInterval(interval);
                setStatus("failed");
                setError(info.error || "We couldn't finish building your session. Please try again.");
              }
            }
          } catch (e) {
            console.error("Polling error:", e);
          }
        }, 3000);
      };
    } catch (err: unknown) {
      cleanupStream();
      setStatus("failed");
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  // Audio Playback Sync Subtitles & Breath Guides
  useEffect(() => {
    if (!audioRef.current || status !== "playing" || subtitles.length === 0) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const timeMs = audio.currentTime * 1000;
      setCurrentTime(audio.currentTime);

      const sub = subtitles.find((s) => timeMs >= s.start_ms && timeMs <= s.end_ms);
      if (sub) {
        setActiveSubtitle(sub.text);

        const txt = sub.text.toLowerCase();
        if (txt.includes("breathe in") || txt.includes("inhale") || txt.includes("breath in")) {
          setBreathState("inhale");
        } else if (txt.includes("breathe out") || txt.includes("exhale") || txt.includes("breath out")) {
          setBreathState("exhale");
        } else if (txt.includes("hold")) {
          setBreathState("hold");
        } else {
          setBreathState("normal");
        }
      } else {
        setActiveSubtitle(null);
        setBreathState("normal");
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (isReplay) {
        // Replays skip the post-reset focus timer screen
        setStatus("session_complete");
      } else {
        // Auto-transition to post-reset choice screen
        setStatus("post_reset");
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [status, subtitles, isReplay]);

  // Sync volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // Auto-play audio when transitioning to playing status
  useEffect(() => {
    if (status === "playing" && audioUrl && audioRef.current) {
      try {
        const ctx = (window as any).__unblockAudioCtx;
        if (ctx && ctx.state === "suspended") ctx.resume();
      } catch (e) { }

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e) => {
          console.warn("Auto-play blocked by browser. User needs to tap Play.", e);
        });
    }
  }, [status, audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        const ctx = (window as any).__unblockAudioCtx;
        if (ctx && ctx.state === "suspended") ctx.resume();
      } catch (e) { }

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e) => {
          console.error("Audio playback blocked:", e);
        });
    }
  };

  const handleSeek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleSkip = (offset: number) => {
    if (!audioRef.current) return;
    let target = audioRef.current.currentTime + offset;
    if (target < 0) target = 0;
    if (target > audioRef.current.duration) target = audioRef.current.duration;
    handleSeek(target);
  };

  // Record session to history & streaks
  const handleLogSession = async () => {
    if (sessionLogged) return;
    // Replays don't create new session records
    if (isReplay) {
      setSessionLogged(true);
      return;
    }

    let totalSeconds = 0;

    // Count reset time if reset was done
    if (resetDone) {
      totalSeconds += actualDuration || durationMins * 60;
    }

    // Count focus time only if focus timer was actually used
    if (focusTimerUsed) {
      const focusElapsed = focusDuration * 60 - focusSecondsLeft;
      totalSeconds += focusElapsed;
    }

    const sessionName = resetDone ? `Guided: ${title}` : `Focus: ${workTask}`;
    const sessionType = resetDone ? "guided" : "focus";
    const saved = await saveSession(
      sessionName,
      totalSeconds,
      selectedHabitId || undefined,
      false,
      sessionType,
      resetDone ? audioUrl : null,
      resetDone ? (subtitles as SubtitleEntry[]) : null
    );
    if (saved) {
      setSavedSessionId(saved.id);
    }
    track(resetDone ? "guided_session_completed" : "focus_session_completed", {
      duration_mins: Math.round(totalSeconds / 60),
      duration_seconds: totalSeconds,
      ...(selectedHabitId
        ? { goal_name: habits.find((h) => h.id === selectedHabitId)?.name }
        : {}),
    });
    setSessionLogged(true);
  };

  // Focus Timer logic
  const handleStartFocusTimer = () => {
    const seconds = focusDuration * 60;
    setFocusSecondsLeft(seconds);
    setFocusStartTime(Date.now());
    setFocusTimerUsed(true);
    setStatus("focus_timer");
  };

  // Start automatic 10-second countdown when landing on post_reset screen after a reset is done
  useEffect(() => {
    if (status === "post_reset" && resetDone && workTask.trim()) {
      setCountdown(10);
    } else {
      setCountdown(null);
    }
  }, [status, resetDone, workTask]);

  // Autoplay countdown timer tick effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleStartFocusTimer();
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus timer countdown effect
  useEffect(() => {
    if (status !== "focus_timer") return;
    if (focusSecondsLeft <= 0) {
      handleLogSession();
      setStatus("session_complete");
      return;
    }
    const interval = setInterval(() => {
      setFocusSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, focusSecondsLeft]);

  // Update tab title during focus
  useEffect(() => {
    if (status === "focus_timer") {
      const m = Math.floor(focusSecondsLeft / 60);
      const s = focusSecondsLeft % 60;
      document.title = `(${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}) Focus — Unblock`;
      return () => {
        document.title = "Unblock — Deep Focus";
      };
    }
  }, [status, focusSecondsLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleResetAll = () => {
    setStatus("idle");
    setStressor("");
    setWorkTask("");
    setSessionLogged(false);
    setAudioUrl(null);
    setSubtitles([]);
    setResetDone(false);
    setFocusTimerUsed(false);
    setIsReplay(false);
    setSavedSessionId(null);
    setIsFavorited(false);
    onClearReplay?.();
    onSessionComplete?.();
  };

  return (
    <div className="flex flex-col flex-1 p-6 md:p-12 space-y-10 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto space-y-10">
        {status !== "focus_timer" && status !== "session_complete" && status !== "playing" && (
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {status === "post_reset" && !resetDone ? "Start Focus Session" : "Guided Session"}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {status === "post_reset" && !resetDone
                ? "Set your task and start a focus session."
                : "A personalized guided session to clear what\u0027s blocking you."}
            </p>
          </div>
        )}

        {/* ============ GENERATION STATE — 4-7-8 Breathing While Waiting ============ */}
        {status === "generating" && (
          <GeneratingBreathingGuide
            percent={percent}
            stage={stage}
            audioReady={audioReady}
            onTransition={() => {
              setAudioReady(false);
              setStatus("playing");
            }}
            zenActive={zenActive}
            onToggleZen={onToggleZen}
            onCancel={handleResetAll}
          />
        )}

        {/* ============ ERROR STATE ============ */}
        {status === "failed" && (
          <div className="bg-surface-container-low border border-error/20 rounded-2xl p-12 text-center space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-2xl text-error mx-auto">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-on-surface">Couldn&apos;t build your session</h3>
              <p className="text-sm text-on-surface-variant">{error || "Something went wrong on our end. Please try again."}</p>
            </div>
            <button
              onClick={() => onSessionComplete?.()}
              className="px-6 py-3 rounded-xl bg-surface-container-highest text-on-surface hover:bg-surface-container-highest/80 font-bold text-sm transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ============ AUDIO PLAYER & SUBTITLES SCREEN ============ */}
        {/* ============ AUDIO PLAYER & SUBTITLES SCREEN ============ */}
        {status === "playing" && (
          <div className="bg-surface-container-low p-5 md:px-8 md:pt-6 md:pb-5 rounded-3xl border border-outline-variant/15 relative overflow-hidden flex flex-col items-center min-h-[440px] w-full gap-6">
            {/* Ambient breathing ring background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`rounded-full bg-primary/5 transition-all duration-[4000ms] ease-in-out filter blur-3xl ${breathState === "inhale"
                  ? "scale-[3.0] opacity-30"
                  : breathState === "exhale"
                    ? "scale-[1.5] opacity-10"
                    : breathState === "hold"
                      ? "scale-[3.0] opacity-40 animate-pulse"
                      : "scale-[2.0] opacity-15"
                  }`}
                style={{ width: "200px", height: "200px" }}
              />
            </div>

            <div className="w-full flex items-center justify-between border-b border-outline-variant/10 pb-4 z-10">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${isReplay ? "bg-tertiary/20 text-tertiary" : "bg-primary/20 text-primary"}`}>
                  {isReplay ? "Replaying" : "Active Session"}
                </span>
                <h3 className="text-sm font-bold text-on-surface">{title}</h3>
              </div>
              {isReplay ? (
                <button
                  onClick={handleResetAll}
                  className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  ← Exit Replay
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                    }
                    setIsPlaying(false);
                    setStatus("post_reset");
                  }}
                  className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  I&apos;m ready to work →
                </button>
              )}
            </div>

            {/* Subtitle / Breathing Ring Area */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 max-w-xl w-full relative min-h-[160px] z-10">
              {/* Visual breathing ring */}
              {breathState !== "normal" && (
                <div
                  className={`absolute w-36 h-36 rounded-full border border-primary/25 transition-all duration-[4000ms] ease-in-out flex items-center justify-center ${breathState === "inhale"
                    ? 'scale-[1.7] border-primary/45 shadow-[0_0_30px_rgba(255,182,146,0.25)]'
                    : breathState === "exhale"
                      ? "scale-[0.9] border-primary/10"
                      : "scale-[1.7] border-tertiary/40 shadow-[0_0_35px_rgba(233,196,0,0.2)]"
                    }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/75">
                    {breathState === "inhale" ? "Inhale" : breathState === "exhale" ? "Exhale" : "Hold"}
                  </span>
                </div>
              )}

              {/* Subtitle text */}
              <p className="text-xl md:text-2xl font-light tracking-wide text-on-surface leading-relaxed max-w-lg z-10 transition-all duration-300">
                {activeSubtitle || "Settle in..."}
              </p>
            </div>

            {/* Audio controls */}
            <div className="w-full max-w-lg space-y-4 z-10">
              {/* Progress Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold font-mono tracking-wider text-on-surface-variant">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(actualDuration)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={actualDuration || 180}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Buttons Row */}
              <div className="flex items-center justify-between">
                {/* Volume */}
                <div className="flex items-center gap-2 w-28">
                  <svg className="w-4 h-4 text-on-surface-variant flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                    />
                  </svg>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(Number(e.target.value))}
                    className="w-20 md:w-24 accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Centered Play/Pause */}
                <div className="flex-1 flex justify-center">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Symmetrical Spacer */}
                <div className="w-28" />
              </div>

              {/* Action buttons (Zen & End) centered inside the card under controls */}
              <div className="border-t border-outline-variant/10 pt-3 flex items-center justify-center gap-4">
                {onToggleZen && (
                  <button
                    onClick={onToggleZen}
                    className="px-5 py-2 rounded-full text-[10px] tracking-wider uppercase text-outline hover:text-white transition-all border border-outline-variant/20 hover:bg-white/5 cursor-pointer font-bold"
                  >
                    {zenActive ? "🧘 Exit Zen Mode" : "🧘 Go Zen Mode"}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                    }
                    setIsPlaying(false);
                    handleResetAll();
                  }}
                  className="px-5 py-2 rounded-full text-[10px] tracking-wider uppercase text-outline hover:text-error transition-all border border-transparent hover:border-error/20 hover:bg-error-container/5 cursor-pointer font-bold"
                >
                  End Session
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============ POST-RESET CHOICE SCREEN ============ */}
        {status === "post_reset" && (
          <div className="space-y-8">
            {/* Success indicator (only if reset was done) */}
            {resetDone && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/15">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">Guided session complete.</p>
                  <p className="text-xs text-on-surface-variant">Take a moment. No rush.</p>
                </div>
              </div>
            )}

            {/* Focus Timer Setup */}
            <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl border border-outline-variant/15 space-y-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

              <div className="space-y-1 relative z-10">
                <h3 className="text-lg font-bold text-on-surface">
                  {resetDone ? "Want to start a focus session?" : "Set up your focus session"}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {resetDone
                    ? "You're clear-headed now. Perfect time to start."
                    : "Set your task, duration, and go."}
                </p>
              </div>

              {/* Work task */}
              <div className="space-y-2 relative z-10">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  What will you work on?
                </label>
                <input
                  type="text"
                  value={workTask}
                  onChange={(e) => {
                    setWorkTask(e.target.value);
                    setCountdown(null);
                  }}
                  placeholder="e.g. Write the intro section of my pitch deck"
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-on-surface-variant/40"
                  autoFocus
                />
              </div>

              {/* Duration + Habit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Focus session duration
                  </label>
                  <CustomSelect
                    size="sm"
                    value={showFocusCustom ? "custom" : focusDuration}
                    onChange={(val) => {
                      if (val === "custom") {
                        setShowFocusCustom(true);
                        setFocusDuration(30);
                      } else {
                        setShowFocusCustom(false);
                        setFocusDuration(Number(val));
                      }
                      setCountdown(null);
                    }}
                    options={[
                      { value: 15, label: "15 min (Quick)" },
                      { value: 25, label: "25 min (Classic)" },
                      { value: 45, label: "45 min (Standard)" },
                      { value: 90, label: "90 min (Extended)" },
                      { value: "custom", label: "Custom..." },
                    ]}
                  />
                  {showFocusCustom && (
                    <div className="mt-2.5 animate-in slide-in-from-top-1 duration-200 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={360}
                        value={focusDuration}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(360, Number(e.target.value) || 1));
                          setFocusDuration(val);
                          setCountdown(null);
                        }}
                        className="w-24 bg-surface-container-highest border border-outline-variant/15 rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 text-center font-mono font-bold"
                      />
                      <span className="text-xs text-on-surface-variant/70 font-medium">Minutes</span>
                    </div>
                  )}
                </div>

                {habits.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Track under goal (optional)
                    </label>
                    <CustomSelect
                      size="sm"
                      value={selectedHabitId}
                      onChange={(val) => {
                        setSelectedHabitId(val);
                        setCountdown(null);
                      }}
                      options={[
                        { value: "", label: "None" },
                        ...habits.map((h) => ({ value: h.id, label: `${h.emoji} ${h.name}` })),
                      ]}
                    />
                  </div>
                )}
              </div>

              {/* Start Focus Timer Button */}
              <button
                onClick={countdown !== null ? () => setCountdown(null) : handleStartFocusTimer}
                disabled={!workTask.trim()}
                className={`w-full glow-button py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 relative z-10 ${!workTask.trim() ? "opacity-50 pointer-events-none" : "hover:scale-[1.01] active:scale-95"
                  }`}
              >
                {countdown !== null ? (
                  <span className="flex items-center gap-2.5">
                    <span className="animate-pulse">🚀 Starting Focus Session in {countdown}s...</span>
                    <span className="text-[9px] uppercase bg-black/20 text-on-surface-variant/80 border border-outline-variant/10 px-2 py-0.5 rounded tracking-wide font-extrabold font-mono">
                      Click to Pause
                    </span>
                  </span>
                ) : (
                  `Start Focus Session — ${focusDuration} min`
                )}
              </button>
            </div>

            {/* Secondary: Done without focus timer */}
            {resetDone && (
              <div className="text-center flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    handleLogSession();
                    setStatus("session_complete");
                  }}
                  className="text-sm text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
                >
                  I feel better now. That&apos;s all I needed. →
                </button>

                <button
                  onClick={() => {
                    setStatus("playing");
                    // Small delay to ensure audio element is mounted and ref is assigned
                    setTimeout(() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(() => { });
                      }
                    }, 50);
                  }}
                  className="text-xs text-on-surface-variant/40 hover:text-on-surface-variant/75 transition-colors"
                >
                  ← Listen again
                </button>
              </div>
            )}

            {/* Back button for direct-focus mode */}
            {!resetDone && (
              <div className="text-center">
                <button
                  onClick={() => onSessionComplete?.()}
                  className="text-sm text-on-surface-variant/60 hover:text-on-surface transition-colors"
                >
                  ← Back to guided session
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============ FOCUS TIMER STATE ============ */}
        {status === "focus_timer" &&
          (() => {
            const m = Math.floor(focusSecondsLeft / 60);
            const s = focusSecondsLeft % 60;
            const display = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
            const totalFocusSeconds = focusDuration * 60;
            const progress = 1 - focusSecondsLeft / totalFocusSeconds;
            const ringRadius = 48;
            const circumference = 2 * Math.PI * ringRadius;
            const dashOffset = circumference * (1 - progress);

            return (
              <div className="flex flex-col items-center justify-center min-h-[600px] text-center relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-container/5 rounded-full blur-[120px]" />
                </div>

                {/* Work task display */}
                <div className="z-10 mb-12">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight max-w-2xl mx-auto text-on-surface/80 leading-tight">
                    {workTask}
                  </h1>
                </div>

                {/* Timer Ring */}
                <div className="relative z-10 flex items-center justify-center w-[300px] h-[300px] md:w-[420px] md:h-[420px]">
                  <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={ringRadius} fill="transparent" stroke="#353436" strokeWidth="1.5" />
                    <circle
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      fill="transparent"
                      stroke="url(#focus-timer-gradient)"
                      strokeWidth="3"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      className="transition-[stroke-dashoffset] duration-1000 linear"
                      transform="rotate(-90 50 50)"
                    />
                    <defs>
                      <linearGradient id="focus-timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF823C" />
                        <stop offset="100%" stopColor="#3f3d98" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="glass-panel w-[240px] h-[240px] md:w-[340px] md:h-[340px] rounded-full flex flex-col items-center justify-center border border-white/5 shadow-[0_0_60px_-15px_rgba(255,130,60,0.15)]">
                    <div className="text-6xl md:text-[7.5rem] font-black tracking-tighter text-primary-container leading-none mb-2 tabular-nums">
                      {display}
                    </div>
                    <div className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold text-on-surface/40">
                      Remaining
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="z-10 mt-10 flex items-center justify-center gap-4">
                  {onToggleZen && (
                    <button
                      onClick={onToggleZen}
                      className="px-5 py-2 rounded-full text-[11px] uppercase tracking-widest font-medium text-on-surface-variant/40 hover:text-on-surface/90 hover:bg-white/5 border border-outline-variant/10 hover:border-outline-variant/30 transition-all duration-500 cursor-pointer font-bold"
                    >
                      {zenActive ? "🧘 Exit Zen Mode" : "🧘 Go Zen Mode"}
                    </button>
                  )}
                  <button
                    onClick={() => setShowQuitTrap(true)}
                    className="px-6 py-2 rounded-full text-[11px] uppercase tracking-widest font-medium text-on-surface/10 hover:text-on-surface/90 hover:bg-white/5 transition-all duration-500 cursor-pointer"
                  >
                    End Focus Session
                  </button>
                </div>

                {/* Quit Trap */}
                {showQuitTrap && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="max-w-md w-full mx-6 text-center bg-surface-container-low/95 border border-outline-variant/15 p-8 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 mx-auto mb-8 rounded-full bg-error-container/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-black tracking-tight text-on-surface mb-4">
                        You&apos;re <span className="text-primary-container">{display}</span>
                        <br />
                        from finishing.
                      </h2>
                      <p className="text-on-surface-variant/60 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
                        The urge to quit usually hits right before momentum kicks in. You started this block for a reason — stay with it a little longer.
                      </p>
                      <button
                        onClick={() => setShowQuitTrap(false)}
                        className="glow-button w-full px-8 py-4.5 rounded-xl text-base font-bold mb-4"
                      >
                        Keep going
                      </button>
                      <button
                        onClick={async () => {
                          setShowQuitTrap(false);
                          const elapsed = Math.round((Date.now() - focusStartTime) / 1000);
                          if (elapsed > 0) {
                            const resetTime = resetDone ? actualDuration || durationMins * 60 : 0;
                            await saveSession(
                              resetDone ? `Guided: ${title}` : `Focus: ${workTask}`,
                              resetTime + elapsed,
                              selectedHabitId || undefined,
                              true,
                              resetDone ? "guided" : "focus"
                            );
                            track(resetDone ? "guided_session_aborted" : "focus_session_aborted", {
                              duration_seconds: resetTime + elapsed,
                            });
                          }
                          handleResetAll();
                        }}
                        className="px-6 py-2 text-xs text-on-surface-variant/40 hover:text-on-surface-variant/80 transition-colors block mx-auto mt-2"
                      >
                        End focus session anyway
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ============ SESSION COMPLETE STATE ============ */}
        {status === "session_complete" &&
          (() => {
            let totalMinutes = 0;
            if (resetDone) {
              totalMinutes += Math.round((actualDuration || durationMins * 60) / 60);
            }
            if (focusTimerUsed) {
              totalMinutes += Math.round((focusDuration * 60 - focusSecondsLeft) / 60);
            }

            const description = isReplay
              ? "Replay finished"
              : resetDone && focusTimerUsed
                ? `${Math.round((actualDuration || durationMins * 60) / 60)} min guided session + ${Math.round((focusDuration * 60 - focusSecondsLeft) / 60)} min focus session`
                : resetDone
                  ? `${totalMinutes} min guided session`
                  : `${totalMinutes} min focus session`;

            return (
              <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-8">
                {!isReplay && <Confetti />}
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-on-surface">
                    {isReplay ? "Replay Complete" : "Session Complete"}
                  </h2>
                  <p className="text-on-surface-variant text-sm">{description}{isReplay ? "" : ". Nice."}</p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Save to Favorites — only for new guided sessions with audio */}
                  {!isReplay && resetDone && audioUrl && savedSessionId && (
                    <button
                      onClick={async () => {
                        const newState = !isFavorited;
                        setIsFavorited(newState);
                        await toggleFavorite(savedSessionId, newState);
                      }}
                      className={`px-6 py-4 rounded-xl text-sm font-bold border transition-all ${
                        isFavorited
                          ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15"
                          : "bg-surface-container-highest border-outline-variant/15 text-on-surface-variant hover:bg-surface-container-highest/80"
                      }`}
                    >
                      {isFavorited ? "❤️ Saved to Favorites" : "🤍 Save to Favorites"}
                    </button>
                  )}
                  <button onClick={handleResetAll} className="glow-button px-8 py-4 rounded-xl text-sm font-bold">
                    {isReplay ? "Back" : "Back to Dashboard"}
                  </button>
                </div>
              </div>
            );
          })()}
      </div>
      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />}
    </div>
  );
}
