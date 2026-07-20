import React from "react";

interface UnblockLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Clean SVG component of the original white U-Arrow logo.
 * Tightly cropped viewBox (0 0 66 90) so there is no excess padding around the icon.
 */
export default function UnblockLogo({
  className = "h-6 w-auto text-white",
  size,
  ...props
}: UnblockLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 66 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* U-shaped body path */}
      <path
        d="M 9 36 V 64 C 9 73.941 17.059 82 27 82 C 36.941 82 45 73.941 45 64 V 42"
        stroke="currentColor"
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrowhead pointing UP */}
      <path
        d="M 29 44 L 45 22 L 61 44 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
