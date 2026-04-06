"use client";

import { useEffect, useState } from "react";
import { getStreak, getSessions, getCompletionRate } from "@/lib/sessions";

export default function StatCards() {
  const [streak, setStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreak(getStreak());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotalSessions(getSessions().length);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletionRate(getCompletionRate());
  }, []);

  const cards = [
    {
      label: "Focus Streak",
      value: streak,
      suffix: " Days",
      extra: (
        <div className="mt-4 flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-1 w-8 rounded-full ${
                i < streak ? "bg-primary" : "bg-surface-container-highest"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      label: "Total Sessions",
      value: totalSessions,
      suffix: "",
      extra: totalSessions > 0 ? (
        <p className="text-primary text-xs mt-4 flex items-center gap-1 font-medium">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
          </svg>
          Keep building momentum
        </p>
      ) : (
        <p className="text-on-surface-variant/50 text-xs mt-4">Start your first session</p>
      ),
    },
    {
      label: "Completion Rate",
      value: completionRate,
      suffix: "%",
      extra: (
        <div className="w-full bg-surface-container-highest h-1 rounded-full mt-6">
          <div
            className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(255,182,146,0.5)] transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface-container-low p-6 md:p-8 rounded-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-primary/10" />
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-4">
            {card.label}
          </p>
          <h3 className="text-4xl font-bold text-on-surface">
            {card.value}
            {card.suffix && (
              <span className="text-lg font-normal text-on-surface-variant">
                {card.suffix}
              </span>
            )}
          </h3>
          {card.extra}
        </div>
      ))}
    </div>
  );
}
