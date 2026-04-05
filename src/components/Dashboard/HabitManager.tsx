"use client";

import { useState } from "react";
import { addHabit, type Habit } from "@/lib/habits";

interface HabitManagerProps {
  onClose: () => void;
  onCreated: (habit: Habit) => void;
}

const EMOJI_OPTIONS = ["🔥", "📚", "💪", "✍️", "🧘", "💻", "🎨", "🎯", "📱", "🧠"];
const COLOR_OPTIONS = [
  { id: "primary", label: "Ember", className: "bg-primary-container" },
  { id: "secondary", label: "Indigo", className: "bg-secondary-container" },
  { id: "tertiary", label: "Gold", className: "bg-tertiary-container" },
];

export default function HabitManager({ onClose, onCreated }: HabitManagerProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🔥");
  const [color, setColor] = useState("primary");
  const [goalMinutes, setGoalMinutes] = useState(30);

  const handleCreate = () => {
    if (!name.trim()) return;
    const habit = addHabit(name.trim(), emoji, color, goalMinutes);
    onCreated(habit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="max-w-md w-full mx-6 glass-panel rounded-2xl p-8 border border-white/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold tracking-tight">New Habit</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Emoji picker */}
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-3">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                  emoji === e
                    ? "bg-primary-container/20 ring-2 ring-primary-container scale-110"
                    : "bg-surface-container-highest hover:bg-surface-container-high"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-3">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Reading, Building App, Tweeting..."
            className="w-full bg-surface-container-highest border-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary-container/50 text-sm"
            autoFocus
          />
        </div>

        {/* Color picker */}
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-3">
            Color
          </label>
          <div className="flex gap-3">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  color === c.id
                    ? "ring-2 ring-white/20 scale-105"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${c.className}`} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daily goal */}
        <div className="mb-8">
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-3">
            Daily Goal
          </label>
          <div className="flex gap-2">
            {[15, 30, 60, 120].map((mins) => (
              <button
                key={mins}
                onClick={() => setGoalMinutes(mins)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  goalMinutes === mins
                    ? "bg-primary-container text-on-primary-fixed"
                    : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="w-full glow-button text-on-primary-fixed font-bold py-4 rounded-xl text-sm transition-all active:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Create Habit
        </button>
      </div>
    </div>
  );
}
