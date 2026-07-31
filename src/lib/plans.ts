// ===== Unblock Focus — Plan Constants & Helpers =====

// --- Product IDs (from Polar dashboard) ---
export const POLAR_PRODUCTS = {
  pro_monthly: "cf1869cc-ef9e-483e-8b8e-0cc0b3fabb0a",
  pro_yearly: "ad7a220f-9e03-4f85-92c0-b27b85349a81",
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
