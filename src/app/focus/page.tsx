"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import DailyGoalProgress from "@/components/Dashboard/DailyGoalProgress";
import HabitManager from "@/components/Dashboard/HabitManager";
import HabitsTab from "@/components/Dashboard/HabitsTab";
import HistoryTab from "@/components/Dashboard/HistoryTab";
import MeditationTab, { type ReplayConfig } from "@/components/Dashboard/MeditationTab";
import Breathing from "@/components/FocusEngine/Breathing";
import CustomSelect from "@/components/ui/CustomSelect";
import PaywallModal from "@/components/ui/PaywallModal";
import SidebarSessionCard from "@/components/Dashboard/SidebarSessionCard";
import { ActiveSessionProvider, useActiveSession } from "@/components/ActiveSessionContext";
import { saveSession, type SessionRecord } from "@/lib/sessions";
import { getHabits, addHabit } from "@/lib/habits";
import { track } from "@/lib/mixpanel";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isPro, canUseBreathingTechnique, hasCredits } from "@/lib/plans";

export default function DashboardPage() {
  return (
    <ActiveSessionProvider>
      <DashboardContent />
    </ActiveSessionProvider>
  );
}

function DashboardContent() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [showHabitManager, setShowHabitManager] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [standaloneBreathing, setStandaloneBreathing] = useState<{ durationMinutes: number }>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState<"credits" | "breathing" | null>(null);
  const [showProSuccess, setShowProSuccess] = useState(false);
  const { planType, credits, refetch: refetchPlan } = useUserPlan();
  const userIsPro = isPro(planType);
  const router = useRouter();

  // Zen Mode states
  const [isMeditationZen, setIsMeditationZen] = useState(false);
  const [manualZenDisabled, setManualZenDisabled] = useState(true);

  // Session flow props — passed to MeditationTab when navigating from hero
  const [pendingStressor, setPendingStressor] = useState("");
  const [directFocusMode, setDirectFocusMode] = useState(false);
  const [durationMins, setDurationMins] = useState(5);
  const [voice, setVoice] = useState("gentle_female");
  const [music, setMusic] = useState("none");

  // Inline stressor input on dashboard hero
  const [heroStressor, setHeroStressor] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Replay state — for replaying past guided sessions
  const [pendingReplay, setPendingReplay] = useState<ReplayConfig | null>(null);

  // Quick Breathing Tab settings
  const [breathingTech, setBreathingTech] = useState("box");
  const [breathingMins, setBreathingMins] = useState(5);
  const [showBreathingCustom, setShowBreathingCustom] = useState(false);

  const { session, setSession } = useActiveSession();

  const isBreathingActive = !!standaloneBreathing;
  // Zen mode only applies when viewing the session tab — navigating to Goals/History
  // should show the full UI layout (sidebars visible)
  const isOnSessionTab =
    (currentTab === "meditation" && (isMeditationZen)) ||
    (currentTab === "breathing" && isBreathingActive);
  const isZenActive = isOnSessionTab && !manualZenDisabled;

  useEffect(() => {
    track("focus_page_viewed");
  }, []);

  useEffect(() => {
    // Reset manual Zen toggle on session/tab changes to start in normal mode
    setManualZenDisabled(true);
  }, [currentTab, standaloneBreathing, isMeditationZen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isZenActive) {
        setManualZenDisabled(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenActive]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBreathingTech(localStorage.getItem("unblock-breathing-tech") || "box");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pendingStr = localStorage.getItem("pending_stressor_session");
      if (pendingStr) {
        try {
          const session = JSON.parse(pendingStr);
          if (session.stressor && session.stressor.trim()) {
            track("guided_session_started", {
              stressor_provided: true,
              duration_mins: session.durationMins || 5,
            });
            setPendingStressor(session.stressor.trim());
            setDurationMins(session.durationMins || 5);
            setVoice(session.voice || "gentle_female");
            setMusic(session.music || "none");
            setDirectFocusMode(false);
            setCurrentTab("meditation");
          }
        } catch (e) {
          console.error("Error parsing pending_stressor_session:", e);
        } finally {
          localStorage.removeItem("pending_stressor_session");
        }
      }
    }
  }, []);

  // Post-checkout success detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        setShowProSuccess(true);
        refetchPlan();
        // Clean up the URL
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        url.searchParams.delete("checkout_id");
        window.history.replaceState({}, "", url.pathname);
        track("pro_activation_celebrated");
      }
    }
  }, [refetchPlan]);

  const handleStartReset = useCallback(() => {
    if (!heroStressor.trim()) return;
    // Prevent starting a new session while one is active
    if (session) return;
    // Check credits before starting
    if (!userIsPro && !hasCredits(credits)) {
      track("paywall_shown", { trigger: "credits" });
      setShowPaywall("credits");
      return;
    }
    track("guided_session_started", {
      stressor_provided: true,
      duration_mins: durationMins,
    });
    setPendingStressor(heroStressor.trim());
    setDirectFocusMode(false);
    setCurrentTab("meditation");
    setHeroStressor("");
  }, [heroStressor, durationMins, userIsPro, credits, session]);

  const handleStartFocusDirectly = useCallback(() => {
    if (session) return;
    track("focus_session_started");
    setPendingStressor("");
    setDirectFocusMode(true);
    setCurrentTab("meditation");
  }, [session]);

  const handleSessionComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setPendingStressor("");
    setDirectFocusMode(false);
    // If replaying, return to the tab they came from
    if (pendingReplay) {
      setCurrentTab(pendingReplay.returnTab);
      setPendingReplay(null);
    } else {
      setCurrentTab("dashboard");
    }
  }, [pendingReplay]);

  const handleReplaySession = useCallback(async (session: SessionRecord, fromTab: string) => {
    if (!session.audio_url) return;

    let playableUrl = session.audio_url;
    if (playableUrl.includes("s3.amazonaws.com") || playableUrl.includes(".s3.")) {
      try {
        const urlObj = new URL(playableUrl);
        const key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
        const res = await fetch(`/api/audio-url?key=${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          playableUrl = data.url;
        }
      } catch (e) {
        console.error("Error fetching presigned S3 URL:", e);
      }
    }

    setPendingReplay({
      audioUrl: playableUrl,
      title: session.intent,
      subtitles: session.subtitles || [],
      duration: session.duration_seconds,
      returnTab: fromTab,
    });
    setCurrentTab("meditation");
  }, []);

  const handleStartBreathing = useCallback((minutes: number) => {
    if (session) return;
    track("breathing_session_started", { duration_mins: minutes });
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      (window as unknown as { __unblockAudioCtx: AudioContext }).__unblockAudioCtx = ctx;
    } catch (e) {
      console.warn("Audio context failed:", e);
    }
    setStandaloneBreathing({ durationMinutes: minutes });
  }, [session]);

  const handleBreathingComplete = useCallback(async (durationSeconds: number) => {
    setSession(null); // Clear active session from context
    setStandaloneBreathing(undefined);
    if (durationSeconds > 0) {
      const habits = await getHabits();
      const breathingHabit = habits.find((h) => h.name.toLowerCase().includes("breath"));

      const resolvedHabit = breathingHabit || await addHabit("Breathing Exercise", "🫁", "primary", 15);

      if (resolvedHabit) {
        await saveSession("Breathing", durationSeconds, resolvedHabit.id, false, "breathing");
        track("breathing_session_completed", {
          duration_mins: Math.round(durationSeconds / 60),
          duration_seconds: durationSeconds,
          goal_name: resolvedHabit.name,
        });
      }
      setSuccessMessage(`Breathing complete: ${Math.round(durationSeconds / 60)} minutes recorded.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, [setSession]);

  // Tab navigation handler — sessions persist via CSS hidden, so no state clearing needed
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== "meditation") {
      setPendingStressor("");
      setDirectFocusMode(false);
    }
    setCurrentTab(tabId);
  }, []);

  // Resume handler for the sidebar mini-timer card
  const handleResumeSession = useCallback(() => {
    if (session?.sourceTab === "breathing") {
      setCurrentTab("breathing");
    } else {
      setCurrentTab("meditation");
    }
  }, [session]);

  // Suggestions — same as MeditationTab for consistency
  const heroSuggestions = [
    "Pitch deck due tomorrow",
    "Can't focus, keep checking phone",
    "Feeling overwhelmed",
    "Exam anxiety",
  ];

  return (
    <DashboardLayout
      activeTab={currentTab}
      onTabChange={handleTabChange}
      onAddHabit={() => setShowHabitManager(true)}
      zenMode={isZenActive && (currentTab === "meditation" || currentTab === "breathing")}
    >
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* ===== Center Content ===== */}
        {currentTab === "dashboard" && (
          <section className="flex-1 p-6 md:p-12 overflow-y-auto" key={refreshKey}>
            {/* Hero — Inline Session Starter */}
            <div className="relative w-full">
              <div className="max-w-2xl w-full mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-on-surface mb-4 leading-tight">
                  Clear your head.
                  <br />
                  <span className="text-primary-container">Get to work.</span>
                </h1>
                <p className="text-on-surface-variant text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
                  A personalized guided session to clear what&apos;s blocking you, then a
                  focus session to get your deep work done.
                </p>

                {/* Inline stressor input */}
                <div className="bg-surface-container-low p-5 md:p-6 rounded-2xl border border-outline-variant/15 space-y-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-2xl" />
                  <div className="relative z-10 space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      What&apos;s blocking you right now?
                    </label>
                     <textarea
                      ref={textareaRef}
                      value={heroStressor}
                      onChange={(e) => setHeroStressor(e.target.value)}
                      placeholder="e.g. Can't focus, pitch deck panic, feeling like a fraud..."
                      rows={2}
                      className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-on-surface-variant/40 resize-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      {heroSuggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setHeroStressor(s);
                            textareaRef.current?.focus();
                          }}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Inline Customization Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 pb-2">
                      {/* Reset Duration */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                          Duration
                        </label>
                        <CustomSelect
                          size="sm"
                          value={durationMins}
                          onChange={(val) => setDurationMins(Number(val))}
                          options={[
                            { value: 2, label: "2 Minutes (Quick)" },
                            { value: 5, label: "5 Minutes (Standard)" },
                            { value: 10, label: "10 Minutes (Deep)" },
                          ]}
                        />
                      </div>

                      {/* Voice */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                          Voice Guide
                        </label>
                        <CustomSelect
                          size="sm"
                          value={voice}
                          onChange={setVoice}
                          options={[
                            { value: "gentle_female", label: "Calm" },
                            { value: "soft_male", label: "Steady" },
                          ]}
                        />
                      </div>

                      {/* Background Audio */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                          Background Audio
                        </label>
                        <CustomSelect
                          size="sm"
                          value={music}
                          onChange={setMusic}
                          options={[
                            { value: "none", label: "Voice Only" },
                            { value: "ambient", label: "Calm Ambient" },
                          ]}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleStartReset}
                      disabled={!heroStressor.trim() || !!session}
                      className={`w-full glow-button py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${(!heroStressor.trim() || !!session) ? "opacity-50 pointer-events-none" : "hover:scale-[1.01] active:scale-95"
                        }`}
                    >
                      ⚡ Start Guided Session
                    </button>
                  </div>
                </div>

                {/* Secondary: direct focus — hidden when a session is already active */}
                {!session && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleStartFocusDirectly}
                      className="mt-4 text-sm text-on-surface-variant/60 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      Skip to focus session →
                    </button>
                  </div>
                )}

                {/* Success message */}
                {successMessage && (
                  <div className="mt-6 p-4 rounded-xl bg-green-500/5 border border-green-500/15 text-center">
                    <p className="text-sm text-green-400 font-medium">{successMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ===== MeditationTab — stays mounted (hidden) during active guided/focus sessions ===== */}
        {(currentTab === "meditation" || (session?.sourceTab === "meditation")) && (
          <div className={currentTab === "meditation" ? "contents" : "hidden"}>
            <MeditationTab
              initialStressor={pendingStressor}
              directFocusMode={directFocusMode}
              initialDurationMins={durationMins}
              initialVoice={voice}
              initialMusic={music}
              onSessionComplete={handleSessionComplete}
              onZenModeChange={setIsMeditationZen}
              zenActive={isZenActive}
              onToggleZen={() => setManualZenDisabled((prev) => !prev)}
              replayConfig={pendingReplay}
              onClearReplay={() => setPendingReplay(null)}
            />
          </div>
        )}

        <div className={currentTab === "goals" ? "contents" : "hidden"}>
          <HabitsTab onAddHabit={() => setShowHabitManager(true)} />
        </div>

        <div className={currentTab === "history" ? "contents" : "hidden"}>
          <HistoryTab
            onReplaySession={(s) => handleReplaySession(s, "history")}
          />
        </div>

        {/* ===== Breathing — stays mounted (hidden) during active breathing sessions ===== */}
        {(currentTab === "breathing" || (session?.sourceTab === "breathing")) && (
          <div className={currentTab === "breathing" ? "contents" : "hidden"}>
            {standaloneBreathing ? (
              <div className="flex-1 p-6 md:p-12 overflow-y-auto">
                <div className="max-w-2xl w-full mx-auto">
                  <Breathing
                    durationMinutes={standaloneBreathing.durationMinutes}
                    onComplete={handleBreathingComplete}
                    zenActive={isZenActive}
                    onToggleZen={() => setManualZenDisabled((prev) => !prev)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 p-6 md:p-12 space-y-10 overflow-y-auto">
                <div className="max-w-2xl w-full mx-auto space-y-10">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Breathing</h2>
                    <p className="text-on-surface-variant text-sm">
                      Calm your mind instantly with focused breathing exercises. No setup required, works offline.
                    </p>
                  </div>

                  <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl border border-outline-variant/15 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-2xl" />

                    <div className="relative z-10 space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-on-surface">Set up your breathing session</h3>
                        <p className="text-xs text-on-surface-variant">Pick a technique and duration, then begin.</p>
                      </div>

                      {/* Breathing Technique */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Select Technique
                        </label>
                        <CustomSelect
                          size="sm"
                          value={breathingTech}
                          onChange={(val) => {
                            if (!canUseBreathingTechnique(planType, val)) {
                              track("paywall_shown", { trigger: "breathing" });
                              setShowPaywall("breathing");
                              return;
                            }
                            setBreathingTech(val);
                            localStorage.setItem("unblock-breathing-tech", val);
                          }}
                          options={[
                            { value: "box", label: "Box Breathing (Four equal sides)" },
                            { value: "physiological_sigh", label: `Double Breath (Instant sigh relief)${!userIsPro ? " 🔒" : ""}` },
                            { value: "relaxing_478", label: `4-7-8 Calm (Deep relaxation)${!userIsPro ? " 🔒" : ""}` },
                            { value: "alternate_nostril", label: `Alternate Nostril (Balance & focus)${!userIsPro ? " 🔒" : ""}` },
                            { value: "wim_hof", label: `Power Breath (Advanced energy)${!userIsPro ? " 🔒" : ""}` },
                          ]}
                        />
                      </div>

                      {/* Duration */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Duration
                        </label>
                        <CustomSelect
                          size="sm"
                          value={showBreathingCustom ? "custom" : breathingMins}
                          onChange={(val) => {
                            if (val === "custom") {
                              setShowBreathingCustom(true);
                              setBreathingMins(5);
                            } else {
                              setShowBreathingCustom(false);
                              setBreathingMins(Number(val));
                            }
                          }}
                          options={[
                            { value: 2, label: "2 Minutes (Quick)" },
                            { value: 5, label: "5 Minutes (Standard)" },
                            { value: 10, label: "10 Minutes (Deep)" },
                            { value: "custom", label: "Custom..." },
                          ]}
                        />
                        {showBreathingCustom && (
                          <div className="mt-2.5 animate-in slide-in-from-top-1 duration-200 flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={180}
                              value={breathingMins}
                              onChange={(e) => {
                                const val = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                                setBreathingMins(val);
                              }}
                              className="w-24 bg-surface-container-highest border border-outline-variant/15 rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 text-center font-mono font-bold"
                            />
                            <span className="text-xs text-on-surface-variant/70 font-medium">Minutes</span>
                          </div>
                        )}
                      </div>

                      {/* Primary Start Button — disabled when another session is active */}
                      <button
                        onClick={() => handleStartBreathing(breathingMins)}
                        disabled={!!session}
                        className={`w-full glow-button py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${session ? "opacity-50 pointer-events-none" : "hover:scale-[1.01] active:scale-95"}`}
                      >
                        🫁 Start Breathing Session — {breathingMins} min
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== Right Sidebar ===== */}
        <aside
          className={`hidden lg:flex bg-surface-container-lowest border-outline-variant/5 flex-col transition-all duration-500 ease-in-out overflow-hidden ${
            isZenActive
              ? "w-0 !p-0 border-none opacity-0 pointer-events-none"
              : "w-80 border-l p-8 opacity-100"
          } gap-10`}
        >
          {/* Dynamic session card — idle / flow visualizer / mini timer */}
          <SidebarSessionCard
            currentTab={currentTab}
            onStartFocusDirectly={handleStartFocusDirectly}
            onResumeSession={handleResumeSession}
          />

          {/* Daily Goal Progress */}
          <DailyGoalProgress />

          {/* Insight card */}
          <div className="bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/10">
            <p className="text-[10px] text-primary font-bold uppercase mb-2">
              Insight
            </p>
            <p className="text-xs text-on-surface-variant italic leading-relaxed">
              &ldquo;Start with just 5 minutes. Once you begin, momentum takes
              over. The hardest part is pressing play.&rdquo;
            </p>
          </div>
        </aside>
      </div>

      {/* Habit Manager Modal */}
      {showHabitManager && (
        <HabitManager
          onClose={() => setShowHabitManager(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          trigger={showPaywall}
          onClose={() => setShowPaywall(null)}
        />
      )}

      {/* Pro Success Modal */}
      {showProSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            onClick={() => setShowProSuccess(false)}
          />
          <div className="relative w-full max-w-sm bg-surface-container-low border border-outline-variant/15 rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 pointer-events-none" />
            <div className="relative z-10 p-10 text-center">
              <span className="text-5xl mb-6 block">🎉</span>
              <h2 className="text-2xl font-bold tracking-tight text-on-surface mb-3">
                Welcome to Unblock Pro!
              </h2>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
                100 guided session resets have been added to your account.
              </p>
              <p className="text-on-surface-variant/60 text-xs leading-relaxed mb-8">
                You now have access to all focus durations, advanced breathing techniques, and your full session archive.
              </p>
              <button
                onClick={() => setShowProSuccess(false)}
                className="w-full glow-button py-3.5 rounded-xl text-sm font-bold hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                Let’s go →
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
