"use client";

import { useMemo, useState, useEffect } from "react";
import { getSessions, getSessionsByHabit } from "@/lib/sessions";
import { getHabits, type Habit } from "@/lib/habits";

interface ActivityHeatmapProps {
  year?: number;
}

export default function ActivityHeatmap({ year = new Date().getFullYear() }: ActivityHeatmapProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    align: "center" | "right";
    visible: boolean;
  }>({ text: "", x: 0, y: 0, align: "center", visible: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  const habits: Habit[] = useMemo(() => {
    if (!mounted) return [];
    return getHabits();
  }, [mounted]);

  const data = useMemo(() => {
    if (!mounted) return { grid: [], totalDays: 0, totalMinutes: 0 };

    // Get correct sessions based on filter
    const sessions = selectedHabitId
      ? getSessionsByHabit(selectedHabitId)
      : getSessions();

    // Build date → {minutes, count} map
    const dateMap: Record<string, {minutes: number; count: number}> = {};
    sessions.forEach((s) => {
      const dateKey = s.completedAt.split("T")[0]; // YYYY-MM-DD
      const mins = Math.round(s.durationSeconds / 60);
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { minutes: 0, count: 0 };
      }
      dateMap[dateKey].minutes += mins;
      dateMap[dateKey].count += 1;
    });

    // IMPORTANT: Build grid for the specific calendar year (Jan 1 to Dec 31)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Start on Jan 1st of target year
    const startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    // Align to Sunday before Jan 1st
    const startDow = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDow);

    // End on Dec 31st of target year
    const endDate = new Date(year, 11, 31);
    endDate.setHours(0, 0, 0, 0);
    // Align to Saturday after Dec 31st
    const endDow = endDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - endDow));

    // Generate all days from startDate through endDate
    const grid: { date: string; minutes: number; count: number; level: number; dayOfWeek: number }[][] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const week: { date: string; minutes: number; count: number; level: number; dayOfWeek: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const cursorStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
        const isFuture = cursorStr > todayStr;
        const outOfYear = cursor.getFullYear() !== year;
        
        const info = dateMap[cursorStr] || { minutes: 0, count: 0 };
        const mins = info.minutes;
        const count = info.count;

        let level = 0;
        if (!isFuture && !outOfYear && mins > 0) {
          if (mins < 15) level = 1;
          else if (mins < 45) level = 2;
          else if (mins < 90) level = 3;
          else level = 4;
        }

        week.push({
          date: cursorStr,
          minutes: mins,
          count,
          level: outOfYear ? -1 : level,
          dayOfWeek: d,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      grid.push(week);
    }

    // Stats (only for the requested year)
    const daysInYear = Object.keys(dateMap).filter(date => date.startsWith(year.toString()));
    const totalDays = daysInYear.length;
    const totalMinutes = daysInYear.reduce((acc, date) => acc + dateMap[date].minutes, 0);

    return { grid, totalDays, totalMinutes };
  }, [year, mounted, selectedHabitId]);

  // Month labels positioned at the first week where a new month starts
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    data.grid.forEach((week, colIdx) => {
      // Find the first day of the week that belongs to the target year
      const validDay = week.find((day) => day.date.startsWith(year.toString()));
      if (!validDay) return;

      const d = new Date(validDay.date);
      const month = d.getMonth();
      // Only push a label if this is a new month we haven't labeled yet
      if (month !== lastMonth) {
        // As an extra guard, don't double-label January if somehow it spans multiple weeks at the start
        if (lastMonth === -1 || month > lastMonth) {
          labels.push({
            label: d.toLocaleString("en-US", { month: "short" }),
            col: colIdx,
          });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [data.grid, year]);

  const levelColors = [
    "bg-white/[0.03]",    // 0: no activity — nearly invisible
    "bg-primary/20",      // 1: light
    "bg-primary/40",      // 2: medium
    "bg-primary/70",      // 3: high
    "bg-primary",         // 4: intense
  ];

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  const cellSize = 16;
  const cellGap = 4;
  const colWidth = cellSize + cellGap;

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface tracking-tight">
            Focus Activity
          </h3>
          <div className="h-3 w-24 bg-surface-container-highest rounded animate-pulse" />
        </div>
        <div className="bg-surface-container-low rounded-xl p-4 h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative heatmap-wrapper">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-on-surface tracking-tight">
            Focus Activity in {year}
          </h3>
        </div>
        <span className="text-[10px] text-on-surface-variant font-medium">
          {data.totalDays} active day{data.totalDays !== 1 ? "s" : ""} · {data.totalMinutes} min total
        </span>
      </div>

      {/* Habit filter pills */}
      {habits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedHabitId(null)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
              !selectedHabitId
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-surface-container-highest/50 text-on-surface-variant/60 hover:text-on-surface-variant"
            }`}
          >
            All
          </button>
          {habits.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHabitId(selectedHabitId === h.id ? null : h.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                selectedHabitId === h.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-surface-container-highest/50 text-on-surface-variant/60 hover:text-on-surface-variant"
              }`}
            >
              {h.emoji} {h.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-surface-container-low rounded-xl p-6 overflow-x-auto relative heatmap-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{ __html: `.heatmap-scroll::-webkit-scrollbar { display: none; }` }} />
        {/* Month labels */}
        <div className="flex mb-3" style={{ paddingLeft: "42px" }}>
          {monthLabels.map((m, i) => (
            <span
              key={`${m.label}-${i}`}
              className="text-[11px] text-on-surface-variant/60 font-medium absolute-ish"
              style={{
                width: i < monthLabels.length - 1
                  ? `${(monthLabels[i + 1].col - m.col) * colWidth}px`
                  : "auto",
                display: "inline-block",
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex pr-2 border-r border-transparent" style={{ gap: `${cellGap}px` }}>
          {/* Day labels */}
          <div className="flex flex-col mr-2 shrink-0" style={{ gap: `${cellGap}px`, width: "36px" }}>
            {dayLabels.map((label, i) => (
              <div key={i} className="flex items-center justify-start pl-1" style={{ height: `${cellSize}px` }}>
                <span className="text-[11px] text-on-surface-variant/60 font-medium leading-none">
                  {label}
                </span>
              </div>
            ))}
          </div>

            {/* Grid */}
            {data.grid.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col" style={{ gap: `${cellGap}px` }}>
                {week.map((day, dIdx) => {
                  const tooltipText = day.level === -1
                    ? ""
                    : day.count === 0
                    ? `No sessions on ${new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
                    : `${day.count} session${day.count !== 1 ? "s" : ""} (${day.minutes} min) on ${new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
                  
                  return (
                    <div
                      key={dIdx}
                      onMouseEnter={(e) => {
                        if (day.level === -1) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        
                        let xPos = rect.left + (rect.width / 2);
                        let align: "center" | "right" = "center";
                        
                        // Edge collision detection (prevent right-side cut-off)
                        if (rect.right + 140 > window.innerWidth) {
                          align = "right";
                          xPos = rect.right + 4; // Anchor near right edge of the cell
                        }

                        setTooltip({
                          text: tooltipText,
                          x: xPos,
                          y: rect.top - 8,
                          align,
                          visible: true
                        });
                      }}
                      onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                      className={`rounded-[3px] transition-colors cursor-default ${
                        day.level === -1
                          ? "bg-transparent"
                          : levelColors[day.level]
                      } hover:ring-1 hover:ring-on-surface/30`}
                      style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-3">
          <span className="text-[8px] text-on-surface-variant/40 font-medium mr-1">Less</span>
          {levelColors.map((color, i) => (
            <div
              key={i}
              className={`rounded-[2px] ${color}`}
              style={{ width: "10px", height: "10px" }}
            />
          ))}
          <span className="text-[8px] text-on-surface-variant/40 font-medium ml-1">More</span>
        </div>
      </div>

      {/* Custom Tooltip */}
      {tooltip.visible && (
        <div 
          className={`fixed z-[9999] px-3 py-2 text-[11px] font-medium text-surface bg-on-surface rounded-lg shadow-xl pointer-events-none transform -translate-y-full whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            tooltip.align === "right" ? "-translate-x-full" : "-translate-x-1/2"
          }`}
          style={{ 
            left: tooltip.x, 
            top: tooltip.y
          }}
        >
          {tooltip.text}
          {/* Tooltip Triangle */}
          <div 
            className={`absolute bottom-0 w-3 h-3 bg-on-surface transform translate-y-1/2 rotate-45 ${
              tooltip.align === "right" ? "right-4" : "left-1/2 -translate-x-1/2"
            }`}
          />
        </div>
      )}
    </div>
  );
}
