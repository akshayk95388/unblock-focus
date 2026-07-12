"use client";

import { useEffect, useState } from "react";
import { getHabits, deleteHabit, type Habit } from "@/lib/habits";
import { getSessions, getSessionsByHabit, getDailyGoalProgress, type SessionRecord } from "@/lib/sessions";

interface HabitsTabProps {
  onAddHabit: () => void;
}

export default function HabitsTab({ onAddHabit }: HabitsTabProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [habitSessions, setHabitSessions] = useState<SessionRecord[]>([]);
  const [miscSessions, setMiscSessions] = useState<SessionRecord[]>([]);
  const [showMisc, setShowMisc] = useState(false);
  const [habitStats, setHabitStats] = useState<Record<string, { todayMins: number; totalSessions: number }>>({});

  useEffect(() => {
    async function loadData() {
      const [habitsData, allSessions] = await Promise.all([
        getHabits(),
        getSessions(),
      ]);
      setHabits(habitsData);
      setMiscSessions(
        allSessions.filter((s) => !s.habit_id).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      );

      // Load per-habit stats
      const stats: Record<string, { todayMins: number; totalSessions: number }> = {};
      await Promise.all(
        habitsData.map(async (habit) => {
          const [todayMins, sessions] = await Promise.all([
            getDailyGoalProgress(habit.id),
            getSessionsByHabit(habit.id),
          ]);
          stats[habit.id] = { todayMins, totalSessions: sessions.length };
        })
      );
      setHabitStats(stats);
    }
    loadData();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      if (await deleteHabit(id)) {
        setHabits(await getHabits());
      }
    }
  };

  const toggleExpand = async (habitId: string) => {
    if (expandedHabitId === habitId) {
      setExpandedHabitId(null);
      return;
    }
    setExpandedHabitId(habitId);
    const sessions = await getSessionsByHabit(habitId);
    setHabitSessions(
      sessions.sort(
        (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      )
    );
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

      {habits.length === 0 ? (
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
          {habits.map((habit) => {
            const isExpanded = expandedHabitId === habit.id;
            const stats = habitStats[habit.id] || { todayMins: 0, totalSessions: 0 };
            const todayMins = stats.todayMins;
            const totalSessions = stats.totalSessions;

            return (
              <div key={habit.id} className="bg-surface-container-low rounded-2xl overflow-hidden transition-colors">
                {/* Habit Card Header */}
                <div
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors group"
                  onClick={() => toggleExpand(habit.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-xl shadow-md">
                      {habit.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-on-surface">
                        {habit.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-primary text-xs font-medium uppercase tracking-widest">
                          {habit.daily_goal_minutes >= 60 && habit.daily_goal_minutes % 60 === 0
                            ? `${habit.daily_goal_minutes / 60} HRS/DAY`
                            : `${habit.daily_goal_minutes} MINS/DAY`}
                        </span>
                        <span className="text-on-surface-variant/40 text-xs">•</span>
                        <span className="text-on-surface-variant text-xs">
                          {totalSessions} session{totalSessions !== 1 ? "s" : ""}
                        </span>
                        <span className="text-on-surface-variant/40 text-xs">•</span>
                        <span className="text-on-surface-variant text-xs">
                          {todayMins} min today
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                    {habitSessions.length === 0 ? (
                      <p className="text-on-surface-variant/60 text-sm py-6 text-center">
                        No sessions recorded for this goal yet.
                      </p>
                    ) : (
                      <div className="space-y-2 pt-4 max-h-80 overflow-y-auto">
                        {habitSessions.map((session) => {
                          const mins = Math.floor(session.duration_seconds / 60);
                          return (
                            <div
                              key={session.id}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                                session.aborted ? "opacity-50" : "hover:bg-surface-container-highest/50"
                              } transition-colors`}
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-on-surface-variant/50 font-mono text-xs w-20">
                                  {formatDate(session.completed_at)} {formatTime(session.completed_at)}
                                </div>
                                <span className={`text-sm ${session.aborted ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                                  {session.intent}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {session.aborted && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-error/10 text-error">
                                    Ended early
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-primary-container/10 text-primary border border-primary/10">
                                  {mins}m
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Miscellaneous / Unlinked Sessions */}
          {miscSessions.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl overflow-hidden">
              <div
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors"
                onClick={() => setShowMisc(!showMisc)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-xl shadow-md">
                    📂
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Others</h3>
                    <span className="text-on-surface-variant text-xs">
                      {miscSessions.length} unlinked session{miscSessions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-on-surface-variant transition-transform duration-200 ${showMisc ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {showMisc && (
                <div className="border-t border-outline-variant/10 px-6 pb-6">
                  <div className="space-y-2 pt-4 max-h-80 overflow-y-auto">
                    {miscSessions.map((session) => {
                      const mins = Math.floor(session.duration_seconds / 60);
                      return (
                        <div
                          key={session.id}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                            session.aborted ? "opacity-50" : "hover:bg-surface-container-highest/50"
                          } transition-colors`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-on-surface-variant/50 font-mono text-xs w-20">
                              {formatDate(session.completed_at)} {formatTime(session.completed_at)}
                            </div>
                            <span className={`text-sm ${session.aborted ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                              {session.intent}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.aborted && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-error/10 text-error">
                                Ended early
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-primary-container/10 text-primary border border-primary/10">
                              {mins}m
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
