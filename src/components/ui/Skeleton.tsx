"use client";

interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

/**
 * Pulsing placeholder used while async data loads.
 * Reserves layout space to prevent CLS (Cumulative Layout Shift).
 */
export default function Skeleton({ className = "", rounded = "lg" }: SkeletonProps) {
  return (
    <div
      className={`bg-surface-container-highest/40 animate-pulse rounded-${rounded} ${className}`}
    />
  );
}
