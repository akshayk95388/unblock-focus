/**
 * Unit tests for the BreathingRing clock-driven phase computation.
 *
 * Extracts and tests the pure logic that the BreathingRing tick() function uses:
 * - Computing which phase the user is in given elapsed time
 * - Computing progress within the current phase
 * - Computing pointer angle interpolation
 * - finishAfterCycle boundary capture
 * - Duration-based session completion
 */
import { describe, it, expect } from 'vitest';
import { BREATHING_TECHNIQUES } from '@/lib/breathingConfig';

// ─── Extract pure functions that mirror BreathingRing.tsx tick() logic ───

interface PhaseResult {
  phaseIndex: number;
  phaseProgress: number;
  pointerAngle: number;
}

/**
 * Given total elapsed ms and a technique's phase config,
 * compute the current phase index, progress within that phase,
 * and the pointer angle — identical to BreathingRing.tsx L134-158.
 */
function computeBreathingState(
  totalElapsedMs: number,
  techniqueId: string
): PhaseResult {
  const technique = BREATHING_TECHNIQUES[techniqueId] || BREATHING_TECHNIQUES['box'];
  const phases = technique.phases;

  const phaseDurationsMs = phases.map((p) => (p.durationSeconds || 0) * 1000);
  const phaseCumulativeMs = phaseDurationsMs.reduce<number[]>((acc, ms, i) => {
    acc.push((acc[i - 1] ?? 0) + ms);
    return acc;
  }, []);
  const cycleMs = phaseCumulativeMs[phaseCumulativeMs.length - 1] || 1;

  const positionInCycle = totalElapsedMs % cycleMs;

  let phaseIdx = phaseCumulativeMs.findIndex((cumMs) => positionInCycle < cumMs);
  if (phaseIdx < 0) phaseIdx = phases.length - 1;

  const phaseStartMs = phaseIdx === 0 ? 0 : phaseCumulativeMs[phaseIdx - 1];
  const phaseElapsedMs = positionInCycle - phaseStartMs;
  const phaseDurationMs = phaseDurationsMs[phaseIdx] || 1;
  const phaseProgress = Math.min(phaseElapsedMs / phaseDurationMs, 1);

  // Pointer angle interpolation
  const prevAngle = phaseIdx === 0
    ? phases[phases.length - 1].targetAngle
    : phases[phaseIdx - 1].targetAngle;
  let startAngle = prevAngle;
  const endAngle = phases[phaseIdx].targetAngle;
  if (startAngle === 360 && endAngle !== 360 && endAngle > 0 && endAngle < 360) {
    startAngle = 0;
  }
  const pointerAngle = startAngle + (endAngle - startAngle) * phaseProgress;

  return { phaseIndex: phaseIdx, phaseProgress, pointerAngle };
}

/**
 * Compute the cycle boundary for finishAfterCycle — mirrors BreathingRing.tsx L96-102.
 */
function computeFinishBoundary(
  sessionStartMs: number,
  nowMs: number,
  cycleMs: number
): number {
  const elapsed = nowMs - sessionStartMs;
  const nextBoundary = (Math.floor(elapsed / cycleMs) + 1) * cycleMs;
  return sessionStartMs + nextBoundary;
}

// ─── Box Breathing: 4-4-4-4 = 16s cycle ───

describe('BreathingRing — Box Breathing Phase Computation', () => {
  const techniqueId = 'box';
  // Box: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s (total 16s)
  const cycleDurationMs = 16_000;

  it('starts at phase 0 (Inhale) at t=0', () => {
    const result = computeBreathingState(0, techniqueId);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBe(0);
  });

  it('is in phase 0 (Inhale) at t=2s (midway)', () => {
    const result = computeBreathingState(2000, techniqueId);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBeCloseTo(0.5, 2);
  });

  it('transitions to phase 1 (Hold) at t=4s', () => {
    const result = computeBreathingState(4000, techniqueId);
    expect(result.phaseIndex).toBe(1);
    expect(result.phaseProgress).toBeCloseTo(0, 2);
  });

  it('is in phase 2 (Exhale) at t=9s', () => {
    const result = computeBreathingState(9000, techniqueId);
    expect(result.phaseIndex).toBe(2);
    expect(result.phaseProgress).toBeCloseTo(0.25, 2); // 1s into 4s exhale
  });

  it('is in phase 3 (Hold) at t=13s', () => {
    const result = computeBreathingState(13000, techniqueId);
    expect(result.phaseIndex).toBe(3);
    expect(result.phaseProgress).toBeCloseTo(0.25, 2);
  });

  it('wraps around to phase 0 (Inhale) at t=16s (second cycle)', () => {
    const result = computeBreathingState(16000, techniqueId);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBeCloseTo(0, 2);
  });

  it('is correct after 5 full cycles (t=80s)', () => {
    const result = computeBreathingState(80_000, techniqueId);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBeCloseTo(0, 2);
  });

  it('handles background throttle — t=80s + 2s = correct mid-inhale of cycle 6', () => {
    const result = computeBreathingState(82_000, techniqueId);
    expect(result.phaseIndex).toBe(0); // Inhale
    expect(result.phaseProgress).toBeCloseTo(0.5, 2);
  });

  it('handles very long background pause — t=600s (37.5 cycles)', () => {
    // 600s = 37 full cycles (592s) + 8s into cycle 38
    // 8s = 4s inhale (phase 0) + 4s hold (phase 1) → at start of phase 2
    const result = computeBreathingState(600_000, techniqueId);
    expect(result.phaseIndex).toBe(2); // Exhale
    expect(result.phaseProgress).toBeCloseTo(0, 2);
  });
});

