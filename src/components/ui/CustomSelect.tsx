"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  size?: "sm" | "md";
}

export default function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  size = "md",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    function onClose(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClose);
    return () => document.removeEventListener("mousedown", onClose);
  }, [open]);

  const textClass = size === "sm" ? "text-xs" : "text-sm";
  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const triggerPadding = size === "sm" ? "px-3 py-2.5" : "px-4 py-3";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-surface-container-highest rounded-xl ${triggerPadding} pr-10 ${textClass} text-on-surface text-left cursor-pointer flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors hover:bg-surface-container-highest/80`}
      >
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className={`${iconClass} text-on-surface-variant opacity-60 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      {/* Options panel */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-surface-container-highest rounded-xl border border-outline-variant/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(String(option.value));
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 ${textClass} transition-colors flex items-center gap-2 ${
                  isSelected
                    ? "text-primary-container bg-surface-container-high"
                    : "text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="w-3.5 shrink-0 flex items-center">
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-primary-container" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
