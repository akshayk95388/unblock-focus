import mixpanel from "mixpanel-browser";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
let initialized = false;

export function initMixpanel(): void {
  if (!TOKEN || initialized || typeof window === "undefined") return;
  mixpanel.init(TOKEN, {
    debug: process.env.NODE_ENV !== "production",
    track_pageview: false,
    persistence: "localStorage",
    record_sessions_percent: 100,
  });
  initialized = true;
}

export function track(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !initialized) return;
  mixpanel.track(event, properties);
}
