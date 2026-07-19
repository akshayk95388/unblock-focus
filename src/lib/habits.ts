// Supabase habits management for authenticated users

import { createClient } from "@/lib/supabase/client";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string; // tailwind color token
  daily_goal_minutes: number;
  created_at: string; // ISO date
}

const DEFAULT_HABITS: Omit<Habit, "id" | "user_id" | "created_at">[] = [
  { name: "Deep Work", emoji: "🔥", color: "primary", daily_goal_minutes: 120 },
  { name: "Reading", emoji: "📚", color: "secondary", daily_goal_minutes: 30 },
  { name: "Exercise", emoji: "💪", color: "tertiary", daily_goal_minutes: 45 },
];

// Seed default habits for new users (idempotent — checks if user has any habits)
export async function seedDefaults(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Check if user already has habits
  const { data: existing } = await supabase
    .from("habits")
    .select("id")
    .limit(1);

  if (existing && existing.length > 0) return;

  // Seed defaults
  const habitsToInsert = DEFAULT_HABITS.map((h) => ({
    ...h,
    user_id: user.id,
  }));

  await supabase.from("habits").insert(habitsToInsert);
}

export async function seedCustomHabits(
  habitsList: { name: string; emoji: string; color: string; daily_goal_minutes: number }[]
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const habitsToInsert = habitsList.map((h) => ({
    ...h,
    user_id: user.id,
  }));

  const { error } = await supabase.from("habits").insert(habitsToInsert);
  if (error) {
    console.error("Error seeding custom habits:", error);
  }
}

export async function getHabits(): Promise<Habit[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching habits:", error);
    return [];
  }

  return (data ?? []) as Habit[];
}

export async function getHabitById(
  id: string
): Promise<Habit | undefined> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return undefined;
  return data as Habit;
}

export async function addHabit(
  name: string,
  emoji: string,
  color: string,
  dailyGoalMinutes: number
): Promise<Habit | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      name,
      emoji,
      color,
      daily_goal_minutes: dailyGoalMinutes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding habit:", error);
    return null;
  }

  return data as Habit;
}

export async function updateHabit(
  id: string,
  updates: Partial<Omit<Habit, "id" | "user_id" | "created_at">>
): Promise<Habit | null> {
  const supabase = createClient();

  // Map camelCase fields to snake_case database columns
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.daily_goal_minutes !== undefined)
    dbUpdates.daily_goal_minutes = updates.daily_goal_minutes;

  const { data, error } = await supabase
    .from("habits")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating habit:", error);
    return null;
  }

  return data as Habit;
}

export async function deleteHabit(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("habits").delete().eq("id", id);

  if (error) {
    console.error("Error deleting habit:", error);
    return false;
  }

  return true;
}
