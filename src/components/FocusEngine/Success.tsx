"use client";

import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import { saveSession, getStreak } from "@/lib/sessions";

interface SuccessProps {
  intentText: string;
  habitId?: string;
  completedSeconds: number;
  onContinue: () => void;
  onDone: () => void;
}

export default function Success({
  intentText,
  habitId,
  completedSeconds,
  onContinue,
  onDone,
}: SuccessProps) {
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [shareStatus, setShareStatus] = useState<"idle" | "copying" | "copied">("idle");
  const shareCardRef = useRef<HTMLDivElement>(null);

  const focusMinutes = Math.floor(completedSeconds / 60);
  const focusDisplay = `${focusMinutes}:${(completedSeconds % 60).toString().padStart(2, "0")}`;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    setMounted(true);

    // Save session to LocalStorage
    saveSession(intentText, completedSeconds, habitId);
    const currentStreak = getStreak();
    setStreak(currentStreak);

    // Update tab title
    document.title = "Session Complete — Unblock";

    return () => {
      document.title = "Unblock — Break the Loop. Start Deep Work in 60 Seconds.";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShareWin = async () => {
    if (!shareCardRef.current) return;

    setShareStatus("copying");

    try {
      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#131314",
      });

      // Try clipboard API first
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShareStatus("copied");
      } else {
        // Fallback: open image in new tab
        const link = document.createElement("a");
        link.download = `unblock-win-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        setShareStatus("copied");
      }

      setTimeout(() => setShareStatus("idle"), 3000);
    } catch (e) {
      console.error("Share failed:", e);
      setShareStatus("idle");
    }
  };

  return (
    <main
      className={`relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden px-6 py-16 transition-opacity duration-700 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-container/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Hero Messaging */}
        <div
          className={`lg:col-span-7 flex flex-col items-start transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="text-[11px] uppercase tracking-[0.2em] text-primary-container font-semibold mb-6">
            Session Complete
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
            You crushed it.
            <br />
            <span className="text-on-surface/40">
              The hardest part is over.
            </span>
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={onContinue}
              className="px-8 py-5 bg-primary-container text-on-primary-fixed rounded-full font-bold text-base md:text-lg shadow-[0_0_20px_rgba(255,130,60,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Keep going for 20 more minutes
            </button>
            <button
              onClick={onDone}
              className="px-8 py-5 bg-surface-container-highest text-on-surface rounded-full font-medium hover:bg-surface-container-high transition-colors"
            >
              I&apos;m done for now
            </button>
          </div>
        </div>

        {/* Share Card */}
        <div
          className={`lg:col-span-5 transition-all duration-700 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-surface-container-low rounded-2xl p-6 md:p-8 shadow-[0_4px_4px_rgba(0,0,0,0.2),0_0_60px_rgba(255,130,60,0.08)] relative overflow-hidden">
            {/* Capturable Card */}
            <div
              ref={shareCardRef}
              className="aspect-square w-full rounded-xl bg-surface-container relative flex flex-col items-center justify-center border border-outline-variant/10 p-8"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent rounded-xl" />

              {/* Streak Badge */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-dashed border-primary-container/20 flex items-center justify-center mb-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center shadow-xl">
                    <span className="text-3xl md:text-4xl font-black text-white">
                      {streak.toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mb-1">
                  Day Streak
                </p>
                <p className="text-on-surface/50 text-xs md:text-sm uppercase tracking-widest">
                  Focus Session: {focusDisplay}
                </p>
              </div>

              {/* Decorative dots */}
              <div className="absolute bottom-4 left-6 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-container" />
                <div className="w-2 h-2 rounded-full bg-surface-container-highest" />
                <div className="w-2 h-2 rounded-full bg-surface-container-highest" />
              </div>

              {/* Branding */}
              <div className="absolute top-4 left-6 text-[10px] tracking-[0.2em] uppercase text-on-surface/20 font-bold">
                Unblock
              </div>
            </div>

            {/* Below card: date + share */}
            <div className="mt-6 flex justify-between items-center">
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-widest text-on-surface/40">
                  Recorded on
                </p>
                <p className="font-medium text-sm">{today}</p>
              </div>
              <button
                onClick={handleShareWin}
                disabled={shareStatus === "copying"}
                className="flex items-center gap-2 bg-primary-container text-on-primary-fixed px-4 py-2 rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
              >
                {shareStatus === "copied" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Copied!
                  </>
                ) : shareStatus === "copying" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                    Share My Win
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Auth Hook Banner */}
        <div
          className={`lg:col-span-12 mt-8 transition-all duration-700 delay-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-secondary-container/10 backdrop-blur-md rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between border border-secondary-container/20">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              <p className="text-on-surface/80 max-w-md">
                Create a free account to{" "}
                <span className="text-secondary font-bold">
                  save this {streak}-day streak
                </span>{" "}
                and unlock deep work analytics.
              </p>
            </div>
            <button className="text-secondary font-bold hover:underline underline-offset-8 transition-all px-4 py-2 whitespace-nowrap">
              Sign Up Now →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
