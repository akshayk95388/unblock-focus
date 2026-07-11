"use client";

import { useEffect, useRef } from "react";

interface ConfettiProps {
  /** Number of particles to launch. */
  count?: number;
  /** How long the burst runs before it auto-cleans up (ms). */
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  spin: number;
  swayPhase: number;
  swaySpeed: number;
}

const COLORS = [
  "#FF823C",
  "#FFB692",
  "#E9C400",
  "#3f3d98",
  "#6ce5b1",
  "#ff5c8a",
  "#5bc0ff",
];

/**
 * Dependency-free confetti burst rendered on a full-screen canvas.
 * Particles fall with gravity, sway side to side, and rotate. The whole
 * thing tears itself down after `durationMs` so it never leaks rAF work.
 */
export default function Confetti({ count = 120, durationMs = 4500 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Launch particles from two lower corners + the top, biased upward/inward.
    const particles: Particle[] = Array.from({ length: count }).map(() => {
      const fromTop = Math.random() < 0.35;
      return {
        x: Math.random() * width,
        y: fromTop ? -20 - Math.random() * height * 0.3 : height + 20,
        vx: (Math.random() - 0.5) * 6,
        vy: fromTop ? 2 + Math.random() * 3 : -(9 + Math.random() * 7),
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.04,
      };
    });

    const gravity = 0.22;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      // Fade the whole layer out over the final second.
      const fade = elapsed > durationMs - 1000 ? Math.max(0, (durationMs - elapsed) / 1000) : 1;

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = fade;

      for (const p of particles) {
        p.vy += gravity;
        p.swayPhase += p.swaySpeed;
        p.x += p.vx + Math.sin(p.swayPhase) * 1.2;
        p.y += p.vy;
        p.angle += p.spin;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      ctx.globalAlpha = 1;

      if (elapsed < durationMs) {
        rafId = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [count, durationMs]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
    />
  );
}
