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
  showChevron?: boolean;
  icon?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  size = "md",
  showChevron = false,
  icon,
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
  const triggerPadding = size === "sm" 
    ? (showChevron ? "px-3 py-1.5 pr-8" : "px-3 py-1.5") 
    : (showChevron ? "px-4 py-2.5 pr-10" : "px-4 py-2.5");

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-surface-container-highest/60 hover:bg-surface-container-highest rounded-xl ${triggerPadding} ${textClass} text-on-surface text-left cursor-pointer flex items-center justify-between gap-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors border border-outline-variant/10`}
      >
        <span className="truncate flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          <span>{selected?.label ?? "Select…"}</span>
        </span>
        {showChevron && (
          <span className="pointer-events-none shrink-0">
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
        )}
      </button>

      {/* Options panel */}
      {open && (
        <div className="absolute z-50 mt-1.5 min-w-full w-max bg-surface-container-highest rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100 left-0">
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
                className={`w-full text-left px-4 py-2.5 ${textClass} transition-colors flex items-center justify-between gap-4 whitespace-nowrap ${
                  isSelected
                    ? "text-primary-container bg-surface-container-high font-medium"
                    : "text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
                <span className="w-4 shrink-0 flex items-center justify-end">
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-primary-container" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
