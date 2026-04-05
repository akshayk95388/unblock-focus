"use client";

import { useEffect, useState } from "react";
import { getSessions, type SessionRecord } from "@/lib/sessions";
import { getHabitById } from "@/lib/habits";

export default function HistoryTab() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    // Reverse chron
    setSessions(getSessions().sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()));
  }, []);

  // Group by date string (YYYY-MM-DD format for robustness, display softly)
  const groupedSessions = sessions.reduce((acc, session) => {
    const d = new Date(session.completedAt);
    const dateKey = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, SessionRecord[]>);

  return (
    <div className="flex flex-col flex-1 p-6 md:p-12 space-y-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">History</h2>
        <p className="text-on-surface-variant text-sm">
          Every deep work session you have conquered.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-surface-container-low p-12 rounded-2xl text-center">
          <p className="text-on-surface-variant text-lg">
            Your history is empty. Start your first focus block.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedSessions).map(([dateLabel, daySessions]) => {
            const totalMins = Math.round(
              daySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
            );

            return (
              <div key={dateLabel} className="space-y-4">
                <div className="flex items-center justify-between border-b border-surface-container-highest pb-2 px-2">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                    {dateLabel}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                    {totalMins} Mins total
                  </span>
                </div>

                <div className="space-y-3">
                  {daySessions.map((session) => {
                    const habit = session.habitId ? getHabitById(session.habitId) : undefined;
                    const time = new Date(session.completedAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    const mins = Math.floor(session.durationSeconds / 60);

                    return (
                      <div
                        key={session.id}
                        className={`bg-surface-container-low p-5 rounded-xl flex items-center justify-between transition-colors ${session.aborted ? "opacity-60" : "hover:bg-surface-container"}`}
                      >
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="text-on-surface-variant font-mono text-xs w-12 opacity-60">
                            {time}
                          </div>
                          <div>
                            <h4 className={`font-semibold text-sm md:text-base ${session.aborted ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
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
                          {session.aborted && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-error/10 text-error border border-error/10">
                              Aborted
                            </span>
                          )}
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
          })}
        </div>
      )}
    </div>
  );
}
