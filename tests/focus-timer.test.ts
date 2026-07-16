/**
 * Unit tests for the clock-driven timer logic used by the Focus Timer.
 *
 * The core insight: the focus timer stores an absolute end timestamp
 * (`focusEndTimeRef`) and calculates remaining seconds as:
 *   remaining = max(0, round((endTime - Date.now()) / 1000))
 *
 * These tests verify that this formula produces correct results across
 * a range of scenarios, including background tab throttling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Pure timer calculation (mirrors the logic in MeditationTab.tsx L719-720) ───
function calcFocusRemaining(endTime: number, now: number): number {
  return Math.max(0, Math.round((endTime - now) / 1000));
}

describe('Focus Timer — Clock-Driven Countdown', () => {
  it('returns the full duration at the start', () => {
    const now = Date.now();
    const endTime = now + 25 * 60 * 1000; // 25 minutes
    expect(calcFocusRemaining(endTime, now)).toBe(25 * 60);
  });

  it('returns correct remaining after 10 seconds', () => {
    const now = Date.now();
    const endTime = now + 25 * 60 * 1000;
    const tenSecondsLater = now + 10_000;
    expect(calcFocusRemaining(endTime, tenSecondsLater)).toBe(25 * 60 - 10);
  });

  it('returns 0 when past end time', () => {
    const now = Date.now();
    const endTime = now + 60_000; // 1 minute
    const twoMinutesLater = now + 120_000;
    expect(calcFocusRemaining(endTime, twoMinutesLater)).toBe(0);
  });

  it('never returns negative', () => {
    const now = Date.now();
    const endTime = now - 5000; // 5 seconds ago
    expect(calcFocusRemaining(endTime, now)).toBe(0);
  });

  it('is accurate after a long background pause (simulating 10 min throttle)', () => {
    const now = Date.now();
    const endTime = now + 25 * 60 * 1000; // 25 min session
    // Browser tabs can throttle intervals; simulate 10 minutes of silence
    const afterPause = now + 10 * 60 * 1000;
    expect(calcFocusRemaining(endTime, afterPause)).toBe(15 * 60); // 15 min remaining
  });

  it('handles exact boundary (remaining = 0 at the exact end time)', () => {
    const now = Date.now();
    const endTime = now + 60_000;
    expect(calcFocusRemaining(endTime, endTime)).toBe(0);
  });

  it('rounds correctly at half-second boundaries', () => {
    const now = Date.now();
    const endTime = now + 60_000;
    // 500ms past a second boundary → rounds to nearest second
    expect(calcFocusRemaining(endTime, now + 500)).toBe(60);   // rounds up
    expect(calcFocusRemaining(endTime, now + 1499)).toBe(59);  // rounds to 59
    expect(calcFocusRemaining(endTime, now + 1500)).toBe(59);  // midpoint rounds to 59
  });
});

describe('Focus Timer — Session Logging Guard', () => {
  it('handleLogSession is idempotent (sessionLogged flag)', () => {
    // Simulates the guard at MeditationTab.tsx L642
    let sessionLogged = false;
    let logCallCount = 0;

    function handleLogSession() {
      if (sessionLogged) return;
      logCallCount++;
      sessionLogged = true;
    }

    handleLogSession();
    handleLogSession();
    handleLogSession();

    expect(logCallCount).toBe(1);
  });
});
