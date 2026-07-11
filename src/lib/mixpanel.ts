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
    record_mask_text_selector: "",   // show all text
    record_mask_all_inputs: true,    // hide input fields only
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
