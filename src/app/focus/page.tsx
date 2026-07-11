"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import DailyGoalProgress from "@/components/Dashboard/DailyGoalProgress";
import HabitManager from "@/components/Dashboard/HabitManager";
import HabitsTab from "@/components/Dashboard/HabitsTab";
import HistoryTab from "@/components/Dashboard/HistoryTab";
import MeditationTab from "@/components/Dashboard/MeditationTab";
import Breathing from "@/components/FocusEngine/Breathing";
import CustomSelect from "@/components/ui/CustomSelect";
import { saveSession } from "@/lib/sessions";
import { getHabits, addHabit } from "@/lib/habits";

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [showHabitManager, setShowHabitManager] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [standaloneBreathing, setStandaloneBreathing] = useState<{ durationMinutes: number }>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Quick Breathing Tab settings
  const [breathingTech, setBreathingTech] = useState("box");
  const [breathingMins, setBreathingMins] = useState(5);
  const [showBreathingCustom, setShowBreathingCustom] = useState(false);

  const isBreathingActive = !!standaloneBreathing;
  const isZenActive = (isBreathingActive || isMeditationZen) && !manualZenDisabled;

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

  const handleStartReset = useCallback(() => {
    if (!heroStressor.trim()) return;
    setPendingStressor(heroStressor.trim());
    setDirectFocusMode(false);
    setCurrentTab("meditation");
    setHeroStressor("");
  }, [heroStressor]);

  const handleStartFocusDirectly = useCallback(() => {
    setPendingStressor("");
    setDirectFocusMode(true);
    setCurrentTab("meditation");
  }, []);

  const handleSessionComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setPendingStressor("");
    setDirectFocusMode(false);
    setCurrentTab("dashboard");
  }, []);

  const handleStartBreathing = useCallback((minutes: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      (window as unknown as { __unblockAudioCtx: AudioContext }).__unblockAudioCtx = ctx;
    } catch (e) {
      console.warn("Audio context failed:", e);
    }
    setStandaloneBreathing({ durationMinutes: minutes });
  }, []);

  const handleBreathingComplete = useCallback((durationSeconds: number) => {
    setStandaloneBreathing(undefined);
    if (durationSeconds > 0) {
      const habits = getHabits();
      const breathingHabit = habits.find((h) => h.name.toLowerCase().includes("breath"));

      const resolvedHabit = breathingHabit || addHabit("Breathing Exercise", "🫁", "primary", 15);

      saveSession("Breathing", durationSeconds, resolvedHabit.id, false);
      setSuccessMessage(`Breathing complete: ${Math.round(durationSeconds / 60)} minutes recorded.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, []);

  // When tab changes away from meditation, clear pending props
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== "meditation") {
      setPendingStressor("");
      setDirectFocusMode(false);
    }
    setCurrentTab(tabId);
  }, []);

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
      zenMode={isZenActive}
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
                      disabled={!heroStressor.trim()}
                      className={`w-full glow-button py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${!heroStressor.trim() ? "opacity-50 pointer-events-none" : "hover:scale-[1.01] active:scale-95"
                        }`}
                    >
                      ⚡ Start Guided Session
                    </button>
                  </div>
                </div>

                {/* Secondary: direct focus */}
                <div className="flex justify-center">
                  <button
                    onClick={handleStartFocusDirectly}
                    className="mt-4 text-sm text-on-surface-variant/60 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    Skip to focus session →
                  </button>
                </div>
              </div>
            </div>

            {/* Success toast */}
            {successMessage && (
              <div className="fixed bottom-6 right-6 z-50 bg-surface-container-low border border-green-500/20 rounded-xl px-6 py-3 shadow-2xl">
                <p className="text-sm font-bold text-green-400">{successMessage}</p>
              </div>
            )}
          </section>
        )}

        {currentTab === "meditation" && (
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
          />
        )}

        {currentTab === "goals" && (
          <HabitsTab onAddHabit={() => setShowHabitManager(true)} />
        )}

        {currentTab === "history" && <HistoryTab />}

        {currentTab === "breathing" && (
          standaloneBreathing ? (
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
                          setBreathingTech(val);
                          localStorage.setItem("unblock-breathing-tech", val);
                        }}
                        options={[
                          { value: "box", label: "Box Breathing (Four equal sides)" },
                          { value: "physiological_sigh", label: "Double Breath (Instant sigh relief)" },
                          { value: "relaxing_478", label: "4-7-8 Calm (Deep relaxation)" },
                          { value: "alternate_nostril", label: "Alternate Nostril (Balance & focus)" },
                          { value: "wim_hof", label: "Power Breath (Advanced energy)" },
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

                    {/* Primary Start Button */}
                    <button
                      onClick={() => handleStartBreathing(breathingMins)}
                      className="w-full glow-button py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                    >
                      🫁 Start Breathing Session — {breathingMins} min
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* ===== Right Sidebar ===== */}
        <aside
          className={`hidden lg:flex bg-surface-container-lowest border-outline-variant/5 flex-col transition-all duration-500 ease-in-out overflow-hidden ${
            isZenActive
              ? "w-0 !p-0 border-none opacity-0 pointer-events-none"
              : "w-80 border-l p-8 opacity-100"
          } gap-10`}
        >
          {/* Timer Preview */}
          <button
            onClick={handleStartFocusDirectly}
            className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-300 border border-outline-variant/10 w-full cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-30 group-hover:opacity-40 transition-opacity" />
            <div className="relative z-10">
              <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 group-hover:text-primary-container transition-colors">
                Focus Session
              </p>
              <div className="text-5xl font-light tracking-tighter text-on-surface mb-2 font-mono tabular-nums">
                25:00
              </div>
              <p className="text-on-surface-variant text-xs font-medium group-hover:text-on-surface transition-colors">
                Start focus session →
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-container-highest group-hover:bg-primary transition-colors" />
          </button>

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


    </DashboardLayout>
  );
}
