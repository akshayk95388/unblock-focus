"use client";

import { useState } from "react";
import { getHabits, type Habit } from "@/lib/habits";

interface DeepWorkModalProps {
  onStart: (intentText: string, durationMinutes: number, habitId?: string) => void;
  onClose: () => void;
}

const DURATION_PRESETS = [15, 25, 45, 60, 90, 120];

export default function DeepWorkModal({ onStart, onClose }: DeepWorkModalProps) {
  const [intent, setIntent] = useState("");
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | undefined>();

  const habits: Habit[] = getHabits();

  const handleStart = () => {
    const finalDuration = showCustom ? parseInt(customDuration) || 25 : duration;
    if (finalDuration < 1) return;
    onStart(
      intent.trim() || "Deep Work Session",
      finalDuration,
      selectedHabitId
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              Deep Work
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-on-surface-variant text-sm">
            Jump straight into focused work. No warm-up.
          </p>
        </div>

        <div className="px-8 pb-8 space-y-6">
          {/* Intent */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 block">
              What are you working on?
            </label>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Write the API docs"
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              autoFocus
            />
          </div>

          {/* Habit Selector */}
          {habits.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 block">
                Link to habit (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedHabitId(undefined)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    !selectedHabitId
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  None
                </button>
                {habits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHabitId(h.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedHabitId === h.id
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {h.emoji} {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 block">
              Duration
            </label>
            {!showCustom ? (
              <div className="grid grid-cols-3 gap-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      duration === d
                        ? "bg-primary text-on-primary-fixed shadow-md"
                        : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    {d >= 60 ? `${d / 60}h` : `${d}m`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Minutes"
                  min={1}
                  max={480}
                  className="flex-1 bg-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                  autoFocus
                />
                <span className="text-on-surface-variant text-sm font-medium">min</span>
              </div>
            )}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="text-primary/80 hover:text-primary text-xs font-medium mt-2 transition-colors"
            >
              {showCustom ? "← Use presets" : "Custom duration"}
            </button>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full glow-button py-4 rounded-xl text-on-primary-fixed font-bold text-sm transition-all hover:scale-[1.01] active:scale-95"
          >
            Start Deep Work — {showCustom ? (parseInt(customDuration) || 25) : duration} min
          </button>
        </div>
      </div>
    </div>
  );
}
