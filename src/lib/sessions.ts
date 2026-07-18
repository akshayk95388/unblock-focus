// Supabase session persistence for authenticated users

import { createClient } from "@/lib/supabase/client";

export interface SubtitleEntry {
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  intent: string;
  habit_id?: string | null;
  duration_seconds: number;
  completed_at: string; // ISO date
  aborted: boolean;
  session_type: string; // 'guided', 'focus', 'breathing'
  audio_url?: string | null;
  subtitles?: SubtitleEntry[] | null;
  is_favorite: boolean;
}

// Save a completed session
export async function saveSession(
  intent: string,
  durationSeconds: number,
  habitId?: string,
  aborted: boolean = false,
  sessionType: string = "focus",
  audioUrl?: string | null,
  subtitles?: SubtitleEntry[] | null
): Promise<SessionRecord | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("saveSession: No authenticated user, cannot save");
    return null;
  }

  // Strip query params from presigned URLs — store the clean static S3 URL
  let staticAudioUrl: string | null = null;
  if (audioUrl) {
    try {
      const parsed = new URL(audioUrl);
      staticAudioUrl = parsed.origin + parsed.pathname;
    } catch {
      staticAudioUrl = audioUrl.split("?")[0];
    }
  }

  const roundedDuration = Math.round(durationSeconds);

  const payload = {
    user_id: user.id,
    intent,
    habit_id: habitId || null,
    duration_seconds: roundedDuration,
    aborted,
    session_type: sessionType,
    audio_url: staticAudioUrl,
    subtitles: subtitles || null,
  };

  console.log("saveSession: Inserting session", { intent, sessionType, durationSeconds: roundedDuration, hasAudio: !!staticAudioUrl });

  const { data, error } = await supabase
    .from("sessions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("saveSession: Error:", error.message, "| code:", error.code, "| details:", error.details, "| hint:", error.hint);

    // Fallback: if insert failed (e.g. PostgREST schema cache stale for new columns),
    // retry without audio fields so the session is at least recorded
    console.warn("saveSession: Retrying without audio fields...");
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        intent,
        habit_id: habitId || null,
        duration_seconds: roundedDuration,
        aborted,
        session_type: sessionType,
      })
      .select()
      .single();

    if (fallbackError) {
      console.error("saveSession: Fallback also failed:", fallbackError.message, "| code:", fallbackError.code);
      return null;
    }

    console.log("saveSession: Fallback saved (without audio)", fallbackData.id);
    return fallbackData as SessionRecord;
  }

  console.log("saveSession: Session saved successfully", data.id);
  return data as SessionRecord;
}

// Toggle favorite status on a session
export async function toggleFavorite(
  sessionId: string,
  isFavorite: boolean
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("sessions")
    .update({ is_favorite: isFavorite })
    .eq("id", sessionId);

  if (error) {
    console.error("Error toggling favorite:", error);
    return false;
  }

  return true;
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
