// LocalStorage session persistence for guest users

export interface SessionRecord {
  id: string;
  intent: string;
  habitId?: string; // linked habit
  durationSeconds: number;
  completedAt: string; // ISO date
  aborted?: boolean;
}

const SESSIONS_KEY = "unblock_sessions";
const STREAK_KEY = "unblock_streak";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Save a completed session
export function saveSession(
  intent: string,
  durationSeconds: number,
  habitId?: string,
  aborted: boolean = false
): SessionRecord {
  const record: SessionRecord = {
    id: generateId(),
    intent,
    habitId,
    durationSeconds,
    completedAt: new Date().toISOString(),
    aborted,
  };

  const existing = getSessions();
  existing.push(record);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(existing));

  // Update streak only if successfully completed
  if (!aborted) {
    updateStreak(record.completedAt);
  }

  return record;
}

// Get all sessions
export function getSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Get today's sessions
export function getTodaySessions(): SessionRecord[] {
  const today = new Date().toISOString().split("T")[0];
  return getSessions().filter(
    (s) => s.completedAt.split("T")[0] === today
  );
}

// Get sessions for a specific habit
export function getSessionsByHabit(habitId: string): SessionRecord[] {
  return getSessions().filter((s) => s.habitId === habitId);
}

// Get today's minutes for a specific habit
export function getDailyGoalProgress(habitId: string): number {
  const today = new Date().toISOString().split("T")[0];
  return Math.round(
    getSessions()
      .filter((s) => s.habitId === habitId && s.completedAt.split("T")[0] === today)
      .reduce((sum, s) => sum + s.durationSeconds, 0) / 60
  );
}

// Calculate current streak
export function getStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as { count: number; lastDate: string };

    // Check if streak is still active (last session was today or yesterday)
    const lastDate = new Date(data.lastDate);
    const today = new Date();
    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 1) return 0; // Streak broken
    return data.count;
  } catch {
    return 0;
  }
}

function updateStreak(completedAt: string): void {
  const today = new Date(completedAt).toISOString().split("T")[0];

  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const data = JSON.parse(raw) as { count: number; lastDate: string };
      const lastDate = data.lastDate.split("T")[0];

      if (lastDate === today) {
        return; // Already recorded today
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === yesterdayStr) {
        localStorage.setItem(
          STREAK_KEY,
          JSON.stringify({ count: data.count + 1, lastDate: completedAt })
        );
      } else {
        localStorage.setItem(
          STREAK_KEY,
          JSON.stringify({ count: 1, lastDate: completedAt })
        );
      }
    } else {
      localStorage.setItem(
        STREAK_KEY,
        JSON.stringify({ count: 1, lastDate: completedAt })
      );
    }
  } catch {
    localStorage.setItem(
      STREAK_KEY,
      JSON.stringify({ count: 1, lastDate: completedAt })
    );
  }
}

// Get total focus minutes
export function getTotalMinutes(): number {
  const sessions = getSessions();
  return Math.round(
    sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
  );
}

// Get completion rate (sessions completed / sessions total)
export function getCompletionRate(): number {
  const sessions = getSessions();
  if (sessions.length === 0) return 0;
  const completed = sessions.filter((s) => !s.aborted).length;
  return Math.round((completed / sessions.length) * 100);
  return 100; // All saved sessions are completed sessions
}
