<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:mixpanel-analytics -->
## Analytics — Mixpanel

**SDK:** `mixpanel-browser@2.81.0` (client-side)
**Tracking method:** Client-side only — no server-side tracking, no CDP
**Consent gate:** Not required (no EU/CA users)
**Identity management:** Not applicable — fully anonymous app (localStorage only, no login/logout)

### Files

| Purpose | File |
|---|---|
| Init + `track()` helper | `src/lib/mixpanel.ts` |
| Client-side initializer component | `src/components/MixpanelInit.tsx` |
| Mounted in layout | `src/app/layout.tsx` |

### How to add a new tracking call

```typescript
import { track } from "@/lib/mixpanel";

track("event_name", { property_key: value });
```

Call `track()` only inside `"use client"` components or after confirming `typeof window !== "undefined"`. The helper already guards against SSR.

### Tracking Plan

| Event | Trigger | Key Properties |
|---|---|---|
| `home_page_viewed` | Landing page (`/`) mounts | — |
| `focus_page_viewed` | Dashboard (`/focus`) mounts | — |
| `guided_session_started` | User submits stressor and starts a guided session | `stressor_provided` (bool), `duration_mins` |
| `focus_session_started` | User clicks "Skip to focus session" | — |
| `breathing_session_started` | User starts a breathing exercise | `duration_mins` |
| `guided_session_completed` | Guided session finishes (Value Moment) | `duration_mins`, `duration_seconds`, `goal_name?` |
| `focus_session_completed` | Focus timer completes (Value Moment) | `duration_mins`, `duration_seconds`, `goal_name?` |
| `breathing_session_completed` | Breathing session finishes (Value Moment) | `duration_mins`, `duration_seconds`, `goal_name` |
| `guided_session_aborted` | User quits a guided session early via quit trap | `duration_seconds` |
| `focus_session_aborted` | User quits a focus session early via quit trap | `duration_seconds` |

### Naming conventions

- Event names: `snake_case`, past-tense verb → `session_completed` not `SessionCompleted`
- Property names: `snake_case` → `duration_mins` not `durationMins`
- Property values: lowercase strings → `"guided"` not `"Guided"`
- Never use `$` or `mp_` prefixes on custom properties
- Never construct event names dynamically at runtime

### Do NOT

- Add Google Analytics, Amplitude, Segment, or any other analytics tool — Mixpanel is the sole analytics provider
- Track PII (names, emails, IP addresses) as event properties
- Fire events before the triggering action succeeds (track after `saveSession()`, not on button click)
- Call `track()` in server components or outside the browser environment
<!-- END:mixpanel-analytics -->
