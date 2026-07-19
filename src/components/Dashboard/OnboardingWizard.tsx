"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { seedCustomHabits } from "@/lib/habits";
import { refreshQueryCaches } from "@/lib/queries";
import { track } from "@/lib/mixpanel";
import { useAuth } from "@/components/AuthProvider";
import { useUserPlan } from "@/hooks/useUserPlan";
import CustomSelect from "@/components/ui/CustomSelect";

interface OnboardingWizardProps {
  onComplete: () => void;
}

interface GoalOption {
  name: string;
  emoji: string;
  color: string;
  daily_goal_minutes: number;
}

const PRESET_STRUGGLES = [
  { id: "distraction", label: "Distractions", desc: "Phones, tabs, and notifications constantly pull me away.", emoji: "🧠" },
  { id: "procrastination", label: "Procrastination", desc: "Avoiding tasks, putting off work, and struggling to start.", emoji: "⏳" },
  { id: "overwhelm", label: "Overwhelm", desc: "Having too much work, deadlines, and running out of time.", emoji: "🌊" },
  { id: "self-doubt", label: "Self-Doubt", desc: "Anxiety, self-criticism, and constant fear of failure.", emoji: "💭" },
  { id: "routine", label: "Consistency", desc: "Breaking daily streaks, starting over constantly, and struggling to build momentum.", emoji: "📈" },
];

