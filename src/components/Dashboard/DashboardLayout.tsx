"use client";

import { useState, useEffect }  from "react";
import { getStreak } from "@/lib/sessions";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
    onAddHabit?: () => void;
}

export default function DashboardLayout({
  children,
  activeTab = "dashboard",
  onTabChange,
  onAddHabit,
}: DashboardLayoutProps) {
  const [streak, setStreak] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreak(getStreak());
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "habits", label: "Habits", icon: "check-circle" },
    { id: "history", label: "History", icon: "clock" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* ===== Top Nav ===== */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-low z-30 flex justify-between items-center px-6 md:px-12">
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-on-surface-variant"
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

        <div className="flex items-center gap-4 md:gap-6">
          {streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full">
              <span className="text-primary-container text-sm">🔥</span>
              <span className="text-xs font-bold text-on-surface">
                {streak} Day Streak
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

      <div className="flex flex-1 mt-16">
        {/* ===== Sidebar ===== */}
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-surface-container-low flex flex-col gap-6 py-8 px-4 z-20 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="mb-4 px-4">
            <h2 className="text-on-surface font-bold text-lg tracking-tight">
              Deep Focus
            </h2>
            <p className="text-on-surface-variant text-xs font-medium opacity-70">
              Your sanctuary
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSidebarOpen(false);
                  onTabChange?.(item.id);
                }}
                className={`flex items-center w-full text-left gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98] ${
                  activeTab === item.id
                    ? "text-on-surface bg-surface-container-highest"
                    : "text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface"
                }`}
              >
                {item.icon === "grid" && (
                  <svg className={`w-5 h-5 ${activeTab === item.id ? "text-primary-container" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                  </svg>
                )}
                {item.icon === "check-circle" && (
                  <svg className={`w-5 h-5 ${activeTab === item.id ? "text-primary-container" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {item.icon === "clock" && (
                  <svg className={`w-5 h-5 ${activeTab === item.id ? "text-primary-container" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto px-4">
            <button
              onClick={() => {
                setSidebarOpen(false);
                onAddHabit?.();
              }}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50 transition-all active:scale-95 flex items-center justify-center gap-2 border border-outline-variant/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Habit
            </button>
          </div>
        </aside>

        {/* ===== Main Content ===== */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
