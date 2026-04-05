"use client";

import { useEffect, useState } from "react";
import { getHabits, deleteHabit, type Habit } from "@/lib/habits";

interface HabitsTabProps {
  onAddHabit: () => void;
}

export default function HabitsTab({ onAddHabit }: HabitsTabProps) {
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    setHabits(getHabits());
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      if (deleteHabit(id)) {
        setHabits(getHabits());
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 md:p-12 space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">My Habits</h2>
          <p className="text-on-surface-variant text-sm">
            Manage the long-term goals you are working towards.
          </p>
        </div>
        <button
          onClick={onAddHabit}
          className="glow-button px-6 py-3 rounded-xl text-on-primary-fixed font-bold text-sm hidden sm:block"
        >
          + Add Habit
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="bg-surface-container-low p-12 rounded-2xl text-center">
          <p className="text-on-surface-variant mb-6 text-lg">
            No habits created yet. Start tracking your focused work.
          </p>
          <button
            onClick={onAddHabit}
            className="glow-button px-8 py-4 rounded-xl text-on-primary-fixed font-bold text-sm mx-auto"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between group hover:bg-surface-container transition-colors"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-xl shadow-md">
                    {habit.emoji}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">
                      {habit.name}
                    </h3>
                    <p className="text-primary text-xs font-medium uppercase tracking-widest mt-1">
                      {habit.dailyGoalMinutes >= 60 &&
                      habit.dailyGoalMinutes % 60 === 0
                        ? `${habit.dailyGoalMinutes / 60} HRS/DAY`
                        : `${habit.dailyGoalMinutes} MINS/DAY`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(habit.id, habit.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full"
                  title="Delete Habit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center text-xs text-on-surface-variant">
                Created {new Date(habit.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="sm:hidden mt-4">
        <button
          onClick={onAddHabit}
          className="w-full glow-button px-6 py-4 rounded-xl text-on-primary-fixed font-bold text-sm"
        >
          + Add Habit
        </button>
      </div>
    </div>
  );
}
