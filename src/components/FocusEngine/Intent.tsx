"use client";

import { useState, useRef, useEffect } from "react";
import { getHabits, type Habit } from "@/lib/habits";

interface IntentProps {
  onSubmit: (intent: string, habitId?: string) => void;
}



export default function Intent({ onSubmit }: IntentProps) {
  const [value, setValue] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHabits(getHabits());
    // Focus input after mount animation
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed, selectedHabitId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };


  return (
    <main
      className={`relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden px-6 py-20 transition-opacity duration-700 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Background Depth Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-secondary-container opacity-5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] bg-primary-container opacity-[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Habit Selector Chips */}
      {habits.length > 0 && (
        <div
          className={`w-full max-w-3xl mb-8 transition-all duration-700 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex flex-wrap gap-2">
            {habits.map((h) => (
              <button
                key={h.id}
                onClick={() =>
                  setSelectedHabitId(
                    selectedHabitId === h.id ? undefined : h.id
                  )
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedHabitId === h.id
                    ? "bg-primary-container/20 text-primary-container ring-1 ring-primary-container/30"
                    : "bg-surface-container-highest/60 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
              >
                <span>{h.emoji}</span>
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Central Focus Input Area */}
      <div
        className={`w-full max-w-3xl relative group transition-all duration-700 delay-400 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Gradient border glow on focus */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-container to-secondary-container rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-1000 group-hover:duration-200" />

        <div className="relative bg-surface-container-low rounded-2xl p-4 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-2xl">
          <div className="flex-grow w-full">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g., Write the first paragraph..."
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-xl md:text-2xl lg:text-3xl font-light text-on-surface placeholder:text-surface-container-highest placeholder:italic py-2"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="w-full md:w-auto px-8 py-5 bg-primary-container text-on-primary-fixed rounded-full font-bold text-sm tracking-tight flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(255,130,60,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap shrink-0"
          >
            Start Instant Focus
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
