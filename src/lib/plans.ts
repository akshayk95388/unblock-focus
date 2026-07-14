// ===== Unblock Focus — Plan Constants & Helpers =====

// --- Product IDs (from Polar dashboard) ---
export const POLAR_PRODUCTS = {
  pro_monthly: "a3f346b7-a0c6-420f-b486-e9d398d5099d",
  pro_yearly: "2ae81c0c-62ea-475e-89a1-7e1cde809d3e",
} as const;

// --- Credit Limits ---
export const FREE_CREDITS = 3;
export const PRO_CREDITS = 100;

// --- Feature Gating ---
export const FREE_FOCUS_DURATIONS = [15, 25];
export const ALL_FOCUS_DURATIONS = [15, 25, 45, 90];

export const FREE_BREATHING_TECHNIQUES = ["box"];
export const ALL_BREATHING_TECHNIQUES = [
  "box",
  "physiological_sigh",
  "relaxing_478",
  "alternate_nostril",
  "wim_hof",
];

export const FREE_REPLAY_LIMIT = 3;

// --- Helpers ---
export type PlanType = "free" | "pro";

export function isPro(planType: string | null | undefined): boolean {
  return planType === "pro";
}

export function canUseFocusDuration(
  planType: string | null | undefined,
  duration: number | string
): boolean {
  if (isPro(planType)) return true;
  if (duration === "custom") return false;
  return FREE_FOCUS_DURATIONS.includes(Number(duration));
}

export function canUseBreathingTechnique(
  planType: string | null | undefined,
  techniqueId: string
): boolean {
  if (isPro(planType)) return true;
  return FREE_BREATHING_TECHNIQUES.includes(techniqueId);
}

export function canReplaySession(
  planType: string | null | undefined,
  sessionIndex: number
): boolean {
  if (isPro(planType)) return true;
  return sessionIndex < FREE_REPLAY_LIMIT;
}

export function hasCredits(credits: number | null | undefined): boolean {
  return (credits ?? 0) > 0;
}
