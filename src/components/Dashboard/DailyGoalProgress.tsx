"use client";

import { useMemo } from "react";
import { useHabits, useSessions } from "@/lib/queries";
import Skeleton from "@/components/ui/Skeleton";

const colorMap: Record<string, string> = {
  primary: "bg-primary-container",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary-container",
};

interface DailyGoalProgressProps {
  onViewMore?: () => void;
}

export default function DailyGoalProgress({ onViewMore }: DailyGoalProgressProps) {
  const { habits, loading: habitsLoading } = useHabits();
  const { sessions, loading: sessionsLoading } = useSessions();
  const loading = habitsLoading || sessionsLoading;

  const items = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Group habits by lowercase name to collect all matching IDs
    const habitsGroupedByName: Record<string, { habit: typeof habits[0]; ids: string[] }> = {};
    for (const h of habits) {
      const nameKey = h.name.toLowerCase().trim();
      if (!habitsGroupedByName[nameKey]) {
        habitsGroupedByName[nameKey] = {
          habit: h,
          ids: [h.id]
        };
      } else {
        habitsGroupedByName[nameKey].ids.push(h.id);
      }
    }

    // Map groups to today's minutes, progress %, and usage statistics
    const mapped = Object.values(habitsGroupedByName).map(({ habit, ids }) => {
      const secondsDoneToday = sessions
        .filter((s) => s.habit_id && ids.includes(s.habit_id) && new Date(s.completed_at) >= todayStart)
        .reduce((sum, s) => sum + s.duration_seconds, 0);
      const minutesDone = Math.round(secondsDoneToday / 60);
      const pct = habit.daily_goal_minutes > 0 ? (minutesDone / habit.daily_goal_minutes) : 0;
      const totalSessions = sessions.filter((s) => s.habit_id && ids.includes(s.habit_id)).length;

      return { habit, minutesDone, pct, totalSessions, secondsDoneToday };
    });

    // Sort order:
    // 1. Prioritize habits with active progress today (secondsDoneToday > 0)
    // 2. Sort by total session engagement (most used habits first)
    // 3. Fallback to alphabetical order
    mapped.sort((a, b) => {
      const aHasToday = a.secondsDoneToday > 0;
      const bHasToday = b.secondsDoneToday > 0;
      if (aHasToday && !bHasToday) return -1;
      if (bHasToday && !aHasToday) return 1;
      if (aHasToday && bHasToday) {
        return b.secondsDoneToday - a.secondsDoneToday; // Sort by time spent today
      }
      if (b.totalSessions !== a.totalSessions) return b.totalSessions - a.totalSessions;
      return a.habit.name.localeCompare(b.habit.name);
    });

    return mapped;
  }, [habits, sessions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-36" />
        <div className="space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-1.5 w-full" rounded="full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <h5 className="text-sm font-bold text-on-surface tracking-tight">
        Daily Goal Progress
      </h5>
      <div className="space-y-5">
        {items.slice(0, 4).map(({ habit, minutesDone }) => {
          const pct = Math.min(
            100,
            Math.round((minutesDone / habit.daily_goal_minutes) * 100)
          );
          const barColor = colorMap[habit.color] || "bg-primary";

          // Format display
          const goalHrs = habit.daily_goal_minutes >= 60;
          const goalDisplay = goalHrs
            ? `${Math.round(habit.daily_goal_minutes / 60)} hrs`
            : `${habit.daily_goal_minutes} min`;
          const doneHrs = minutesDone >= 60;
          const doneDisplay = doneHrs
            ? `${Math.floor(minutesDone / 60)}h ${minutesDone % 60}m`
            : `${minutesDone} min`;

          return (
            <div key={habit.id} className="flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface-variant truncate max-w-[150px]">
                  {habit.emoji} {habit.name}
                </span>
                <span className="text-on-surface shrink-0 font-mono text-[11px]">
                  {doneDisplay} / {goalDisplay}
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {items.length > 4 && (
          <div className="pt-2 text-center border-t border-outline-variant/5">
            <button
              onClick={onViewMore}
              className="text-[10px] px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant/10 hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all font-bold uppercase tracking-wider cursor-pointer shadow-sm active:scale-95"
            >
              View All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
