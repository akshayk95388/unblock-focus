"use client";

import { useState, useCallback } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import StatCards from "@/components/Dashboard/StatCards";
import TodaySessions from "@/components/Dashboard/TodaySessions";
import DailyGoalProgress from "@/components/Dashboard/DailyGoalProgress";
import ActivityHeatmap from "@/components/Dashboard/ActivityHeatmap";
import HabitManager from "@/components/Dashboard/HabitManager";
import HabitsTab from "@/components/Dashboard/HabitsTab";
import HistoryTab from "@/components/Dashboard/HistoryTab";
import DeepWorkModal from "@/components/Dashboard/DeepWorkModal";
import FocusEngine from "@/components/FocusEngine/FocusEngine";

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [showHabitManager, setShowHabitManager] = useState(false);
  const [showDeepWorkModal, setShowDeepWorkModal] = useState(false);
  const [engineActive, setEngineActive] = useState(false);
  const [directMode, setDirectMode] = useState<{
    intentText: string;
    durationSeconds: number;
    habitId?: string;
  } | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUnblockNow = useCallback(() => {
    // Initialize AudioContext
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      (
        window as unknown as { __unblockAudioCtx: AudioContext }
      ).__unblockAudioCtx = ctx;
    } catch (e) {
      console.warn("AudioContext init failed:", e);
    }

    setDirectMode(undefined);
    setEngineActive(true);
  }, []);

  const handleStartDeepWork = useCallback(
    (intentText: string, durationMinutes: number, habitId?: string) => {
      setShowDeepWorkModal(false);
      setDirectMode({
        intentText,
        durationSeconds: durationMinutes * 60,
        habitId,
      });
      setEngineActive(true);
    },
    []
  );

  const handleExitEngine = useCallback(() => {
    setEngineActive(false);
    setRefreshKey((k) => k + 1); // Force refresh dashboard data
  }, []);

  if (engineActive) {
    return <FocusEngine onExit={handleExitEngine} directMode={directMode} />;
  }

  return (
    <DashboardLayout
      activeTab={currentTab}
      onTabChange={setCurrentTab}
      onAddHabit={() => setShowHabitManager(true)}
    >
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* ===== Center Content ===== */}
        {currentTab === "dashboard" && (
          <section className="flex-1 p-6 md:p-12 space-y-10 md:space-y-12 overflow-y-auto" key={refreshKey}>
          {/* Hero */}
          <div className="relative py-8 md:py-12">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-on-surface mb-4 md:mb-6 leading-tight">
                Find your rhythm.
              </h1>
              <p className="text-on-surface-variant text-base md:text-lg mb-8 md:mb-10 max-w-lg leading-relaxed">
                The noise of the world is a distraction. The ember within is
                your focus. Enter the sanctuary of deep work.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleUnblockNow}
                  className="glow-button px-8 py-4 rounded-xl text-on-primary-fixed font-bold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Unblock Now
                </button>
                <button
                  onClick={() => setShowDeepWorkModal(true)}
                  className="px-8 py-4 rounded-xl bg-surface-container-highest/60 text-on-surface font-bold hover:bg-surface-container-highest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                  </svg>
                  Deep Work
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <StatCards />

          {/* Activity Heatmap */}
          <ActivityHeatmap />

          {/* Today's Sessions */}
          <TodaySessions />
          </section>
        )}

        {currentTab === "habits" && (
          <HabitsTab onAddHabit={() => setShowHabitManager(true)} />
        )}

        {currentTab === "history" && (
          <HistoryTab />
        )}

        {/* ===== Right Sidebar ===== */}
        <aside className="hidden lg:flex w-80 bg-surface-container-lowest border-l border-outline-variant/5 p-8 flex-col gap-10">
          {/* Timer Preview */}
          <div className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-30" />
            <div className="relative z-10">
              <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                Focus Timer
              </p>
              <div className="text-5xl font-light tracking-tighter text-on-surface mb-2 font-mono tabular-nums">
                05:00
              </div>
              <p className="text-on-surface-variant text-xs font-medium">
                Ready when you are
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-container-highest" />
          </div>

          {/* Daily Goal Progress */}
          <DailyGoalProgress />

          {/* Insight card */}
          <div className="mt-auto bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/10">
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

      {/* Deep Work Modal */}
      {showDeepWorkModal && (
        <DeepWorkModal
          onStart={handleStartDeepWork}
          onClose={() => setShowDeepWorkModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
