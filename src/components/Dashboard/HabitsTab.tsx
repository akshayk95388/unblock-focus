"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteHabit } from "@/lib/habits";
import Skeleton from "@/components/ui/Skeleton";
import type { SessionRecord } from "@/lib/sessions";
import { useHabits, useSessions, habitsResource } from "@/lib/queries";

interface ExpandedSessionsListProps {
  sessions: SessionRecord[];
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
}

function ExpandedSessionsList({ sessions, formatDate, formatTime }: ExpandedSessionsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [sessions]);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSessions = sessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (sessions.length === 0) {
    return (
      <p className="text-on-surface-variant/60 text-sm py-6 text-center">
        No sessions recorded for this goal yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        {paginatedSessions.map((session) => {
          const mins = Math.floor(session.duration_seconds / 60);
          const secs = session.duration_seconds % 60;
          const durationDisplay = mins > 0 ? `${mins}m` : `${secs}s`;
          return (
            <div
              key={session.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                session.aborted ? "opacity-50" : "hover:bg-surface-container-highest/50"
              } transition-colors`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="text-on-surface-variant/50 font-mono text-xs w-20 shrink-0">
                  {formatDate(session.completed_at)} {formatTime(session.completed_at)}
                </div>
                <span className={`text-sm ${session.aborted ? "text-on-surface-variant line-through" : "text-on-surface"} truncate`}>
                  {session.intent}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {session.aborted && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-error/10 text-error">
                    Ended early
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-primary-container/10 text-primary border border-primary/10">
                  {durationDisplay}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-surface-container-low text-on-surface border border-outline-variant/10 hover:bg-surface-container hover:border-outline-variant/35 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span>Prev</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-surface-container-low text-on-surface border border-outline-variant/10 hover:bg-surface-container hover:border-outline-variant/35 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <span>Next</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

interface HabitsTabProps {
  onAddHabit: () => void;
}

export default function HabitsTab({ onAddHabit }: HabitsTabProps) {
  const { habits, loading: habitsLoading } = useHabits();
  const { sessions, loading: sessionsLoading } = useSessions();
  const loading = habitsLoading || sessionsLoading;
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [showMisc, setShowMisc] = useState(false);

  const [currentGoalsPage, setCurrentGoalsPage] = useState(1);
  const GOALS_PER_PAGE = 10;

  useEffect(() => {
    const pages = Math.ceil(habits.length / GOALS_PER_PAGE);
    if (pages > 0 && currentGoalsPage > pages) {
      setCurrentGoalsPage(pages);
    }
  }, [habits, currentGoalsPage]);

  // Sessions unlinked to any habit ("Others" bucket)
  const miscSessions = useMemo(
    () =>
      sessions
        .filter((s) => !s.habit_id)
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
    [sessions]
  );

  // Sessions for the currently expanded habit
  const habitSessions = useMemo(() => {
    if (!expandedHabitId) return [] as SessionRecord[];
    return sessions
      .filter((s) => s.habit_id === expandedHabitId)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [sessions, expandedHabitId]);

  // Per-habit stats derived from the already-fetched sessions list — avoids
  // an extra round trip per habit just to compute today's minutes/total count.
  const habitStats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const stats: Record<string, { todayMins: number; totalSessions: number }> = {};
    for (const habit of habits) {
      let todaySeconds = 0;
      let totalSessions = 0;
      for (const s of sessions) {
        if (s.habit_id !== habit.id) continue;
        totalSessions++;
        if (new Date(s.completed_at) >= todayStart) {
          todaySeconds += s.duration_seconds;
        }
      }
      stats[habit.id] = { todayMins: Math.round(todaySeconds / 60), totalSessions };
    }
    return stats;
  }, [habits, sessions]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      // Optimistic update — remove immediately, then confirm with the server
      habitsResource.mutate((prev) => (prev ?? []).filter((h) => h.id !== id));
      if (!(await deleteHabit(id))) {
        habitsResource.revalidate(true);
      }
    }
  };

  const toggleExpand = (habitId: string) => {
    setExpandedHabitId((prev) => (prev === habitId ? null : habitId));
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const totalGoalsPages = Math.ceil(habits.length / GOALS_PER_PAGE);
  const startGoalIndex = (currentGoalsPage - 1) * GOALS_PER_PAGE;
  const paginatedHabits = habits.slice(startGoalIndex, startGoalIndex + GOALS_PER_PAGE);

  return (
    <div className="flex flex-col flex-1 p-6 md:p-12 space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">My Goals</h2>
          <p className="text-on-surface-variant text-sm">
            Manage the goals you&apos;re working toward.
          </p>
        </div>
        <button
          onClick={onAddHabit}
          className="glow-button px-6 py-3 rounded-xl text-on-primary-fixed font-bold text-sm hidden sm:block"
        >
          + Add Goal
        </button>
      </div>

      {loading ? (
        /* Skeleton loading state — matches goal card dimensions */
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-surface-container-low rounded-xl p-5 flex items-center gap-4">
              <Skeleton className="w-10 h-10 shrink-0" rounded="lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="w-5 h-5 shrink-0" rounded="full" />
            </div>
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="bg-surface-container-low p-12 rounded-2xl text-center">
          <p className="text-on-surface-variant mb-6 text-lg">
            No goals created yet. Start tracking your focused work.
          </p>
          <button
            onClick={onAddHabit}
            className="glow-button px-8 py-4 rounded-xl text-on-primary-fixed font-bold text-sm mx-auto"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedHabits.map((habit) => {
            const isExpanded = expandedHabitId === habit.id;
            const stats = habitStats[habit.id] || { todayMins: 0, totalSessions: 0 };
            const todayMins = stats.todayMins;
            const totalSessions = stats.totalSessions;

            return (
              <div key={habit.id} className="bg-surface-container-low rounded-xl overflow-hidden transition-colors">
                {/* Habit Card Header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors group"
                  onClick={() => toggleExpand(habit.id)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-base sm:text-lg shadow-sm shrink-0">
                      {habit.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-semibold text-on-surface truncate">
                        {habit.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 mt-1 text-xs text-on-surface-variant">
                        <span className="text-primary font-medium uppercase tracking-wider sm:tracking-widest whitespace-nowrap">
                          {habit.daily_goal_minutes >= 60 && habit.daily_goal_minutes % 60 === 0
                            ? `${habit.daily_goal_minutes / 60} HRS/DAY`
                            : `${habit.daily_goal_minutes} MINS/DAY`}
                        </span>
                        <span className="text-on-surface-variant/20 hidden sm:inline select-none">•</span>
                        <span className="whitespace-nowrap">
                          {totalSessions} session{totalSessions !== 1 ? "s" : ""}
                        </span>
                        <span className="text-on-surface-variant/20 hidden sm:inline select-none">•</span>
                        <span className="whitespace-nowrap hidden sm:inline">
                          {todayMins} min today
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(habit.id, habit.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-all"
                      title="Delete Goal"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                    <svg
                      className={`w-5 h-5 text-on-surface-variant transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Session List */}
                {isExpanded && (
                  <div className="border-t border-outline-variant/10 px-6 pb-6">
                    <ExpandedSessionsList
                      sessions={habitSessions}
                      formatDate={formatDate}
                      formatTime={formatTime}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Miscellaneous / Unlinked Sessions */}
          {miscSessions.length > 0 && (
            <div className="bg-surface-container-low rounded-xl overflow-hidden">
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors"
                onClick={() => setShowMisc(!showMisc)}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-base sm:text-lg shadow-sm shrink-0">
                    📂
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-semibold text-on-surface truncate">Others</h3>
                    <p className="text-on-surface-variant text-xs truncate">
                      {miscSessions.length} unlinked session{miscSessions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-on-surface-variant transition-transform duration-200 shrink-0 ml-4 ${showMisc ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {showMisc && (
                <div className="border-t border-outline-variant/10 px-6 pb-6">
                  <ExpandedSessionsList
                    sessions={miscSessions}
                    formatDate={formatDate}
                    formatTime={formatTime}
                  />
                </div>
              )}
            </div>
          )}

          {/* Goals Pagination controls */}
          {totalGoalsPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
              <button
                onClick={() => setCurrentGoalsPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentGoalsPage === 1}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-surface-container-low text-on-surface border border-outline-variant/10 hover:bg-surface-container hover:border-outline-variant/35 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                <span>Previous</span>
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Page {currentGoalsPage} of {totalGoalsPages}
              </span>
              <button
                onClick={() => setCurrentGoalsPage((prev) => Math.min(prev + 1, totalGoalsPages))}
                disabled={currentGoalsPage === totalGoalsPages}
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
      <div className="sm:hidden mt-4">
        <button
          onClick={onAddHabit}
          className="w-full glow-button px-6 py-4 rounded-xl text-on-primary-fixed font-bold text-sm"
        >
          + Add Goal
        </button>
      </div>
    </div>
  );
}