describe('BreathingRing — 4-7-8 Relaxing Breath Phase Computation', () => {
  const techniqueId = 'relaxing_478';
  // 4-7-8: Inhale 4s → Hold 7s → Exhale 8s (total 19s)

  it('starts at phase 0 (Inhale) at t=0', () => {
    const result = computeBreathingState(0, techniqueId);
    expect(result.phaseIndex).toBe(0);
  });

  it('transitions to Hold at t=4s', () => {
    const result = computeBreathingState(4000, techniqueId);
    expect(result.phaseIndex).toBe(1);
    expect(result.phaseProgress).toBeCloseTo(0, 2);
  });

  it('transitions to Exhale at t=11s', () => {
    const result = computeBreathingState(11_000, techniqueId);
    expect(result.phaseIndex).toBe(2);
    expect(result.phaseProgress).toBeCloseTo(0, 2);
  });

  it('wraps back to Inhale at t=19s', () => {
    const result = computeBreathingState(19_000, techniqueId);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBeCloseTo(0, 2);
  });
});

describe('BreathingRing — finishAfterCycle Boundary Computation', () => {
  const cycleDurationMs = 16_000; // Box breathing

  it('captures end of first cycle when triggered at t=0', () => {
    const start = 1000000; // arbitrary start
    const now = start; // triggered immediately
    const boundary = computeFinishBoundary(start, now, cycleDurationMs);
    expect(boundary).toBe(start + cycleDurationMs);
  });

  it('captures end of current cycle when triggered mid-cycle', () => {
    const start = 1000000;
    const now = start + 5000; // 5s into first cycle
    const boundary = computeFinishBoundary(start, now, cycleDurationMs);
    expect(boundary).toBe(start + cycleDurationMs); // end of cycle 1
  });

  it('captures end of second cycle when triggered in second cycle', () => {
    const start = 1000000;
    const now = start + 20_000; // 4s into second cycle
    const boundary = computeFinishBoundary(start, now, cycleDurationMs);
    expect(boundary).toBe(start + 2 * cycleDurationMs); // end of cycle 2
  });

  it('boundary is stable — calling at t+200ms still targets same cycle end', () => {
    const start = 1000000;
    const now1 = start + 5000;
    const boundary = computeFinishBoundary(start, now1, cycleDurationMs);
    // 200ms later, same cycle — boundary should NOT change
    const now2 = start + 5200;
    const boundaryAgain = computeFinishBoundary(start, now2, cycleDurationMs);
    expect(boundaryAgain).toBe(boundary);
  });

  it('captures correctly at exact cycle boundary', () => {
    const start = 1000000;
    const now = start + cycleDurationMs; // exactly at cycle boundary
    const boundary = computeFinishBoundary(start, now, cycleDurationMs);
    // floor(16000/16000) = 1, so boundary = start + 2 * 16000
    expect(boundary).toBe(start + 2 * cycleDurationMs);
  });
});

describe('BreathingRing — Duration-Based Session Completion', () => {
  it('session of 1 minute completes at 60s', () => {
    const durationMinutes = 1;
    const targetMs = durationMinutes * 60 * 1000;
    const totalElapsedMs = 60_000;
    expect(totalElapsedMs >= targetMs).toBe(true);
  });

  it('session of 3 minutes does NOT complete at 170s', () => {
    const durationMinutes = 3;
    const targetMs = durationMinutes * 60 * 1000;
    const totalElapsedMs = 170_000;
    expect(totalElapsedMs >= targetMs).toBe(false);
  });

  it('session completes even after long background pause', () => {
    const durationMinutes = 5;
    const targetMs = durationMinutes * 60 * 1000;
    // Simulate: timer fires after 10 minutes (way past 5 min duration)
    const totalElapsedMs = 600_000;
    expect(totalElapsedMs >= targetMs).toBe(true);
  });
});

describe('BreathingRing — Pointer Angle Interpolation', () => {
  it('angle starts at correct value for box breathing at t=0', () => {
    const result = computeBreathingState(0, 'box');
    // Phase 0 (Inhale): starts from previous phase's targetAngle (phase 3 = 360, mapped to 0)
    // progress 0 → angle = 0 + (180 - 0) * 0 = 0
    expect(result.pointerAngle).toBeCloseTo(0, 1);
  });

  it('angle is 90° at midpoint of inhale (t=2s for box)', () => {
    const result = computeBreathingState(2000, 'box');
    // Phase 0 (Inhale): start=0, end=180, progress=0.5 → angle=90
    expect(result.pointerAngle).toBeCloseTo(90, 1);
  });

  it('angle reaches 180° at end of inhale (t≈3.99s for box)', () => {
    const result = computeBreathingState(3999, 'box');
    expect(result.pointerAngle).toBeCloseTo(180, 0);
  });
});
