/**
 * Unit tests for the active-session persistence helper.
 *
 * Focus areas: fail-open reads (corrupt/invalid/expired/logged payloads never
 * throw and are cleared), wall-clock resume math, audio key stripping, and
 * mutual exclusion between the guided and breathing keys.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ACTIVE_SESSION_KEY,
  ACTIVE_BREATHING_KEY,
  ACTIVE_SESSION_TTL_MS,
  isExpired,
  stripAudioQuery,
  parseGuidedSnapshot,
  parseBreathingSnapshot,
  readGuidedSnapshot,
  readBreathingSnapshot,
  writeGuidedSnapshot,
  writeBreathingSnapshot,
  clearAllActiveSessions,
  isLoggedPayload,
  type GuidedSnapshot,
  type BreathingSnapshot,
} from "@/lib/active-session-storage";

const NOW = 1_000_000_000_000;

function validGuided(overrides: Partial<GuidedSnapshot> = {}): GuidedSnapshot {
  return {
    v: 1,
    clientSessionId: "cs_1",
    savedAt: NOW,
    logged: false,
    status: "focus_timer",
    jobId: null,
    title: "Guided Session",
    workTask: "Focused Work",
    durationMins: 5,
    actualDuration: 300,
    audioUrl: null,
    focusDuration: 25,
    focusEndTime: NOW + 25 * 60 * 1000,
    focusStartTime: NOW,
    resetDone: false,
    focusTimerUsed: true,
    ...overrides,
  };
}

function validBreathing(overrides: Partial<BreathingSnapshot> = {}): BreathingSnapshot {
  return {
    v: 1,
    clientSessionId: "cs_b",
    savedAt: NOW,
    logged: false,
    techniqueId: "box",
    durationMinutes: 3,
    breathingStartTime: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("isExpired (2h TTL)", () => {
  it("is false within the window", () => {
    expect(isExpired(NOW, NOW + ACTIVE_SESSION_TTL_MS - 1)).toBe(false);
  });
  it("is true past the window", () => {
    expect(isExpired(NOW, NOW + ACTIVE_SESSION_TTL_MS + 1)).toBe(true);
  });
  it("treats a non-finite savedAt as expired", () => {
    expect(isExpired(NaN, NOW)).toBe(true);
  });
});

describe("stripAudioQuery", () => {
  it("removes presigned query params, keeping the static path", () => {
    expect(
      stripAudioQuery("https://bucket.s3.amazonaws.com/job/med.mp3?X-Amz-Signature=abc&y=1")
    ).toBe("https://bucket.s3.amazonaws.com/job/med.mp3");
  });
  it("passes through relative /media URLs", () => {
    expect(stripAudioQuery("/media/job/med.mp3")).toBe("/media/job/med.mp3");
  });
  it("returns null for empty input", () => {
    expect(stripAudioQuery(null)).toBeNull();
    expect(stripAudioQuery(undefined)).toBeNull();
  });
});

describe("parseGuidedSnapshot", () => {
  it("accepts a valid snapshot", () => {
    expect(parseGuidedSnapshot(validGuided(), NOW)).not.toBeNull();
  });
  it("rejects a wrong schema version", () => {
    expect(parseGuidedSnapshot(validGuided({ v: 2 }), NOW)).toBeNull();
  });
  it("rejects an expired snapshot", () => {
    expect(parseGuidedSnapshot(validGuided(), NOW + ACTIVE_SESSION_TTL_MS + 1)).toBeNull();
  });
  it("does not restore an already-logged snapshot", () => {
    expect(parseGuidedSnapshot(validGuided({ logged: true }), NOW)).toBeNull();
  });
  it("rejects an unknown status", () => {
    expect(parseGuidedSnapshot(validGuided({ status: "boom" as never }), NOW)).toBeNull();
  });
  it("requires jobId when generating", () => {
    expect(
      parseGuidedSnapshot(validGuided({ status: "generating", jobId: null }), NOW)
    ).toBeNull();
    expect(
      parseGuidedSnapshot(validGuided({ status: "generating", jobId: "job-1" }), NOW)
    ).not.toBeNull();
  });
  it("requires audioUrl when playing", () => {
    expect(parseGuidedSnapshot(validGuided({ status: "playing", audioUrl: null }), NOW)).toBeNull();
    expect(
      parseGuidedSnapshot(validGuided({ status: "playing", audioUrl: "/media/x.mp3" }), NOW)
    ).not.toBeNull();
  });
  it("requires a finite focusEndTime when focus_timer", () => {
    expect(
      parseGuidedSnapshot(validGuided({ status: "focus_timer", focusEndTime: undefined }), NOW)
    ).toBeNull();
  });
  it("rejects non-object payloads", () => {
    expect(parseGuidedSnapshot(null, NOW)).toBeNull();
    expect(parseGuidedSnapshot("nope", NOW)).toBeNull();
    expect(parseGuidedSnapshot([], NOW)).toBeNull();
  });
});

describe("parseBreathingSnapshot", () => {
  it("accepts a valid snapshot", () => {
    expect(parseBreathingSnapshot(validBreathing(), NOW)).not.toBeNull();
  });
  it("rejects a non-positive duration", () => {
    expect(parseBreathingSnapshot(validBreathing({ durationMinutes: 0 }), NOW)).toBeNull();
  });
  it("rejects a missing breathingStartTime", () => {
    expect(
      parseBreathingSnapshot(validBreathing({ breathingStartTime: NaN as never }), NOW)
    ).toBeNull();
  });
  it("does not restore an already-logged snapshot", () => {
    expect(parseBreathingSnapshot(validBreathing({ logged: true }), NOW)).toBeNull();
  });
});

describe("breathing wall-clock resume math", () => {
  it("computes elapsed from breathingStartTime", () => {
    const snap = validBreathing({ breathingStartTime: NOW });
    const elapsed = Math.round((NOW + 40_000 - snap.breathingStartTime) / 1000);
    expect(elapsed).toBe(40);
    expect(elapsed < snap.durationMinutes * 60).toBe(true); // still running
  });
  it("detects a session that finished while away", () => {
    const snap = validBreathing({ durationMinutes: 3, breathingStartTime: NOW });
    const elapsed = Math.round((NOW + 5 * 60_000 - snap.breathingStartTime) / 1000);
    expect(elapsed >= snap.durationMinutes * 60).toBe(true);
  });
});

describe("read* (fail open + clears bad data)", () => {
  it("returns null and clears corrupt JSON", () => {
    localStorage.setItem(ACTIVE_SESSION_KEY, "{not json");
    expect(readGuidedSnapshot(NOW)).toBeNull();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
  it("returns null and clears an invalid-shape payload", () => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ hello: "world" }));
    expect(readGuidedSnapshot(NOW)).toBeNull();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
  it("returns null and clears an expired snapshot", () => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(validGuided({ savedAt: NOW })));
    expect(readGuidedSnapshot(NOW + ACTIVE_SESSION_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
  it("round-trips a valid guided snapshot", () => {
    writeGuidedSnapshot(validGuided());
    const read = readGuidedSnapshot(NOW);
    expect(read?.status).toBe("focus_timer");
    expect(read?.clientSessionId).toBe("cs_1");
  });
  it("does not throw when setItem fails (quota / private mode)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => writeGuidedSnapshot(validGuided())).not.toThrow();
    spy.mockRestore();
  });
});

describe("mutual exclusion", () => {
  it("writing guided clears breathing", () => {
    writeBreathingSnapshot(validBreathing());
    expect(localStorage.getItem(ACTIVE_BREATHING_KEY)).not.toBeNull();
    writeGuidedSnapshot(validGuided());
    expect(localStorage.getItem(ACTIVE_BREATHING_KEY)).toBeNull();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).not.toBeNull();
  });
  it("writing breathing clears guided", () => {
    writeGuidedSnapshot(validGuided());
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).not.toBeNull();
    writeBreathingSnapshot(validBreathing());
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(ACTIVE_BREATHING_KEY)).not.toBeNull();
  });
  it("clearAllActiveSessions removes both", () => {
    writeGuidedSnapshot(validGuided());
    writeBreathingSnapshot(validBreathing());
    clearAllActiveSessions();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(ACTIVE_BREATHING_KEY)).toBeNull();
  });
});

describe("isLoggedPayload (cross-tab)", () => {
  it("is true for a logged payload", () => {
    expect(isLoggedPayload(JSON.stringify({ logged: true }))).toBe(true);
  });
  it("is false for a routine snapshot", () => {
    expect(isLoggedPayload(JSON.stringify({ logged: false }))).toBe(false);
  });
  it("is false for null or garbage", () => {
    expect(isLoggedPayload(null)).toBe(false);
    expect(isLoggedPayload("{bad")).toBe(false);
  });
});
