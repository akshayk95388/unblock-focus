"use client";

import { useEffect, useState } from "react";
import { getSessions, toggleFavorite, type SessionRecord } from "@/lib/sessions";
import { getHabits, type Habit } from "@/lib/habits";
import StatCards from "@/components/Dashboard/StatCards";
import ActivityHeatmap from "@/components/Dashboard/ActivityHeatmap";

interface HistoryTabProps {
  onReplaySession?: (session: SessionRecord) => void;
}

export default function HistoryTab({ onReplaySession }: HistoryTabProps) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [habitsMap, setHabitsMap] = useState<Record<string, Habit>>({});
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  useEffect(() => {
    async function loadData() {
      const [sessionsData, habitsData] = await Promise.all([
        getSessions(),
        getHabits(),
      ]);
      setSessions(sessionsData);
      // Build a lookup map for habits
      const map: Record<string, Habit> = {};
      habitsData.forEach((h) => {
        map[h.id] = h;
      });
      setHabitsMap(map);
    }
    loadData();
  }, []);

  const handleToggleFavorite = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const newState = !session.is_favorite;
    // Optimistic update
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, is_favorite: newState } : s))
    );
    await toggleFavorite(sessionId, newState);
  };

  // Filter sessions based on current tab
  const filteredSessions =
    filter === "favorites"
      ? sessions.filter((s) => s.is_favorite)
      : sessions;

  // Group by date string
  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const d = new Date(session.completed_at);
    const dateKey = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, SessionRecord[]>);

  const canReplay = (session: SessionRecord) =>
    session.session_type === "guided" && !!session.audio_url;

  return (
    <div className="flex flex-col flex-1 min-w-0 p-6 md:px-6 md:py-12 space-y-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">History</h2>
        <p className="text-on-surface-variant text-sm">
          Every deep work session you have conquered.
        </p>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-1 bg-surface-container-highest/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            filter === "all"
              ? "bg-surface-container-low text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          All History
        </button>
        <button
          onClick={() => setFilter("favorites")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            filter === "favorites"
              ? "bg-surface-container-low text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span>❤️</span> Favorites
        </button>
      </div>

      {/* Summary stats */}
      <StatCards />

      {/* Activity calendar */}
      <ActivityHeatmap />

      {filteredSessions.length === 0 ? (
        <div className="bg-surface-container-low p-12 rounded-2xl text-center">
          <p className="text-on-surface-variant text-lg">
            {filter === "favorites"
              ? "No favorites yet. Complete a guided session and save it."
              : "Your history is empty. Start your first focus session."}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedSessions).map(([dateLabel, daySessions]) => {
            const totalMins = Math.round(
              daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60
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
                    const habit = session.habit_id ? habitsMap[session.habit_id] : undefined;
                    const time = new Date(session.completed_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    const mins = Math.floor(session.duration_seconds / 60);

                    return (
                      <div
                        key={session.id}
                        className={`bg-surface-container-low p-5 rounded-xl flex items-center justify-between transition-colors ${session.aborted ? "opacity-60" : "hover:bg-surface-container"}`}
                      >
                        <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                          <div className="text-on-surface-variant font-mono text-xs w-12 opacity-60 shrink-0">
                            {time}
                          </div>
                          <div className="min-w-0">
                            <h4 className={`font-semibold text-sm md:text-base truncate ${session.aborted ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                              {session.intent}
                            </h4>
                            {habit && (
                              <p className="text-on-surface-variant text-xs mt-1">
                                {habit.emoji} {habit.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {/* Favorite toggle — only for guided sessions with audio */}
                          {canReplay(session) && (
                            <button
                              onClick={() => handleToggleFavorite(session.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm ${
                                session.is_favorite
                                  ? "bg-red-500/10 hover:bg-red-500/20"
                                  : "bg-transparent hover:bg-surface-container-highest"
                              }`}
                              title={session.is_favorite ? "Remove from favorites" : "Save to favorites"}
                            >
                              {session.is_favorite ? "❤️" : "🤍"}
                            </button>
                          )}
                          {/* Play button — only for guided sessions with audio */}
                          {canReplay(session) && onReplaySession && (
                            <button
                              onClick={() => onReplaySession(session)}
                              className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all text-primary"
                              title="Replay this session"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </button>
                          )}
                          {session.aborted && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-error/10 text-error border border-error/10">
                              Ended early
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
