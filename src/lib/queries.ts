"use client";

// App-wide cached resources for data shared across many dashboard components
// (History tab, Goals tab, daily progress sidebar, stat cards, activity
// heatmap). See resourceStore.ts for the caching behavior.

import { createResource, useResource } from "@/lib/resourceStore";
import { getSessions, getStreak, type SessionRecord } from "@/lib/sessions";
import { getHabits, type Habit } from "@/lib/habits";

export const sessionsResource = createResource<SessionRecord[]>(getSessions, 600000); // 10m TTL
export const habitsResource = createResource<Habit[]>(getHabits, 600000); // 10m TTL
export const streakResource = createResource<number>(getStreak, 600000); // 10m TTL

/** Clears all cached data — call on sign-out so the next user never sees a stale session's data. */
export function resetQueryCaches() {
  sessionsResource.reset();
  habitsResource.reset();
  streakResource.reset();
}

/** Revalidates all resources in the background — call after a mutation (new session, habit change) so every consumer picks up the change without a full reload. */
export function refreshQueryCaches() {
  sessionsResource.revalidate(true);
  habitsResource.revalidate(true);
  streakResource.revalidate(true);
}

export function useSessions() {
  const { data, loading, refetch } = useResource(sessionsResource);
  return { sessions: data ?? [], loading, refetch };
}

export function useHabits() {
  const { data, loading, refetch } = useResource(habitsResource);
  return { habits: data ?? [], loading, refetch };
}

export function useStreak() {
  const { data, loading, refetch } = useResource(streakResource);
  return { streak: data ?? 0, loading, refetch };
}
