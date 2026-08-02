"use client";

import { useState } from "react";
import { track } from "@/lib/mixpanel";

type PaywallTrigger = "credits" | "duration" | "breathing" | "replay" | "upgrade";

interface PaywallModalProps {
  trigger: PaywallTrigger;
  onClose: () => void;
}

const CONTENT: Record<
  PaywallTrigger,
  { title: string; subtitle: string; features: string[] }
> = {
  upgrade: {
    title: "Upgrade to Unblock Pro",
    subtitle:
      "Unlock unlimited guided sessions, extended focus timers, and advanced breathing techniques.",
    features: [
      "Unlimited guided sessions (fair use)",
      "All focus durations (45m, 90m, custom)",
      "Advanced breathing techniques",
      "Full session archive",
    ],
  },
  credits: {
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
}: PaywallModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const content = CONTENT[trigger];

  const handleUpgrade = (plan: "pro_monthly" | "pro_yearly") => {
    track("checkout_started", { trigger, plan });
    window.location.href = `/api/checkout?plan=${plan}`;
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-w-md w-full bg-surface-container-low border border-outline-variant/15 rounded-3xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Ambient gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none rounded-3xl" />

        <div className="relative z-10 p-6 md:p-8 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-on-surface-variant/50 hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer z-20"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-5 pr-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
              Pro
            </p>
            <h2
              id="paywall-title"
              className="text-lg font-bold tracking-tight text-on-surface mb-1.5"
            >
              {content.title}
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {content.subtitle}
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex justify-center mb-5">
            <div className="flex gap-1 bg-surface-container-highest/50 p-1 rounded-xl w-full">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-surface-container-low text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`flex-1 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
          </div>

          {/* Price display */}
          <div className="mb-5">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-on-surface">
                {billingCycle === "monthly" ? "$29" : "$199"}
              </span>
              <span className="text-on-surface-variant text-sm">
                {billingCycle === "monthly" ? "/ month" : "/ year"}
              </span>
            </div>
            <p className={`text-xs text-on-surface-variant/60 mt-1 ${billingCycle === "monthly" ? "invisible" : ""}`}>
              That&apos;s just $16.58/mo — less than $0.55/day
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-3.5 mb-6">
            {content.features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <span className="text-sm text-on-surface">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={() =>
              handleUpgrade(
                billingCycle === "monthly" ? "pro_monthly" : "pro_yearly"
              )
            }
            className="w-full glow-button py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
          >
            Upgrade to Pro
          </button>

          <p className="text-center text-[10px] text-on-surface-variant/50 mt-3">
            Cancel anytime. Secure checkout via Polar.
          </p>
        </div>
      </div>
    </div>
  );
}
