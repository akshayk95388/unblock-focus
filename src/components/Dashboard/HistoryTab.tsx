"use client";

import { useEffect, useMemo, useState } from "react";
import { toggleFavorite, type SessionRecord } from "@/lib/sessions";
import type { Habit } from "@/lib/habits";
import { useSessions, useHabits, sessionsResource } from "@/lib/queries";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isPro, FREE_REPLAY_LIMIT } from "@/lib/plans";
import StatCards from "@/components/Dashboard/StatCards";
import ActivityHeatmap from "@/components/Dashboard/ActivityHeatmap";
import PaywallModal from "@/components/ui/PaywallModal";
import { track } from "@/lib/mixpanel";
import Skeleton from "@/components/ui/Skeleton";

interface HistoryTabProps {
  onReplaySession?: (session: SessionRecord) => void;
}

export default function HistoryTab({ onReplaySession }: HistoryTabProps) {
  const { sessions, loading: sessionsLoading } = useSessions();
  const { habits, loading: habitsLoading } = useHabits();
  const loading = sessionsLoading || habitsLoading;
  const habitsMap = useMemo(() => {
    const map: Record<string, Habit> = {};
    habits.forEach((h) => {
      map[h.id] = h;
    });
    return map;
  }, [habits]);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [showPaywall, setShowPaywall] = useState(false);
  const { planType } = useUserPlan();
  const userIsPro = isPro(planType);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleToggleFavorite = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const newState = !session.is_favorite;
    // Optimistic update — shared across every component reading the sessions cache
    sessionsResource.mutate((prev) =>
      (prev ?? []).map((s) => (s.id === sessionId ? { ...s, is_favorite: newState } : s))
    );
    await toggleFavorite(sessionId, newState);
  };

  // Filter sessions based on current tab
  const filteredSessions =
    filter === "favorites"
      ? sessions.filter((s) => s.is_favorite)
      : sessions;

  // Flat pagination — exactly ITEMS_PER_PAGE sessions per page (a date's
  // sessions can span two pages).
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const dateKeyFor = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Full per-day totals computed over ALL filtered sessions (not just the
  // current page) so the "total mins" shown stays accurate even when a
  // day's sessions are split across two pages.
  const dayTotalSecondsMap = filteredSessions.reduce((acc, session) => {
    const dateKey = dateKeyFor(session.completed_at);
    acc[dateKey] = (acc[dateKey] || 0) + session.duration_seconds;
    return acc;
  }, {} as Record<string, number>);

  // Group the current page's sessions by date for display
  const groupedSessions = paginatedSessions.reduce((acc, session) => {
    const dateKey = dateKeyFor(session.completed_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, SessionRecord[]>);

  // Clamp page if data shrinks (e.g. a filter change reduces the page count)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Track the replay index for guided sessions (for free-tier gating)
  // Build a separate counter for guided sessions with audio
  const guidedSessionIds = new Set<string>();
  let guidedIndex = 0;
  const guidedSessionIndexMap = new Map<string, number>();
  for (const session of sessions) {
    if (session.session_type === "guided" && session.audio_url) {
      guidedSessionIndexMap.set(session.id, guidedIndex);
      guidedSessionIds.add(session.id);
      guidedIndex++;
    }
  }

  const canReplay = (session: SessionRecord) =>
    session.session_type === "guided" && !!session.audio_url;

  const isReplayLocked = (session: SessionRecord) => {
    if (userIsPro) return false;
    if (!canReplay(session)) return false;
    const idx = guidedSessionIndexMap.get(session.id);
    return idx !== undefined && idx >= FREE_REPLAY_LIMIT;
  };

  return (
    <>
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

      {loading ? (
        /* Skeleton loading state */
        <div className="space-y-12">
          {/* Skeleton session rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-highest pb-2 px-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-surface-container-low p-5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                  <Skeleton className="h-3 w-12 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-5 w-14 shrink-0" rounded="full" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredSessions.length === 0 ? (
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
            const totalMins = Math.round((dayTotalSecondsMap[dateLabel] ?? 0) / 60);

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
                    const secs = session.duration_seconds % 60;
                    const durationDisplay = mins > 0 ? `${mins} min` : `${secs} sec`;

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
                              <p className="text-on-surface-variant text-xs mt-1 truncate">
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
                              className={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center transition-all text-sm ${
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
                            isReplayLocked(session) ? (
                              <button
                                onClick={() => {
                                  track("paywall_shown", { trigger: "replay" });
                                  setShowPaywall(true);
                                }}
                                className="w-8 h-8 rounded-full bg-surface-container-highest/50 flex items-center justify-center transition-all text-on-surface-variant/40"
                                title="Unlock with Pro"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => onReplaySession(session)}
                                className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all text-primary"
                                title="Replay this session"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </button>
                            )
                          )}
                          <div className="flex flex-col items-end gap-1">
                            {session.aborted && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter bg-error/10 text-error border border-error/10 whitespace-nowrap">
                                Ended early
                              </span>
                            )}
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter bg-primary-container/10 text-primary border border-primary/10 whitespace-nowrap">
                              {durationDisplay}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-surface-container-low text-on-surface border border-outline-variant/10 hover:bg-surface-container hover:border-outline-variant/35 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                <span>Previous</span>
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-surface-container-low text-on-surface border border-outline-variant/10 hover:bg-surface-container hover:border-outline-variant/35 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <span>Next</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          trigger="replay"
          onClose={() => setShowPaywall(false)}
        />
      )}
    </>
  );
}
