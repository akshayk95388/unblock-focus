"use client";

import { useState } from "react";
import { track } from "@/lib/mixpanel";

type PaywallTrigger = "credits" | "duration" | "breathing" | "replay";

interface PaywallModalProps {
  trigger: PaywallTrigger;
  onClose: () => void;
  creditsUsed?: number;
}

const CONTENT: Record<
  PaywallTrigger,
  { emoji: string; title: string; subtitle: string; features: string[] }
> = {
  credits: {
    emoji: "⚡",
    title: "You've used all your free resets",
    subtitle:
      "Upgrade to Unblock Pro for unlimited custom guided sessions and keep your momentum going.",
    features: [
      "Unlimited guided sessions (fair use)",
      "All focus durations (45m, 90m, custom)",
      "Advanced breathing techniques",
      "Full session archive",
    ],
  },
  duration: {
    emoji: "⏱️",
    title: "Unlock extended focus sessions",
    subtitle:
      "Free accounts include 25-minute focus sessions. Upgrade to Pro for 45-minute, 90-minute, and custom deep work blocks.",
    features: [
      "45-minute standard blocks",
      "90-minute deep work blocks",
      "Custom duration — set any length",
      "Unlimited guided sessions",
    ],
  },
  breathing: {
    emoji: "🫁",
    title: "Unlock advanced breathing",
    subtitle:
      "Free accounts include Box Breathing. Upgrade to Pro for 4-7-8 Calm, Alternate Nostril, Power Breath, and more.",
    features: [
      "4-7-8 Calm (deep relaxation)",
      "Double Breath (instant relief)",
      "Alternate Nostril (balance & focus)",
      "Power Breath (advanced energy)",
    ],
  },
  replay: {
    emoji: "🔓",
    title: "Unlock your session archive",
    subtitle:
      "Free accounts can replay the 3 most recent guided sessions. Upgrade to Pro for unlimited access to your full archive.",
    features: [
      "Replay any past guided session",
      "Build a personal audio library",
      "Unlimited session history",
      "Favorite & organize sessions",
    ],
  },
};

export default function PaywallModal({
  trigger,
  onClose,
  creditsUsed,
}: PaywallModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const content = CONTENT[trigger];

  const handleUpgrade = (plan: "pro_monthly" | "pro_yearly") => {
    track("checkout_started", { trigger, plan });
    window.location.href = `/api/checkout?plan=${plan}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface-container-low border border-outline-variant/15 rounded-3xl overflow-hidden shadow-2xl">
        {/* Ambient gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        <div className="relative z-10 p-8 md:p-10">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-highest/50 hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">{content.emoji}</span>
            <h2
              id="paywall-title"
              className="text-2xl font-bold tracking-tight text-on-surface mb-3"
            >
              {content.title}
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {content.subtitle}
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-3 mb-8">
            {content.features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <svg
                    className="w-3 h-3 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                </div>
                <span className="text-sm text-on-surface">{feature}</span>
              </div>
            ))}
          </div>

          {/* Billing cycle toggle */}
          <div className="flex gap-1 bg-surface-container-highest/50 p-1 rounded-xl mb-6">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                billingCycle === "monthly"
                  ? "bg-surface-container-low text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-surface-container-low text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Yearly
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold normal-case">
                Save 43%
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="text-center mb-6">
            {billingCycle === "monthly" ? (
              <div>
                <span className="text-4xl font-bold text-on-surface">$29</span>
                <span className="text-on-surface-variant text-sm ml-1">
                  / month
                </span>
              </div>
            ) : (
              <div>
                <span className="text-4xl font-bold text-on-surface">$199</span>
                <span className="text-on-surface-variant text-sm ml-1">
                  / year
                </span>
                <p className="text-xs text-on-surface-variant mt-1">
                  That&apos;s just $16.58/mo — less than $0.55/day
                </p>
              </div>
            )}
          </div>

          {/* CTA button */}
          <button
            onClick={() =>
              handleUpgrade(
                billingCycle === "monthly" ? "pro_monthly" : "pro_yearly"
              )
            }
            className="w-full glow-button py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
          >
            Upgrade to Pro
          </button>

          <p className="text-center text-[10px] text-on-surface-variant/50 mt-4">
            Cancel anytime. Secure checkout via Polar.
          </p>
        </div>
      </div>
    </div>
  );
}
