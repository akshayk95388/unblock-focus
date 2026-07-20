import React from "react";
import Link from "next/link";

interface UnblockWordmarkProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

/**
 * Unblock Wordmark with bold "U" and subtle bottom accent underline.
 * Creates a unique, consistent brand identity without needing a separate icon.
 */
export default function UnblockWordmark({
  size = "md",
  href,
  className = "",
}: UnblockWordmarkProps) {
  const textSizeClass =
    size === "sm"
      ? "text-base"
      : size === "lg"
      ? "text-2xl"
      : "text-xl";

  const underlineHeightClass =
    size === "sm"
      ? "h-[2px] -bottom-[1px]"
      : size === "lg"
      ? "h-[3px] -bottom-[2px]"
      : "h-[2.5px] -bottom-[1.5px]";

  const content = (
    <span className={`inline-flex items-baseline font-black tracking-tighter text-primary-container select-none ${textSizeClass} ${className}`}>
      <span className="relative inline-block font-black">
        U
        <span
          className={`absolute left-0 right-0 bg-primary-container rounded-full ${underlineHeightClass}`}
        />
      </span>
      <span>nblock</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-85 transition-opacity inline-flex items-baseline">
        {content}
      </Link>
    );
  }

  return content;
}
