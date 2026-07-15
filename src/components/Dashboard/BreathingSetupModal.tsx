"use client";

import { useState, useEffect } from "react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isPro, canUseBreathingTechnique } from "@/lib/plans";
import { track } from "@/lib/mixpanel";
import CustomSelect from "@/components/ui/CustomSelect";
import PaywallModal from "@/components/ui/PaywallModal";

interface BreathingSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (techId: string, durationMins: number) => void;
}

export default function BreathingSetupModal({
  isOpen,
  onClose,
  onStart,
}: BreathingSetupModalProps) {
  const [technique, setTechnique] = useState("box");
  const [durationMins, setDurationMins] = useState(5);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [showPaywall, setShowPaywall] = useState<"breathing" | null>(null);

  const { planType } = useUserPlan();
  const userIsPro = isPro(planType);

  // Initialize values when opened
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined") {
        setTechnique(localStorage.getItem("unblock-breathing-tech") || "box");
      }
      setDurationMins(5);
      setShowCustomDuration(false);
      setShowPaywall(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartClick = () => {
    // Persist technique choice so Breathing.tsx loads it on mount
    if (typeof window !== "undefined") {
      localStorage.setItem("unblock-breathing-tech", technique);
    }
    onStart(technique, durationMins);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-surface-container-low border border-outline-variant/15 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 z-10">
        {/* Obsidian Ember background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-on-surface">
                Set up your breathing session
              </h3>
              <p className="text-xs text-on-surface-variant/70">
                Pick a technique and duration, then begin.
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
            {/* Breathing Technique */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Select Technique
              </label>
              <CustomSelect
                size="sm"
                value={technique}
                onChange={(val) => {
                  if (!canUseBreathingTechnique(planType, val)) {
                    track("paywall_shown", { trigger: "breathing" });
                    setShowPaywall("breathing");
                    return;
                  }
                  setTechnique(val);
                }}
                options={[
                  { value: "box", label: "Box Breathing (Four equal sides)" },
                  { value: "physiological_sigh", label: `Double Breath (Instant sigh relief)${!userIsPro ? " 🔒" : ""}` },
                  { value: "relaxing_478", label: `4-7-8 Calm (Deep relaxation)${!userIsPro ? " 🔒" : ""}` },
                  { value: "alternate_nostril", label: `Alternate Nostril (Balance & focus)${!userIsPro ? " 🔒" : ""}` },
                  { value: "wim_hof", label: `Power Breath (Advanced energy)${!userIsPro ? " 🔒" : ""}` },
                ]}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Duration
              </label>
              <CustomSelect
                size="sm"
                value={showCustomDuration ? "custom" : durationMins}
                onChange={(val) => {
                  if (val === "custom") {
                    setShowCustomDuration(true);
                    setDurationMins(5);
                  } else {
                    setShowCustomDuration(false);
                    setDurationMins(Number(val));
                  }
                }}
                options={[
                  { value: 2, label: "2 Minutes (Quick)" },
                  { value: 5, label: "5 Minutes (Standard)" },
                  { value: 10, label: "10 Minutes (Deep)" },
                  { value: "custom", label: "Custom..." },
                ]}
              />
              {showCustomDuration && (
                <div className="mt-2 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durationMins}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                      setDurationMins(val);
                    }}
                    className="w-24 bg-surface-container-highest border border-outline-variant/15 rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 text-center font-mono font-bold"
                  />
                  <span className="text-xs text-on-surface-variant/70 font-medium">Minutes</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStartClick}
            className="w-full glow-button py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
          >
            🫁 Start Breathing Session
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
