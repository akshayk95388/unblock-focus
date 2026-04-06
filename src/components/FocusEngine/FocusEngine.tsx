"use client";

import { useState, useCallback } from "react";
import { saveSession } from "@/lib/sessions";
import Breathing from "./Breathing";
import Intent from "./Intent";
import Timer from "./Timer";
import Success from "./Success";

export type FocusStage = "breathing" | "intent" | "timer" | "success";

interface FocusEngineProps {
  onExit: () => void;
  directMode?: {
    intentText: string;
    durationSeconds: number;
    habitId?: string;
  };
}

export default function FocusEngine({ onExit, directMode }: FocusEngineProps) {
  const [stage, setStage] = useState<FocusStage>(
    directMode ? "timer" : "breathing"
  );
  const [intentText, setIntentText] = useState(directMode?.intentText ?? "");
  const [habitId, setHabitId] = useState<string | undefined>(directMode?.habitId);
  const [timerDuration, setTimerDuration] = useState(
    directMode?.durationSeconds ?? 300
  );
  const [completedSeconds, setCompletedSeconds] = useState(0);

  const handleBreathingComplete = useCallback(() => {
    setStage("intent");
  }, []);

  const handleIntentSubmit = useCallback(
    (text: string, selectedHabitId?: string) => {
      setIntentText(text);
      setHabitId(selectedHabitId);
      setTimerDuration(300); // 5 minutes
      setStage("timer");
    },
    []
  );

  const handleTimerComplete = useCallback((actualSeconds: number) => {
    setCompletedSeconds(actualSeconds);
    setStage("success");
  }, []);

  const handleTimerQuit = useCallback((elapsedSeconds: number) => {
    if (elapsedSeconds > 0) {
      saveSession(intentText, elapsedSeconds, habitId, true);
    }
    onExit();
  }, [intentText, habitId, onExit]);

  const handleContinue = useCallback(() => {
    setTimerDuration(1200); // 20 more minutes
    setStage("timer");
  }, []);

  switch (stage) {
    case "breathing":
      return <Breathing onComplete={handleBreathingComplete} />;

    case "intent":
      return <Intent onSubmit={handleIntentSubmit} />;

    case "timer":
      return (
        <Timer
          intentText={intentText}
          durationSeconds={timerDuration}
          onComplete={handleTimerComplete}
          onQuit={handleTimerQuit}
        />
      );

    case "success":
      return (
        <Success
          intentText={intentText}
          habitId={habitId}
          completedSeconds={completedSeconds}
          onContinue={handleContinue}
          onDone={onExit}
        />
      );

    default:
      return null;
  }
}
