// Supabase session persistence for authenticated users

import { createClient } from "@/lib/supabase/client";

export interface SessionRecord {
  id: string;
  user_id: string;
  intent: string;
  habit_id?: string | null;
  duration_seconds: number;
  completed_at: string; // ISO date
  aborted: boolean;
  session_type: string; // 'guided', 'focus', 'breathing'
}

// Save a completed session
export async function saveSession(
  intent: string,
  durationSeconds: number,
  habitId?: string,
  aborted: boolean = false,
  sessionType: string = "focus"
): Promise<SessionRecord | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      intent,
      habit_id: habitId || null,
      duration_seconds: durationSeconds,
      aborted,
      session_type: sessionType,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving session:", error);
    return null;
  }

  return data as SessionRecord;
}

// Get all sessions (reverse chronological)
export async function getSessions(): Promise<SessionRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }

  return (data ?? []) as SessionRecord[];
}

// Get today's sessions
export async function getTodaySessions(): Promise<SessionRecord[]> {
  const supabase = createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .gte("completed_at", todayStart.toISOString())
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Error fetching today sessions:", error);
    return [];
  }

  return (data ?? []) as SessionRecord[];
}

// Get sessions for a specific habit
export async function getSessionsByHabit(
  habitId: string
): Promise<SessionRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("habit_id", habitId)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions by habit:", error);
    return [];
  }

  return (data ?? []) as SessionRecord[];
}

// Get today's minutes for a specific habit
export async function getDailyGoalProgress(
  habitId: string
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("duration_seconds")
    .eq("habit_id", habitId)
    .gte("completed_at", todayStart.toISOString());

  if (error) {
    console.error("Error fetching daily goal progress:", error);
    return 0;
  }

  return Math.round(
    (data ?? []).reduce(
      (sum: number, s: { duration_seconds: number }) =>
        sum + s.duration_seconds,
      0
    ) / 60
  );
}

// Calculate current streak (consecutive days with at least one completed session)
export async function getStreak(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("completed_at")
    .eq("aborted", false)
    .order("completed_at", { ascending: false });

  if (error || !data || data.length === 0) return 0;

  // Get unique dates
  const uniqueDates = [
    ...new Set(
      data.map((s: { completed_at: string }) =>
        new Date(s.completed_at).toISOString().split("T")[0]
      )
    ),
  ].sort((a, b) => b.localeCompare(a)); // Most recent first

  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.round(
      (prevDate.getTime() - currDate.getTime()) / 86400000
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Get total focus minutes
export async function getTotalMinutes(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("duration_seconds");

  if (error) return 0;

  return Math.round(
    (data ?? []).reduce(
      (sum: number, s: { duration_seconds: number }) =>
        sum + s.duration_seconds,
      0
    ) / 60
  );
}

// Get completion rate (sessions completed / sessions total)
export async function getCompletionRate(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("aborted");

  if (error || !data || data.length === 0) return 0;

  const completed = data.filter(
    (s: { aborted: boolean }) => !s.aborted
  ).length;
  return Math.round((completed / data.length) * 100);
}
