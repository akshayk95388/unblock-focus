"use client";

import { useState, useEffect } from "react";
import { getStreak } from "@/lib/sessions";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onAddHabit?: () => void;
  zenMode?: boolean;
}

export default function DashboardLayout({
  children,
  activeTab = "dashboard",
  onTabChange,
  onAddHabit,
  zenMode = false,
}: DashboardLayoutProps) {
  const [streak, setStreak] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreak(getStreak());
  }, []);

  const navItems = [
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "goals", label: "Goals", icon: "check-circle" },
    { id: "history", label: "History", icon: "clock" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-on-surface">
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
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
            <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
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

        {/* Quick Relief Section */}
        <div className="mt-auto pt-6">
          <div className="px-4 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-container">
              Quick Relief
            </p>
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-0.5">
              Instant calm. Works offline.
            </p>
          </div>
          <button
            onClick={() => {
              setSidebarOpen(false);
              onTabChange?.("breathing");
            }}
            className={`flex items-center w-full text-left gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98] border border-outline-variant/10 ${
              activeTab === "breathing"
                ? "text-on-surface bg-surface-container-highest"
                : "text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface"
            }`}
          >
            <svg
              className={`w-5 h-5 ${activeTab === "breathing" ? "text-primary-container" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="9" />
              <circle
                cx="12"
                cy="12"
                r="5"
                className="animate-pulse origin-center"
                style={{ animationDuration: "4s" }}
              />
            </svg>
            <span className="text-sm font-medium">Breathing Exercise</span>
          </button>
        </div>

        {/* Desktop Footer (Streak + Profile) */}
        <div className="pt-6 border-t border-outline-variant/10 flex flex-col gap-4">
          {/* User profile + Streak footer row */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/10">
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Account
              </span>
            </div>

            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container-high rounded-full border border-outline-variant/5">
                <span className="text-xs">🔥</span>
                <span className="text-[10px] font-bold text-on-surface font-mono">
                  {streak}d
                </span>
              </div>
            )}
          </div>
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
    </div>
  );
}