const PRESET_GOALS: GoalOption[] = [
  { name: "Coding", emoji: "💻", color: "primary", daily_goal_minutes: 60 },
  { name: "Writing", emoji: "✍️", color: "secondary", daily_goal_minutes: 30 },
  { name: "Studying", emoji: "📚", color: "tertiary", daily_goal_minutes: 45 },
  { name: "Designing", emoji: "🎨", color: "primary", daily_goal_minutes: 60 },
  { name: "Mindfulness", emoji: "🧘", color: "secondary", daily_goal_minutes: 15 },
  { name: "Fitness", emoji: "🏃", color: "tertiary", daily_goal_minutes: 45 },
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const { refetch: refetchPlan } = useUserPlan();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [selectedStruggles, setSelectedStruggles] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<GoalOption[]>([]);
  const [customGoalName, setCustomGoalName] = useState("");
  const [customGoalEmoji, setCustomGoalEmoji] = useState("🔥");
  const [customGoalDuration, setCustomGoalDuration] = useState(30);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hasInitializedName, setHasInitializedName] = useState(false);

  // Autofill name from Google sign-in (extract first name for a friendly tone)
  useEffect(() => {
    if (user && !hasInitializedName) {
      const googleFirstName = user.user_metadata?.given_name || 
                              user.user_metadata?.full_name?.split(" ")[0] || 
                              user.user_metadata?.name?.split(" ")[0] || 
                              "";
      setName(googleFirstName);
      setHasInitializedName(true);
    }
  }, [user, hasInitializedName]);

  // Handle profile details and advance to struggles step
  const handleNextAfterProfile = () => {
    if (!role.trim() || !name.trim()) return;
    track("onboarding_profile_entered", { 
      role: role.trim() 
    });
    setStep(2);
  };

  // Toggle struggles selection
  const handleToggleStruggle = (id: string) => {
    setSelectedStruggles((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle preset goals selection
  const handleToggleGoal = (goal: GoalOption) => {
    setSelectedGoals((prev) => {
      const exists = prev.some((g) => g.name.toLowerCase() === goal.name.toLowerCase());
      if (exists) {
        return prev.filter((g) => g.name.toLowerCase() !== goal.name.toLowerCase());
      } else {
        return [...prev, goal];
      }
    });
  };

  // Handle adding custom goal
  const handleAddCustomGoal = () => {
    if (!customGoalName.trim()) return;
    const newGoal: GoalOption = {
      name: customGoalName.trim(),
      emoji: customGoalEmoji,
      color: "primary",
      daily_goal_minutes: customGoalDuration,
    };
    setSelectedGoals((prev) => [...prev, newGoal]);
    setCustomGoalName("");
    setCustomGoalEmoji("🔥");
    setCustomGoalDuration(30);
    setShowCustomForm(false);
  };

  // Finish onboarding flow
  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // 1. Seed custom selected habits to database
      if (selectedGoals.length > 0) {
        await seedCustomHabits(selectedGoals);
      } else {
        // Fallback defaults if they unselected everything
        await seedCustomHabits([PRESET_GOALS[0]]);
      }

      // 2. Set Supabase Auth Metadata flag + chosen role + name
      const { error } = await supabase.auth.updateUser({
        data: { 
          onboarding_completed: true,
          role: role.trim(),
          full_name: name.trim()
        }
      });

      if (error) {
        console.error("Error setting onboarding metadata:", error.message);
      }

      // Sync display name and struggles to profiles table
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: name.trim(),
            preferences: {
              role: role.trim(),
              struggles: selectedStruggles,
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString()
            }
          })
          .eq("id", user.id);

        if (profileError) {
          console.error("Error setting public profile metadata:", profileError.message);
        }
      }

      // 3. Track events in Mixpanel
      track("onboarding_completed", {
        role: role.trim(),
        struggles_selected: selectedStruggles,
        goals_count: selectedGoals.length,
      });

      // 4. Update data caches
      refreshQueryCaches();
      await refetchPlan();

      // 5. Complete wizard
      onComplete();
    } catch (err) {
      console.error("Error finishing onboarding:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    track("onboarding_step_completed", {
      step_number: step,
      role: role.trim(),
      selected_struggles: selectedStruggles,
      selected_goals_count: selectedGoals.length,
    });
    setStep((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      {/* Obsidian Amber inner glow background card */}
      <div className="relative max-w-xl w-full bg-surface-container-low/95 border border-outline-variant/15 p-8 rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between min-h-[580px] animate-in zoom-in-95 duration-200">
        
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none rounded-3xl" />
        
        {/* Top Header */}
        <div className="relative z-10 w-full">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4 mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Unblock Focus — Onboarding
            </span>
            <span className="text-xs font-mono font-bold text-on-surface-variant">
              Step {step} of 4
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          
          {/* STEP 1: Name & Professional Role */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-300">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-on-surface">
                  Welcome to Unblock
                </h2>
                <p className="text-on-surface-variant text-sm">
                  Let&apos;s personalize your dashboard workspace before getting started:
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    What should I call you? (First Name)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your first name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-container-highest px-5 py-4 rounded-xl text-base focus:outline-none focus:ring-1 focus:ring-primary/50 border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/30"
                    autoFocus={!name}
                  />
                </div>

                {/* Role Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    What best describes your work?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Developer, Founder, Writer, Student..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-surface-container-highest px-5 py-4 rounded-xl text-base focus:outline-none focus:ring-1 focus:ring-primary/50 border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/30"
                    autoFocus={!!name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && role.trim() && name.trim()) {
                        handleNextAfterProfile();
                      }
                    }}
                  />
                </div>

                <p className="text-xs text-on-surface-variant/50 leading-relaxed italic">
                  Tip: This helps us customize your focus task suggestions and recommended goals.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Struggles & Intention */}
          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-3 duration-300">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-on-surface">
                  Your focus challenge
                </h2>
                <p className="text-on-surface-variant text-sm">
                  What is your main struggle when trying to get to work, {name}?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {PRESET_STRUGGLES.map((struggle) => {
                  const isSelected = selectedStruggles.includes(struggle.id);
                  return (
                    <button
                      key={struggle.id}
                      onClick={() => handleToggleStruggle(struggle.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 cursor-pointer hover:bg-surface-container-highest/40 ${
                        isSelected
                          ? "bg-primary-container/10 border-primary/45 shadow-[0_0_15px_rgba(255,130,60,0.05)]"
                          : "bg-surface-container-highest/20 border-outline-variant/15"
                      }`}
                    >
                      <span className="text-xl pt-0.5">{struggle.emoji}</span>
                      <div className="space-y-0.5">
                        <p className={`text-sm font-bold ${isSelected ? "text-primary" : "text-on-surface"}`}>
                          {struggle.label}
                        </p>
                        <p className="text-[11px] text-on-surface-variant/70 leading-normal">
                          {struggle.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Choose Focus Goals */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-300">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-on-surface">
                  Set your focus goals
                </h2>
                <p className="text-on-surface-variant text-sm">
                  Select the goals you want to track focus sessions under, or add your own:
                </p>
              </div>

              {/* Goal Pills Grid */}
              <div className="flex flex-wrap gap-2 pt-2">
                {PRESET_GOALS.map((goal) => {
                  const isSelected = selectedGoals.some((g) => g.name.toLowerCase() === goal.name.toLowerCase());
                  return (
                    <button
                      key={goal.name}
                      onClick={() => handleToggleGoal(goal)}
                      className={`px-4.5 py-3 rounded-full border text-sm font-bold flex items-center gap-2 transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? "bg-primary text-on-primary border-primary shadow-[0_0_15px_rgba(255,130,60,0.15)] scale-[1.03]"
                          : "bg-surface-container-highest/20 text-on-surface border-outline-variant/15 hover:bg-surface-container-highest/40"
                      }`}
                    >
                      <span>{goal.emoji}</span>
                      <span>{goal.name}</span>
                    </button>
                  );
                })}
                
                {/* Custom Goal Pills rendering */}
                {selectedGoals
                  .filter((g) => !PRESET_GOALS.some((p) => p.name.toLowerCase() === g.name.toLowerCase()))
                  .map((goal) => (
                    <button
                      key={goal.name}
                      onClick={() => handleToggleGoal(goal)}
                      className="px-4.5 py-3 rounded-full border text-sm font-bold flex items-center gap-2 transition-all duration-300 bg-primary text-on-primary border-primary shadow-[0_0_15px_rgba(255,130,60,0.15)] scale-[1.03]"
                    >
                      <span>{goal.emoji}</span>
                      <span>{goal.name}</span>
                    </button>
                  ))}
              </div>

              {/* Inline Custom Goal Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="text-xs font-bold text-primary hover:text-primary-container transition-colors flex items-center gap-1 cursor-pointer"
                >
                  + Add custom goal
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: The Method Tour */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-300">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-on-surface">
                  How Unblock Works
                </h2>
                <p className="text-on-surface-variant text-sm">
                  A simple routine to help you clear your head and get to work:
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-4 items-start p-3 bg-surface-container-highest/10 rounded-2xl border border-outline-variant/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">1</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-on-surface">Clear mental blocks (Reset)</p>
                    <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                      When you feel stuck, anxious, or unmotivated, start a Guided Reset to clear your head.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-3 bg-surface-container-highest/10 rounded-2xl border border-outline-variant/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-on-surface">Get to work (Focus)</p>
                    <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                      Once your head is clear, start a focus session to dive straight into your work.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-3 bg-surface-container-highest/10 rounded-2xl border border-outline-variant/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">3</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-on-surface">Track your progress (Habits)</p>
                    <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                      Your focus time is automatically saved to help you build habits and stay consistent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="relative z-10 w-full border-t border-outline-variant/10 pt-6 mt-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {step > 1 && (
              <button
                disabled={isSubmitting}
                onClick={() => setStep((prev) => prev - 1)}
                className="px-5 py-3 rounded-xl text-sm font-bold text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 4 ? (
              <button
                onClick={step === 1 ? handleNextAfterProfile : handleNextStep}
                disabled={
                  (step === 1 && (!role.trim() || !name.trim())) ||
                  (step === 2 && selectedStruggles.length === 0)
                }
                className="glow-button px-8 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleFinishOnboarding}
                disabled={isSubmitting}
                className="glow-button px-8 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-on-primary-fixed" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting up...
                  </span>
                ) : (
                  <>⚡ Get Started</>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Pop-up dialog overlay for adding a custom goal */}
      {showCustomForm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-sm w-full bg-surface-container-low border border-outline-variant/15 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
              <h3 className="text-sm font-bold text-on-surface">Add Custom Goal</h3>
              <button
                onClick={() => setShowCustomForm(false)}
                className="text-on-surface-variant/70 hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Goal Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. Coding, Writing, Studying, Planning, Fitness..."
                  value={customGoalName}
                  onChange={(e) => setCustomGoalName(e.target.value)}
                  className="w-full bg-surface-container-highest px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/30"
                  autoFocus
                />
              </div>

              {/* Emoji Icon picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Emoji Icon</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    maxLength={2}
                    value={customGoalEmoji}
                    onChange={(e) => setCustomGoalEmoji(e.target.value)}
                    className="w-12 bg-surface-container-highest text-center font-bold text-lg rounded-xl py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 border border-outline-variant/15 shrink-0"
                  />
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {["💻", "✍️", "📚", "🧘", "🏃", "🎨", "🎯", "🔥"].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setCustomGoalEmoji(em)}
                        className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-sm hover:bg-surface-container-highest/80 transition-all cursor-pointer ${
                          customGoalEmoji === em
                            ? "bg-primary-container/20 ring-1 ring-primary-container scale-105"
                            : "bg-surface-container-highest/40"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Daily Goal minutes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Daily Goal (minutes)</label>
                <CustomSelect
                  size="sm"
                  value={customGoalDuration}
                  onChange={(val) => setCustomGoalDuration(Number(val))}
                  options={[
                    { value: 15, label: "15 mins" },
                    { value: 30, label: "30 mins" },
                    { value: 45, label: "45 mins" },
                    { value: 60, label: "60 mins" },
                    { value: 120, label: "120 mins" },
                  ]}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/10">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomGoal}
                disabled={!customGoalName.trim()}
                className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Add Goal
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
