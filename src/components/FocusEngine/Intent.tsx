"use client";

import { useState, useRef, useEffect } from "react";
import { getHabits, type Habit } from "@/lib/habits";

interface IntentProps {
  onSubmit: (intent: string, habitId?: string) => void;
}

const SUGGESTIONS = [
  {
    label: "Drafting",
    text: "Write the first paragraph of my project brief.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
  },
  {
    label: "Logic",
    text: "Refactor the authentication middleware.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    label: "Design",
    text: "Finalize the typography tokens for the design system.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
      </svg>
    ),
  },
];

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

  const handleSuggestionClick = (text: string) => {
    setValue(text);
    inputRef.current?.focus();
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

      {/* Editorial Header */}
      <div
        className={`w-full max-w-3xl mb-12 transition-all duration-700 delay-200 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <span className="text-[11px] uppercase tracking-[0.2em] text-primary mb-4 block opacity-80">
          Phase 01: The Intention
        </span>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-on-surface tracking-[-0.04em] leading-tight">
          Clear the noise.
          <br />
          Define the path.
        </h1>
      </div>

      {/* Habit Selector Chips */}
      {habits.length > 0 && (
        <div
          className={`w-full max-w-3xl mb-8 transition-all duration-700 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold block mb-3">
            Link to habit
          </span>
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
              placeholder="What is the ONE micro-step you need to do?"
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

        {/* Hint */}
        <div className="mt-4 md:mt-6 flex items-center justify-between text-surface-container-highest px-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-surface-container rounded text-[10px] font-mono ghost-border tracking-tighter">
              ENTER
            </span>
            <span className="text-[11px] uppercase tracking-widest">
              to lock intention
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-[11px] uppercase tracking-widest">
                5m challenge
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Micro-steps */}
      <div
        className={`w-full max-w-3xl mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 transition-all duration-700 delay-[600ms] ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => handleSuggestionClick(s.text)}
            className="p-6 rounded-xl bg-surface-container/30 ghost-border hover:border-primary/30 transition-all text-left group"
          >
            <div className="text-primary mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
              {s.icon}
            </div>
            <p className="text-xs uppercase tracking-widest text-surface-container-highest mb-2">
              {s.label}
            </p>
            <p className="text-on-surface text-sm font-medium">{s.text}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
