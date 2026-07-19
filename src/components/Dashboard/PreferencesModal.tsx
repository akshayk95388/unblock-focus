"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useUserPlan } from "@/hooks/useUserPlan";
import { track } from "@/lib/mixpanel";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_STRUGGLES = [
  { id: "distraction", label: "Distractions", desc: "Phones, tabs, and notifications constantly pull me away.", emoji: "🧠" },
  { id: "procrastination", label: "Procrastination", desc: "Avoiding tasks, putting off work, and struggling to start.", emoji: "⏳" },
  { id: "overwhelm", label: "Overwhelm", desc: "Having too much work, deadlines, and running out of time.", emoji: "🌊" },
  { id: "self-doubt", label: "Self-Doubt", desc: "Anxiety, self-criticism, and constant fear of failure.", emoji: "💭" },
  { id: "routine", label: "Consistency", desc: "Breaking daily streaks, starting over constantly, and struggling to build momentum.", emoji: "📈" },
];

export default function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { user } = useAuth();
  const { preferences, refetch: refetchPlan } = useUserPlan();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [selectedStruggles, setSelectedStruggles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form states when modal opens or preferences load
  useEffect(() => {
    if (isOpen && user) {
      setName(user.user_metadata?.full_name || "");
      setRole(preferences?.role || user.user_metadata?.role || "");
      setSelectedStruggles(preferences?.struggles || []);
    }
  }, [isOpen, user, preferences]);

  if (!isOpen) return null;

  const handleToggleStruggle = (id: string) => {
    setSelectedStruggles((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !role.trim() || selectedStruggles.length === 0) return;
    setIsSaving(true);

    try {
      const supabase = createClient();

      // 1. Update Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          role: role.trim()
        }
      });
      if (authError) throw authError;

      // 2. Update profiles table display_name and preferences JSONB
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: name.trim(),
            preferences: {
              ...preferences,
              role: role.trim(),
              struggles: selectedStruggles
            }
          })
          .eq("id", user.id);
        if (profileError) throw profileError;
      }

      // 3. Track telemetry in Mixpanel
      track("preferences_updated", {
        role: role.trim(),
        struggles_selected: selectedStruggles
      });

      // 4. Refetch local user plan/preference cache so dashboard updates instantly
      await refetchPlan();

      // 5. Close modal
      onClose();
    } catch (err) {
      console.error("Error saving preferences:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative max-w-md w-full bg-surface-container-low border border-outline-variant/15 rounded-3xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none rounded-3xl" />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-outline-variant/10 pb-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-on-surface">Preferences</h3>
              <p className="text-xs text-on-surface-variant/70">Customize your focus workspace and challenges.</p>
            </div>
            <button
              onClick={onClose}
              className="text-on-surface-variant/50 hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Name (First Name)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your first name..."
                className="w-full bg-surface-container-highest px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/30"
              />
            </div>

            {/* Role Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                What best describes your work?
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Developer, Founder, Writer, Student..."
                className="w-full bg-surface-container-highest px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/30"
              />
            </div>

            {/* Struggles List */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Focus Challenges (Select all that apply)
              </label>
              <div className="flex flex-col gap-2.5">
                {PRESET_STRUGGLES.map((struggle) => {
                  const isSelected = selectedStruggles.includes(struggle.id);
                  return (
                    <button
                      key={struggle.id}
                      onClick={() => handleToggleStruggle(struggle.id)}
                      className={`text-left p-3 rounded-xl border transition-all duration-300 flex items-start gap-3 cursor-pointer hover:bg-surface-container-highest/40 ${
                        isSelected
                          ? "bg-primary-container/10 border-primary/45 shadow-[0_0_10px_rgba(255,130,60,0.02)]"
                          : "bg-surface-container-highest/20 border-outline-variant/15"
                      }`}
                    >
                      <span className="text-lg pt-0.5">{struggle.emoji}</span>
                      <div className="space-y-0.5">
                        <p className={`text-xs font-bold ${isSelected ? "text-primary" : "text-on-surface"}`}>
                          {struggle.label}
                        </p>
                        <p className="text-[10px] text-on-surface-variant/70 leading-normal">
                          {struggle.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-outline-variant/10">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || !role.trim() || selectedStruggles.length === 0}
              className="glow-button px-6 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-on-primary-fixed" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
