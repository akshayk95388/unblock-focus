# Unblock MVP Task Plan

## Design System Reference
- Use the design and coloring from the `/stitch` folder
- "Obsidian Ember" aesthetic: #131314 background, #FF823C primary-container, glassmorphism
- No-Line Rule: use tonal shifts instead of 1px borders

---

### Phase 1: Project Setup & Landing Page ✅
- [x] Initialize Next.js app with TailwindCSS v4 and Inter font
- [x] Extract design tokens from `stitch/design.md` and `stitch/code.html` into `globals.css`
- [x] Build responsive Landing Page with hero, protocol cards, feature grid, and bottom CTA

### Phase 2: SOS State Machine (Breathing & Intent) ✅
- [x] Build `FocusEngine` state machine shell (breathing → intent → timer → success)
- [x] Build the **Breathing Screen** with glassmorphic expanding/contracting circle and countdown
- [x] Build the **Intent Screen** with editorial input, gradient glow, and suggestion cards
- [x] Implement logic to capture intent string and advance state to Timer

### Phase 3: The Execution Engine (Timer & Audio) ✅
- [x] Build the **Timer Screen** component (05:00 countdown + progress ring)
- [x] Implement interval countdown and dynamic browser `<title>` updates
- [x] Integrate brown noise via Web Audio API (fade-in ambient loop)
- [x] Build the **Quit Trap Warning** overlay

### Phase 4: Completion & Virality Engine ✅
- [x] Build the **Success Screen** component with streak badge card
- [x] Implement continuance logic (extend for 20 minutes)
- [x] Integrate `html-to-image` + clipboard API for "Share my Win"
- [x] Implement LocalStorage session persistence

---

### Phase 5: Dashboard & Habits
- [x] **Data Layer**: Create `habits.ts` with Habit type, CRUD, and default seeds
- [x] **Data Layer**: Update `sessions.ts` with `habitId`, `getTodaySessions()`, `getDailyGoalProgress()`
- [x] **Layout**: Build `DashboardLayout.tsx` (top nav, sidebar, content area)
- [x] **Dashboard Page**: Build `/dashboard/page.tsx` with hero, stat cards, sessions list
- [x] **Stat Cards**: Build `StatCards.tsx` (Focus Streak, Total Sessions, Completion Rate)
- [x] **Today's Sessions**: Build `TodaySessions.tsx` (session list grouped by habit)
- [x] **Daily Goal Progress**: Build `DailyGoalProgress.tsx` (right sidebar progress bars)
- [x] **Habit Manager**: Build `HabitManager.tsx` (create/edit/delete habits modal)
- [x] **Tabs**: Build `HabitsTab.tsx` and `HistoryTab.tsx` to handle secondary navigation
- [x] **Intent Integration**: Update Intent to show habit selector chips
- [x] **FocusEngine Integration**: Pass `habitId` through the flow and save to session
- [x] **Navigation**: Add "Dashboard" link from landing page header, and make Start Now route to dashboard

---

### Phase 6: Strict but Forgiving Sessions
- [x] **Data Layer**: Add `aborted` flag to `SessionRecord` and update `saveSession`
- [x] **Streak Logic**: Only increment streaks for successful (`!aborted`) sessions
- [x] **FocusEngine**: Pass elapsed time on quit and store incomplete sessions instead of discarding
- [x] **UI**: Render aborted sessions greyed-out with a red badge in the History tab
