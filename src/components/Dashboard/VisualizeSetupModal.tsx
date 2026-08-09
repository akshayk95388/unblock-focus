"use client";

import { useState, useEffect } from "react";
import { useHabits } from "@/lib/queries";
import CustomSelect from "@/components/ui/CustomSelect";

interface VisualizeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (goal: string, durationMins: number, voice: string, habitId?: string) => void;
}

const VISUALIZATION_SUGGESTIONS = [
  "Launch my product successfully",
  "Ace my investor pitch",
  "Build a thriving team",
  "Hit my revenue goal",
];

export default function VisualizeSetupModal({
  isOpen,
  onClose,
  onStart,
}: VisualizeSetupModalProps) {
  const [goal, setGoal] = useState("");
  const [durationMins, setDurationMins] = useState(3);
  const [voice, setVoice] = useState("warm_male");
  const { habits } = useHabits();
  const [selectedHabitId, setSelectedHabitId] = useState("");

  // Auto-select a relevant habit when the modal opens and habits are available
  useEffect(() => {
    if (isOpen && habits.length > 0 && !selectedHabitId) {
      const found = habits.find(
        (h) =>
          h.name.toLowerCase().includes("meditation") ||
          h.name.toLowerCase().includes("vision") ||
          h.name.toLowerCase().includes("focus")
      );
      setSelectedHabitId(found ? found.id : habits[0].id);
    }
  }, [isOpen, habits, selectedHabitId]);

  // Reset local state when opening
  useEffect(() => {
    if (isOpen) {
      setGoal("");
      setDurationMins(3);
      setVoice("warm_male");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartClick = () => {
    const trimmed = goal.trim();
    if (!trimmed) return;
    onStart(trimmed, durationMins, voice, selectedHabitId);
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
        {/* Background glow matching FocusSetupModal */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 pointer-events-none rounded-3xl overflow-hidden" />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-on-surface">
                Set up your vision session
              </h3>
              <p className="text-xs text-on-surface-variant/70">
                Prime your mind through guided mental imagery.
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
            {/* Goal input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                What goal do you want to visualize?
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Launch my SaaS to 10,000 users"
                rows={2}
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-on-surface-variant/40 resize-none leading-relaxed"
                autoFocus
              />
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2">
              {VISUALIZATION_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setGoal(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface-container-highest/50 hover:bg-surface-container-highest text-on-surface-variant/70 hover:text-on-surface transition-all cursor-pointer border border-outline-variant/10 hover:border-outline-variant/30"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Duration selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Duration
              </label>
              <CustomSelect
                size="sm"
                showChevron
                value={durationMins}
                onChange={(val) => setDurationMins(Number(val))}
                options={[
                  { value: 3, label: "Quick (3 min)" },
                  { value: 5, label: "Deep (5 min)" },
                ]}
              />
            </div>

            {/* Voice selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Voice
              </label>
              <CustomSelect
                size="sm"
                showChevron
                value={voice}
                onChange={setVoice}
                options={[
                  { value: "warm_male", label: "Kai · Warm" },
                  { value: "calm_female", label: "Aria · Calm" },
                ]}
              />
            </div>

            {/* Track under goal (optional) */}
            {habits.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Track under goal (optional)
                </label>
                <CustomSelect
                  size="sm"
                  showChevron
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
            disabled={!goal.trim()}
            className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
              goal.trim()
                ? "glow-button hover:scale-[1.01] active:scale-95 shadow-lg"
                : "bg-surface-container-highest/80 text-on-surface-variant/40 border border-outline-variant/10 cursor-not-allowed"
            }`}
          >
            Start Visualization
          </button>
        </div>
      </div>
    </div>
  );
}
