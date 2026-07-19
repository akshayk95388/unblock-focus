"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStreak } from "@/lib/queries";
import { useAuth } from "@/components/AuthProvider";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isPro } from "@/lib/plans";
import Skeleton from "@/components/ui/Skeleton";
import PreferencesModal from "@/components/Dashboard/PreferencesModal";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  zenMode?: boolean;
  rightSidebar?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  activeTab = "dashboard",
  onTabChange,
  zenMode = false,
  rightSidebar,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { streak } = useStreak();
  const { planType, credits, loading: planLoading } = useUserPlan();
  const userIsPro = isPro(planType);

  // Helper to check if it's a default Google letter avatar
  const isDefaultGoogleAvatar = (url?: string) => {
    if (!url) return true;
    if (url.includes("googleusercontent.com")) {
      return url.includes("/a/") && !url.includes("/a-/");
    }
    return false;
  };

  const rawName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Account";
  const firstName = rawName.trim().split(/\s+/)[0];
  const userInitial = firstName.charAt(0).toUpperCase();

  // Ref wrapping the profile trigger + dropdown — clicks inside it do NOT close the menu
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu when clicking anywhere outside the profile section
  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  const navItems = [
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "goals", label: "Goals", icon: "check-circle" },
    { id: "history", label: "History", icon: "clock" },
  ];

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-background text-on-surface">
      {/* ===== Top Nav (Mobile Only) ===== */}
      <header
        className={`fixed top-0 left-0 right-0 h-16 bg-surface-container-low z-30 flex justify-between items-center px-6 md:hidden transition-all duration-500 ease-in-out ${
          zenMode ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            className="text-on-surface-variant"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-xl font-bold tracking-tighter text-primary-container">
            Unblock
          </span>
        </div>

        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full">
              <span className="text-primary-container text-sm">🔥</span>
              <span className="text-xs font-bold text-on-surface">
                {streak}-Day Streak
              </span>
            </div>
          )}
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-outline-variant/10">
            {!user?.user_metadata?.avatar_url || isDefaultGoogleAvatar(user.user_metadata.avatar_url) ? (
              <div className="w-full h-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-xs font-black text-on-primary-container uppercase shadow-inner">
                {userInitial}
              </div>
            ) : (
              <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      </header>

      {/* ===== Sidebar (Full height on desktop) ===== */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-surface-container-low flex flex-col z-20 overflow-hidden transition-all duration-500 ease-in-out border-outline-variant/5 ${
          zenMode
            ? "-translate-x-full opacity-0 pointer-events-none w-0 !p-0 border-none"
            : sidebarOpen
            ? "w-64 translate-x-0 py-8 px-4 border-r"
            : "w-64 -translate-x-full md:translate-x-0 py-8 px-4 border-r"
        }`}
      >
        <div className="mb-4 px-4">
          <h2 className="text-xl font-bold tracking-tighter text-primary-container">
            Unblock
          </h2>
          <p className="text-on-surface-variant text-xs font-medium opacity-70 mt-1">
            Clear your head. Get to work.
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id || (item.id === "dashboard" && activeTab === "meditation");
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSidebarOpen(false);
                  onTabChange?.(item.id);
                }}
                className={`flex items-center w-full text-left gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98] ${
                  isActive
                    ? "text-on-surface bg-surface-container-highest"
                    : "text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface"
                }`}
              >
                {item.icon === "home" && (
                  <svg className={`w-5 h-5 ${isActive ? "text-primary-container" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                )}
                {item.icon === "check-circle" && (
                  <svg className={`w-5 h-5 ${isActive ? "text-primary-container" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {item.icon === "clock" && (
                  <svg className={`w-5 h-5 ${isActive ? "text-primary-container" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Upgrade Banner (free users only, with skeleton loading placeholder) */}
        {planLoading ? (
          <div className="px-3 mt-6">
            <div className="bg-surface-container-low/50 border border-outline-variant/10 rounded-xl p-4 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3.5 w-20 mt-1" />
            </div>
          </div>
        ) : (
          !userIsPro && (
            <div className="px-3 mt-6">
              <a
                href="/api/checkout?plan=pro_monthly"
                className="block bg-gradient-to-br from-primary/8 to-primary-container/5 border border-primary/10 rounded-xl p-4 hover:border-primary/25 transition-all group"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-container mb-1">
                  Unlock Unlimited
                </p>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                  Get Pro for unlimited sessions, all durations, and advanced breathing.
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold text-primary group-hover:text-primary-container transition-colors">
                  Upgrade to Pro →
                </span>
              </a>
            </div>
          )
        )}

        {/* Desktop Footer (Streak + Profile) */}
        <div ref={profileMenuRef} className="mt-auto pt-6 border-t border-outline-variant/10 relative">

          {/* Profile Dropdown Menu */}
          {profileMenuOpen && (
            <div className="absolute bottom-16 left-2 right-2 bg-surface-container-high border border-outline-variant/10 rounded-2xl p-2 shadow-lg z-50 flex flex-col gap-1">
              {/* Plan & Credits Info */}
              <div className="px-3 py-2 border-b border-outline-variant/10 mb-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                    Plan
                  </span>
                  {planLoading ? (
                    <Skeleton className="h-4 w-10" rounded="full" />
                  ) : (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      userIsPro
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}>
                      {userIsPro ? "Pro" : "Free"}
                    </span>
                  )}
                </div>
                {planLoading ? (
                  <Skeleton className="h-3 w-32 mt-2" />
                ) : (
                  <p className="text-[10px] text-on-surface-variant/50 mt-1">
                    {userIsPro
                      ? `${credits} resets remaining this month`
                      : `${credits} free resets remaining`}
                  </p>
                )}
              </div>

              {/* Manage Billing (Pro users) */}
              {userIsPro && (
                <a
                  href="https://polar.sh/unblockfocus/portal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-highest/50 rounded-xl transition-all text-xs font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                  </svg>
                  Manage billing
                </a>
              )}

              {/* Upgrade (Free users) */}
              {!userIsPro && (
                <a
                  href="/api/checkout?plan=pro_monthly"
                  className="w-full flex items-center gap-2 px-3 py-2 text-primary hover:text-primary-container hover:bg-primary/5 rounded-xl transition-all text-xs font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  Upgrade to Pro
                </a>
              )}

              {/* Preferences (All users) */}
              <button
                onClick={() => {
                  setPreferencesOpen(true);
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-highest/50 rounded-xl transition-all text-xs font-semibold cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Preferences
              </button>

              <button
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-highest/50 rounded-xl transition-all text-xs font-semibold"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                Sign out
              </button>
            </div>
          )}

          {/* Profile Button — ChatGPT/Claude style: single clean row, no chevron */}
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all text-left ${
              profileMenuOpen
                ? "bg-surface-container-high"
                : "hover:bg-surface-container-high"
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-outline-variant/10">
              {!user?.user_metadata?.avatar_url || isDefaultGoogleAvatar(user.user_metadata.avatar_url) ? (
                <div className="w-full h-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-xs font-black text-on-primary-container uppercase">
                  {userInitial}
                </div>
              ) : (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
                {firstName}
              </span>
              {planLoading ? (
                <Skeleton className="h-2.5 w-16 mt-0.5" />
              ) : (
                <span className={`text-[9px] truncate ${
                  userIsPro ? "text-primary/60" : "text-on-surface-variant/50"
                }`}>
                  {userIsPro ? "Pro" : `${credits} resets left`}
                </span>
              )}
            </div>
          </button>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main
        className={`flex-1 overflow-y-auto transition-all duration-500 ease-in-out ${
          zenMode ? "pt-0" : "pt-16 md:pt-0"
        }`}
      >
        {children}
      </main>

      {/* ===== Right Sidebar (Desktop Only) ===== */}
      {rightSidebar && (
        <aside
          className={`hidden lg:flex bg-surface-container-lowest border-l border-outline-variant/5 flex-col transition-all duration-500 ease-in-out overflow-hidden ${
            zenMode
              ? "w-0 !p-0 border-none opacity-0 pointer-events-none"
              : "w-80 p-8 opacity-100"
          } gap-10`}
        >
          {rightSidebar}
        </aside>
      )}
      {/* Preferences Modal Overlay */}
      <PreferencesModal
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </div>
  );
}
