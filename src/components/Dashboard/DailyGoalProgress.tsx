"use client";

import { useEffect, useState } from "react";
import { getHabits, type Habit } from "@/lib/habits";
import { getDailyGoalProgress } from "@/lib/sessions";

interface ProgressItem {
  habit: Habit;
  minutesDone: number;
}

const colorMap: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary-container",
};

export default function DailyGoalProgress() {
  const [items, setItems] = useState<ProgressItem[]>([]);

  useEffect(() => {
    const habits = getHabits();
    const progress = habits.map((habit) => ({
      habit,
      minutesDone: getDailyGoalProgress(habit.id),
    }));
    setItems(progress);
  }, []);

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
            Math.round((minutesDone / habit.dailyGoalMinutes) * 100)
          );
          const barColor = colorMap[habit.color] || "bg-primary";

          // Format display
          const goalHrs = habit.dailyGoalMinutes >= 60;
          const goalDisplay = goalHrs
            ? `${Math.round(habit.dailyGoalMinutes / 60)} hrs`
            : `${habit.dailyGoalMinutes} min`;
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
