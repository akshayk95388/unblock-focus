export type BreathPhaseType = "inhale" | "exhale" | "hold" | "quick-inhale";

export interface BreathPhase {
  type: BreathPhaseType;
  durationSeconds?: number;
  instruction: string;
  pan?: number;
  pitch?: "normal" | "high";
  targetAngle: number;
  isExpanded: boolean;
}

export interface BreathingSpeed {
  id: string;
  name: string;
  phases: BreathPhase[];
}

export const BREATHING_TECHNIQUES: Record<string, BreathingSpeed> = {
  box: {
    id: "box",
    name: "Box",
    phases: [
      { type: "inhale", durationSeconds: 4, instruction: "Inhale", targetAngle: 180, isExpanded: true },
      { type: "hold", durationSeconds: 4, instruction: "Hold", targetAngle: 180, isExpanded: true },
      { type: "exhale", durationSeconds: 4, instruction: "Exhale", targetAngle: 360, isExpanded: false },
      { type: "hold", durationSeconds: 4, instruction: "Hold", targetAngle: 360, isExpanded: false },
    ]
  },
  physiological_sigh: {
    id: "physiological_sigh",
    name: "Physiological Sigh",
    phases: [
      { type: "inhale", durationSeconds: 3, instruction: "Deep Inhale", targetAngle: 150, isExpanded: true },
      { type: "quick-inhale", durationSeconds: 1, instruction: "Quick Inhale", pitch: "high", targetAngle: 180, isExpanded: true },
      { type: "exhale", durationSeconds: 6, instruction: "Long Exhale", targetAngle: 360, isExpanded: false },
    ]
  },
  relaxing_478: {
    id: "relaxing_478",
    name: "4-7-8 Relax",
    phases: [
      { type: "inhale", durationSeconds: 4, instruction: "Inhale", targetAngle: 180, isExpanded: true },
      { type: "hold", durationSeconds: 7, instruction: "Hold", targetAngle: 180, isExpanded: true },
      { type: "exhale", durationSeconds: 8, instruction: "Exhale", targetAngle: 360, isExpanded: false },
    ]
  },
  alternate_nostril: {
    id: "alternate_nostril",
    name: "Alternate Nostril",
    phases: [
      { type: "inhale", durationSeconds: 4, instruction: "Inhale Left", pan: -1, targetAngle: 180, isExpanded: true },
      { type: "hold", durationSeconds: 4, instruction: "Hold", pan: 0, targetAngle: 180, isExpanded: true },
      { type: "exhale", durationSeconds: 4, instruction: "Exhale Right", pan: 1, targetAngle: 360, isExpanded: false },
      { type: "inhale", durationSeconds: 4, instruction: "Inhale Right", pan: 1, targetAngle: 180, isExpanded: true },
      { type: "hold", durationSeconds: 4, instruction: "Hold", pan: 0, targetAngle: 180, isExpanded: true },
      { type: "exhale", durationSeconds: 4, instruction: "Exhale Left", pan: -1, targetAngle: 360, isExpanded: false },
    ]
  },
  wim_hof: {
    id: "wim_hof",
    name: "Wim Hof",
    phases: [
      ...Array.from({ length: 30 }).flatMap((_, i) => [
        { type: "inhale" as const, durationSeconds: 1.5, instruction: "Inhale", targetAngle: 180, isExpanded: true },
        { type: "exhale" as const, durationSeconds: 1.5, instruction: "Exhale", targetAngle: 360, isExpanded: false },
      ]),
      { type: "hold", durationSeconds: 60, instruction: "Hold", targetAngle: 360, isExpanded: false },
      { type: "inhale" as const, durationSeconds: 15, instruction: "Recovery Inhale", targetAngle: 180, isExpanded: true },
      { type: "exhale" as const, durationSeconds: 2, instruction: "Exhale", targetAngle: 360, isExpanded: false },
      { type: "hold" as const, durationSeconds: 10, instruction: "Rest", targetAngle: 360, isExpanded: false },
    ]
  }
};
