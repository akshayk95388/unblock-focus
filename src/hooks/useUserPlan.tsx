"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import type { PlanType } from "@/lib/plans";

interface CachedPlan {
  planType: PlanType;
  credits: number;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  polarCustomerId: string | null;
  preferences: Record<string, any>;
}

interface UserPlan extends CachedPlan {
  loading: boolean;
  refetch: () => Promise<void>;
}

// Last-known plan is cached per-user in localStorage so a returning user sees
// their real plan/credits instantly instead of a hardcoded default (e.g. "3
// credits", "Free") that then flips to the correct value a moment later.
const CACHE_PREFIX = "unblock_plan_cache_";

function readCachedPlan(userId: string): CachedPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + userId);
    return raw ? (JSON.parse(raw) as CachedPlan) : null;
  } catch {
    return null;
  }
}

function writeCachedPlan(userId: string, plan: CachedPlan) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(plan));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) — safe to ignore
  }
}

const DEFAULT_PLAN: CachedPlan = {
  planType: "free",
  credits: 0,
  subscriptionStatus: null,
  subscriptionId: null,
  polarCustomerId: null,
  preferences: {},
};

const UserPlanContext = createContext<UserPlan>({
  ...DEFAULT_PLAN,
  loading: true,
  refetch: async () => {},
});

export function UserPlanProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<CachedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedUserId = useRef<string | null>(null);

  const fetchPlan = useCallback(async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("plan_type, credits, subscription_status, subscription_id, polar_customer_id, preferences")
        .eq("id", userId)
        .single();

      if (error) {
        // If columns don't exist yet (migration not applied), leave whatever
        // we already have (cached or default) rather than clobbering it.
        console.warn("useUserPlan: Could not fetch plan data:", error.message);
        return;
      }

      if (data) {
        const next: CachedPlan = {
          planType: (data.plan_type as PlanType) || "free",
          credits: data.credits ?? 0,
          subscriptionStatus: data.subscription_status ?? null,
          subscriptionId: data.subscription_id ?? null,
          polarCustomerId: data.polar_customer_id ?? null,
          preferences: (data.preferences as Record<string, any>) ?? {},
        };
        setPlan(next);
        writeCachedPlan(userId, next);
      }
    } catch (err) {
      console.error("useUserPlan: Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPlan(null);
      setLoading(false);
      loadedUserId.current = null;
      return;
    }
    if (loadedUserId.current === user.id) return;
    loadedUserId.current = user.id;

    // Hydrate synchronously from the last-known plan for this user, then
    // silently refresh in the background — avoids ever showing a default
    // value the user knows is wrong (e.g. Pro users briefly seeing "Free").
    const cached = readCachedPlan(user.id);
    if (cached) {
      setPlan(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetchPlan(user.id);
  }, [user, authLoading, fetchPlan]);

  const refetch = useCallback(async () => {
    if (user) await fetchPlan(user.id);
  }, [user, fetchPlan]);

  const value = plan ?? DEFAULT_PLAN;

  return (
    <UserPlanContext.Provider
      value={{
        ...value,
        loading,
        refetch,
      }}
    >
      {children}
    </UserPlanContext.Provider>
  );
}

export function useUserPlan(): UserPlan {
  return useContext(UserPlanContext);
}

