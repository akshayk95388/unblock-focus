// Active session persistence (localStorage).
//
// Preserves in-progress guided / focus / breathing sessions across page
// refreshes and crashes. Only the UI state is persisted here — the database
// is still written once on completion/abort via the existing saveSession
// paths. All reads fail open: anything corrupt, invalid, expired, or already
// logged is cleared and treated as "no active session" so a bad payload can
// never block the app from loading.

export const ACTIVE_SESSION_KEY = "unblock-active-session";
export const ACTIVE_BREATHING_KEY = "unblock-active-breathing";

/** Sessions older than this are discarded without resuming or logging. */
export const ACTIVE_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const SCHEMA_VERSION = 1;

export type GuidedStatus = "generating" | "playing" | "post_reset" | "focus_timer";

export interface StoredSubtitle {
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface GuidedSnapshot {
  v: number;
  clientSessionId: string;
  savedAt: number;
  logged: boolean;
  status: GuidedStatus;
  jobId?: string | null;
  stressor?: string;
  title: string;
  workTask: string;
  llmFocusTask?: string;
  selectedHabitId?: string;
  durationMins: number;
  voice?: string;
  music?: string;
  actualDuration: number;
  /** Static (query-stripped) audio URL; re-signed on restore if it is an S3 URL. */
  audioUrl?: string | null;
  subtitles?: StoredSubtitle[];
  playbackPositionSeconds?: number;
  focusDuration: number;
  focusEndTime?: number;
  focusStartTime?: number;
  resetDone: boolean;
  focusTimerUsed: boolean;
}

export interface BreathingSnapshot {
  v: number;
  clientSessionId: string;
  savedAt: number;
  logged: boolean;
  techniqueId: string;
  durationMinutes: number;
  /** Absolute timestamp the breathing phase started (wall-clock resume). */
  breathingStartTime: number;
}

const GUIDED_STATUSES: GuidedStatus[] = [
  "generating",
  "playing",
  "post_reset",
  "focus_timer",
];

// ─── small helpers ───

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isExpired(savedAt: number, now: number = Date.now()): boolean {
  if (!isFiniteNumber(savedAt)) return true;
  return now - savedAt > ACTIVE_SESSION_TTL_MS;
}

export function createClientSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `cs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Strip query params (e.g. presigned params) so we persist a stable static URL. */
export function stripAudioQuery(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url.split("?")[0];
  }
}

function normalizeSubtitles(value: unknown): StoredSubtitle[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: StoredSubtitle[] = [];
  for (const entry of value) {
    if (
      isPlainObject(entry) &&
      typeof entry.text === "string" &&
      isFiniteNumber(entry.start_ms) &&
      isFiniteNumber(entry.end_ms)
    ) {
      out.push({ text: entry.text, start_ms: entry.start_ms, end_ms: entry.end_ms });
    }
  }
  return out;
}

// ─── pure validators (exported for tests) ───
// Return a normalized snapshot, or null if the payload is unusable (corrupt,
// wrong version, expired, or already logged).

export function parseGuidedSnapshot(
  raw: unknown,
  now: number = Date.now()
): GuidedSnapshot | null {
  if (!isPlainObject(raw)) return null;
  if (raw.v !== SCHEMA_VERSION) return null;
  if (!isFiniteNumber(raw.savedAt) || isExpired(raw.savedAt, now)) return null;
  if (raw.logged === true) return null;
  if (!isNonEmptyString(raw.clientSessionId)) return null;

  const status = raw.status;
  if (typeof status !== "string" || !GUIDED_STATUSES.includes(status as GuidedStatus)) {
    return null;
  }
  const guidedStatus = status as GuidedStatus;

  // Per-status required fields.
  if (guidedStatus === "generating" && !isNonEmptyString(raw.jobId)) return null;
  if (guidedStatus === "playing" && !isNonEmptyString(raw.audioUrl)) return null;
  if (guidedStatus === "focus_timer" && !isFiniteNumber(raw.focusEndTime)) return null;

  const durationMins = isFiniteNumber(raw.durationMins) && raw.durationMins > 0 ? raw.durationMins : NaN;
  if (!isFiniteNumber(durationMins)) return null;
  const focusDuration = isFiniteNumber(raw.focusDuration) && raw.focusDuration > 0 ? raw.focusDuration : NaN;
  if (!isFiniteNumber(focusDuration)) return null;

  return {
    v: SCHEMA_VERSION,
    clientSessionId: raw.clientSessionId,
    savedAt: raw.savedAt,
    logged: false,
    status: guidedStatus,
    jobId: isNonEmptyString(raw.jobId) ? raw.jobId : null,
    stressor: typeof raw.stressor === "string" ? raw.stressor : undefined,
    title: isNonEmptyString(raw.title) ? raw.title : "Guided Session",
    workTask: typeof raw.workTask === "string" ? raw.workTask : "Focused Work",
    llmFocusTask: typeof raw.llmFocusTask === "string" ? raw.llmFocusTask : undefined,
    selectedHabitId: isNonEmptyString(raw.selectedHabitId) ? raw.selectedHabitId : undefined,
    durationMins,
    voice: typeof raw.voice === "string" ? raw.voice : undefined,
    music: typeof raw.music === "string" ? raw.music : undefined,
    actualDuration: isFiniteNumber(raw.actualDuration) && raw.actualDuration >= 0 ? raw.actualDuration : 0,
    audioUrl: isNonEmptyString(raw.audioUrl) ? raw.audioUrl : null,
    subtitles: normalizeSubtitles(raw.subtitles),
    playbackPositionSeconds:
      isFiniteNumber(raw.playbackPositionSeconds) && raw.playbackPositionSeconds >= 0
        ? raw.playbackPositionSeconds
        : 0,
    focusDuration,
    focusEndTime: isFiniteNumber(raw.focusEndTime) ? raw.focusEndTime : undefined,
    focusStartTime: isFiniteNumber(raw.focusStartTime) ? raw.focusStartTime : undefined,
    resetDone: raw.resetDone === true,
    focusTimerUsed: raw.focusTimerUsed === true,
  };
}

export function parseBreathingSnapshot(
  raw: unknown,
  now: number = Date.now()
): BreathingSnapshot | null {
  if (!isPlainObject(raw)) return null;
  if (raw.v !== SCHEMA_VERSION) return null;
  if (!isFiniteNumber(raw.savedAt) || isExpired(raw.savedAt, now)) return null;
  if (raw.logged === true) return null;
  if (!isNonEmptyString(raw.clientSessionId)) return null;
  if (!isNonEmptyString(raw.techniqueId)) return null;
  if (!isFiniteNumber(raw.durationMinutes) || raw.durationMinutes <= 0) return null;
  if (!isFiniteNumber(raw.breathingStartTime)) return null;

  return {
    v: SCHEMA_VERSION,
    clientSessionId: raw.clientSessionId,
    savedAt: raw.savedAt,
    logged: false,
    techniqueId: raw.techniqueId,
    durationMinutes: raw.durationMinutes,
    breathingStartTime: raw.breathingStartTime,
  };
}

// ─── storage wrappers (fail-open) ───

function safeGetItem(key: string): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemoveItem(key: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore — storage unavailable */
  }
}

function safeSetItem(key: string, value: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded / private mode: skip persisting. The live in-memory
    // session keeps working; we just can't restore it after a refresh.
  }
}

export function clearGuidedSnapshot(): void {
  safeRemoveItem(ACTIVE_SESSION_KEY);
}

export function clearBreathingSnapshot(): void {
  safeRemoveItem(ACTIVE_BREATHING_KEY);
}

export function clearAllActiveSessions(): void {
  clearGuidedSnapshot();
  clearBreathingSnapshot();
}

/**
 * Read + validate the guided/focus snapshot. Any failure (missing, corrupt,
 * wrong version, expired, or already logged) clears the key and returns null.
 */
export function readGuidedSnapshot(now: number = Date.now()): GuidedSnapshot | null {
  const raw = safeGetItem(ACTIVE_SESSION_KEY);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearGuidedSnapshot();
    return null;
  }
  const snapshot = parseGuidedSnapshot(parsed, now);
  if (!snapshot) {
    clearGuidedSnapshot();
    return null;
  }
  return snapshot;
}

export function readBreathingSnapshot(now: number = Date.now()): BreathingSnapshot | null {
  const raw = safeGetItem(ACTIVE_BREATHING_KEY);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearBreathingSnapshot();
    return null;
  }
  const snapshot = parseBreathingSnapshot(parsed, now);
  if (!snapshot) {
    clearBreathingSnapshot();
    return null;
  }
  return snapshot;
}

/** Persist a guided/focus snapshot. Clears the breathing key (mutual exclusion). */
export function writeGuidedSnapshot(
  snapshot: Omit<GuidedSnapshot, "v" | "savedAt"> & { savedAt?: number }
): void {
  clearBreathingSnapshot();
  const payload: GuidedSnapshot = {
    ...snapshot,
    v: SCHEMA_VERSION,
    savedAt: snapshot.savedAt ?? Date.now(),
  };
  safeSetItem(ACTIVE_SESSION_KEY, JSON.stringify(payload));
}

/** Persist a breathing snapshot. Clears the guided key (mutual exclusion). */
export function writeBreathingSnapshot(
  snapshot: Omit<BreathingSnapshot, "v" | "savedAt"> & { savedAt?: number }
): void {
  clearGuidedSnapshot();
  const payload: BreathingSnapshot = {
    ...snapshot,
    v: SCHEMA_VERSION,
    savedAt: snapshot.savedAt ?? Date.now(),
  };
  safeSetItem(ACTIVE_BREATHING_KEY, JSON.stringify(payload));
}

/**
 * Mark a snapshot as logged just before saving to the DB, so a crash mid-save
 * cannot resurrect it and double-insert on the next load. Best-effort.
 */
export function markGuidedLogged(): void {
  const raw = safeGetItem(ACTIVE_SESSION_KEY);
  if (raw === null) return;
  try {
    const parsed = JSON.parse(raw);
    if (isPlainObject(parsed)) {
      parsed.logged = true;
      safeSetItem(ACTIVE_SESSION_KEY, JSON.stringify(parsed));
    }
  } catch {
    clearGuidedSnapshot();
  }
}

export function markBreathingLogged(): void {
  const raw = safeGetItem(ACTIVE_BREATHING_KEY);
  if (raw === null) return;
  try {
    const parsed = JSON.parse(raw);
    if (isPlainObject(parsed)) {
      parsed.logged = true;
      safeSetItem(ACTIVE_BREATHING_KEY, JSON.stringify(parsed));
    }
  } catch {
    clearBreathingSnapshot();
  }
}

/**
 * True when a raw cross-tab `storage` event payload indicates the session was
 * logged elsewhere (so other tabs should stop and not double-insert).
 */
export function isLoggedPayload(rawValue: string | null): boolean {
  if (!rawValue) return false;
  try {
    const parsed = JSON.parse(rawValue);
    return isPlainObject(parsed) && parsed.logged === true;
  } catch {
    return false;
  }
}
