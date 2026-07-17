"use client";

import { useState, useEffect } from "react";
import { getHabits, type Habit } from "@/lib/habits";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isPro, canUseFocusDuration } from "@/lib/plans";
import { track } from "@/lib/mixpanel";
import CustomSelect from "@/components/ui/CustomSelect";
import PaywallModal from "@/components/ui/PaywallModal";

interface FocusSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (task: string, duration: number, habitId: string) => void;
}

export default function FocusSetupModal({
  isOpen,
  onClose,
  onStart,
}: FocusSetupModalProps) {
  const [workTask, setWorkTask] = useState("");
  const [focusDuration, setFocusDuration] = useState(25);
  const [showFocusCustom, setShowFocusCustom] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [showPaywall, setShowPaywall] = useState<"duration" | null>(null);

  const { planType } = useUserPlan();
  const userIsPro = isPro(planType);

  // Load habits on mount
  useEffect(() => {
    if (isOpen) {
      async function loadHabits() {
        const list = await getHabits();
        setHabits(list);
        if (list.length > 0) {
          const found = list.find(
            (h) =>
              h.name.toLowerCase().includes("focus") ||
              h.name.toLowerCase().includes("work") ||
              h.name.toLowerCase().includes("study")
          );
          setSelectedHabitId(found ? found.id : list[0].id);
        }
      }
      loadHabits();
    }
  }, [isOpen]);

  // Reset local state when opening
  useEffect(() => {
    if (isOpen) {
      setWorkTask("");
      setFocusDuration(25);
      setShowFocusCustom(false);
      setShowPaywall(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartClick = () => {
    const task = workTask.trim() || "Focused Work";
    onStart(task, focusDuration, selectedHabitId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-surface-container-low border border-outline-variant/15 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 z-10">
        {/* Obsidian Ember background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 pointer-events-none rounded-3xl overflow-hidden" />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-on-surface">
                Set up your focus session
              </h3>
              <p className="text-xs text-on-surface-variant/70">
                Set your task, duration, and goal, then begin.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-on-surface-variant/50 hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Work task */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                What will you work on?
              </label>
              <input
                type="text"
                value={workTask}
                onChange={(e) => setWorkTask(e.target.value)}
                placeholder="e.g. Write the intro section of my pitch deck"
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-on-surface-variant/40"
                autoFocus
              />
            </div>

            {/* Duration select */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Focus session duration
              </label>
              <CustomSelect
                size="sm"
                value={showFocusCustom ? "custom" : focusDuration}
                onChange={(val) => {
                  if (!canUseFocusDuration(planType, val)) {
                    track("paywall_shown", { trigger: "duration" });
                    setShowPaywall("duration");
                    return;
                  }
                  if (val === "custom") {
                    setShowFocusCustom(true);
                    setFocusDuration(30);
                  } else {
                    setShowFocusCustom(false);
                    setFocusDuration(Number(val));
                  }
                }}
                options={[
                  { value: 15, label: "15 min (Quick)" },
                  { value: 25, label: "25 min (Classic)" },
                  { value: 45, label: `45 min (Standard)${!userIsPro ? " 🔒" : ""}` },
                  { value: 90, label: `90 min (Extended)${!userIsPro ? " 🔒" : ""}` },
                  { value: "custom", label: `Custom...${!userIsPro ? " 🔒" : ""}` },
                ]}
              />
              {showFocusCustom && (
                <div className="mt-2 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={focusDuration}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(360, Number(e.target.value) || 1));
                      setFocusDuration(val);
                    }}
                    className="w-24 bg-surface-container-highest border border-outline-variant/15 rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 text-center font-mono font-bold"
                  />
                  <span className="text-xs text-on-surface-variant/70 font-medium">Minutes</span>
                </div>
              )}
            </div>

            {/* Track under goal */}
            {habits.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Track under goal (optional)
                </label>
                <CustomSelect
                  size="sm"
                  value={selectedHabitId}
                  onChange={setSelectedHabitId}
                  options={[
                    { value: "", label: "None" },
                    ...habits.map((h) => ({
                      value: h.id,
                      label: `${h.emoji} ${h.name}`,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleStartClick}
            className="w-full glow-button py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
          >
            ⚡ Start Focus Session
          </button>
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          trigger={showPaywall}
          onClose={() => setShowPaywall(null)}
        />
      )}
    </div>
  );
}
