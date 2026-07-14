"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import type { PlanType } from "@/lib/plans";

interface UserPlan {
  planType: PlanType;
  credits: number;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  polarCustomerId: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useUserPlan(): UserPlan {
  const { user } = useAuth();
  const [planType, setPlanType] = useState<PlanType>("free");
  const [credits, setCredits] = useState<number>(3);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [polarCustomerId, setPolarCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("plan_type, credits, subscription_status, subscription_id, polar_customer_id")
        .eq("id", user.id)
        .single();

      if (error) {
        // If columns don't exist yet (migration not applied), default to free
        console.warn("useUserPlan: Could not fetch plan data:", error.message);
        setPlanType("free");
        setCredits(3);
        setLoading(false);
        return;
      }

      if (data) {
        setPlanType((data.plan_type as PlanType) || "free");
        setCredits(data.credits ?? 3);
        setSubscriptionStatus(data.subscription_status ?? null);
        setSubscriptionId(data.subscription_id ?? null);
        setPolarCustomerId(data.polar_customer_id ?? null);
      }
    } catch (err) {
      console.error("useUserPlan: Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    planType,
    credits,
    subscriptionStatus,
    subscriptionId,
    polarCustomerId,
    loading,
    refetch: fetchPlan,
  };
}
