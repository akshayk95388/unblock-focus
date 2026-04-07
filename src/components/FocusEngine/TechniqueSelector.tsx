"use client";

import { useState, useEffect, useRef } from "react";
import { BREATHING_TECHNIQUES } from "@/lib/breathingConfig";

export default function TechniqueSelector({ className }: { className?: string }) {
  const [tech, setTech] = useState("box");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTech(localStorage.getItem("unblock-breathing-tech") || "box");
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setTech(id);
    localStorage.setItem("unblock-breathing-tech", id);
    setIsOpen(false);
  };

  const activeTechName = BREATHING_TECHNIQUES[tech]?.name || "Select";

  return (
    <div className="relative group w-full" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center w-full transition-all ${
          className || "bg-surface-container-high text-xs font-bold text-on-surface rounded-full px-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 border border-transparent hover:border-outline-variant/30 shadow-sm"
        } ${isOpen ? "ring-1 ring-primary/50" : ""}`}
      >
        <span className="truncate pr-2">{activeTechName}</span>
        <svg 
          className={`w-3 h-3 text-on-surface-variant shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2.5} 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[140px] bg-surface-container-highest border border-outline-variant/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col py-1.5">
            {Object.values(BREATHING_TECHNIQUES).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                className={`px-4 py-2.5 text-left text-xs transition-colors flex items-center justify-between ${
                  tech === t.id 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-on-surface hover:bg-surface-container-low font-medium"
                }`}
              >
                <span className="whitespace-nowrap">{t.name}</span>
                {tech === t.id && (
                  <svg className="w-3 h-3 text-primary ml-2 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
