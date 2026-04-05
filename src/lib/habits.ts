// LocalStorage habits management

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // tailwind color token
  dailyGoalMinutes: number;
  createdAt: string; // ISO date
}

const HABITS_KEY = "unblock_habits";
const SEEDED_KEY = "unblock_habits_seeded";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_HABITS: Omit<Habit, "id" | "createdAt">[] = [
  { name: "Deep Work", emoji: "🔥", color: "primary", dailyGoalMinutes: 120 },
  { name: "Reading", emoji: "📚", color: "secondary", dailyGoalMinutes: 30 },
  { name: "Exercise", emoji: "💪", color: "tertiary", dailyGoalMinutes: 45 },
];

function seedDefaults(): void {
  const seeded = localStorage.getItem(SEEDED_KEY);
  if (seeded) return;

  const habits: Habit[] = DEFAULT_HABITS.map((h) => ({
    ...h,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }));

  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  localStorage.setItem(SEEDED_KEY, "true");
}

export function getHabits(): Habit[] {
  try {
    seedDefaults();
    const raw = localStorage.getItem(HABITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getHabitById(id: string): Habit | undefined {
  return getHabits().find((h) => h.id === id);
}

export function addHabit(
  name: string,
  emoji: string,
  color: string,
  dailyGoalMinutes: number
): Habit {
  const habit: Habit = {
    id: generateId(),
    name,
    emoji,
    color,
    dailyGoalMinutes,
    createdAt: new Date().toISOString(),
  };

  const existing = getHabits();
  existing.push(habit);
  localStorage.setItem(HABITS_KEY, JSON.stringify(existing));

  return habit;
}

export function updateHabit(
  id: string,
  updates: Partial<Omit<Habit, "id" | "createdAt">>
): Habit | null {
  const habits = getHabits();
  const idx = habits.findIndex((h) => h.id === id);
  if (idx === -1) return null;

  habits[idx] = { ...habits[idx], ...updates };
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  return habits[idx];
}

export function deleteHabit(id: string): boolean {
  const habits = getHabits();
  const filtered = habits.filter((h) => h.id !== id);
  if (filtered.length === habits.length) return false;

  localStorage.setItem(HABITS_KEY, JSON.stringify(filtered));
  return true;
}
