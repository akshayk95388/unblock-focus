"use client";

import { useEffect, useState } from "react";
import { getTodaySessions, type SessionRecord } from "@/lib/sessions";
import { getHabitById } from "@/lib/habits";

export default function TodaySessions() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(getTodaySessions().reverse()); // Most recent first
  }, []);

  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-2xl font-bold tracking-tight">Today&apos;s Sessions</h2>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl text-center">
          <p className="text-on-surface-variant/60 text-sm">
            No sessions today yet. Start one to begin tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-bold tracking-tight">Today&apos;s Sessions</h2>
        <span className="text-on-surface-variant text-sm">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-3">
        {sessions.map((session) => {
          const habit = session.habitId
            ? getHabitById(session.habitId)
            : undefined;
          const time = new Date(session.completedAt).toLocaleTimeString(
            "en-US",
            { hour: "2-digit", minute: "2-digit", hour12: false }
          );
          const mins = Math.floor(session.durationSeconds / 60);

          return (
            <div
              key={session.id}
              className="bg-surface-container-low p-5 md:p-6 rounded-xl flex items-center justify-between group hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <div className="text-on-surface-variant font-mono text-sm w-12">
                  {time}
                </div>
                <div>
                  <h4 className="text-on-surface font-semibold text-sm md:text-base">
                    {session.intent}
                  </h4>
                  {habit && (
                    <p className="text-on-surface-variant text-xs mt-1">
                      {habit.emoji} {habit.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-primary-container/10 text-primary border border-primary/10">
                  {mins} min
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
