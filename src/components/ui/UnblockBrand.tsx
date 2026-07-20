import Link from "next/link";
import UnblockLogo from "./UnblockLogo";

interface UnblockBrandProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  showText?: boolean;
}

/**
 * Integrated Unblock Brand Component
 * Uses the original white U-Arrow logo tightly fitted next to "nblock" text in clean white typography.
 */
export default function UnblockBrand({
  size = "md",
  href,
  className = "",
  showText = true,
}: UnblockBrandProps) {
  const iconSizeClass =
    size === "sm" ? "h-5" : size === "lg" ? "h-8" : "h-6";
  const textSizeClass =
    size === "sm"
      ? "text-base"
      : size === "lg"
      ? "text-2xl"
      : "text-xl";

  const content = (
    <div className={`inline-flex items-center gap-0.5 font-bold tracking-tighter text-white group ${className}`}>
      <UnblockLogo className={`${iconSizeClass} w-auto text-white transition-transform group-hover:scale-105 shrink-0`} />
      {showText && (
        <span className={`${textSizeClass} tracking-tight select-none text-white`}>
          nblock
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
