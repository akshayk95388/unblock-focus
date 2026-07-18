"use client";

import { useMemo } from "react";
import { useHabits, useSessions } from "@/lib/queries";
import Skeleton from "@/components/ui/Skeleton";

const colorMap: Record<string, string> = {
  primary: "bg-primary-container",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary-container",
};

export default function DailyGoalProgress() {
  const { habits, loading: habitsLoading } = useHabits();
  const { sessions, loading: sessionsLoading } = useSessions();
  const loading = habitsLoading || sessionsLoading;

  const items = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return habits.map((habit) => {
      const minutesDone = Math.round(
        sessions
          .filter((s) => s.habit_id === habit.id && new Date(s.completed_at) >= todayStart)
          .reduce((sum, s) => sum + s.duration_seconds, 0) / 60
      );
      return { habit, minutesDone };
    });
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
        {items.map(({ habit, minutesDone }) => {
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
            <div key={habit.id} className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface-variant">
                  {habit.emoji} {habit.name}
                </span>
                <span className="text-on-surface">
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
      </div>
    </div>
  );
}
