import React from "react";

/**
 * Decorative geometric line pattern used on green hero banners.
 * Subtle white motif of overlapping curved squares — pure SVG, themable, crisp.
 */
export const HeroPattern: React.FC<{ className?: string; opacity?: number }> = ({
  className,
  opacity = 0.12,
}) => (
  <svg
    className={className}
    viewBox="0 0 600 300"
    preserveAspectRatio="xMaxYMid slice"
    aria-hidden="true"
  >
    <defs>
      <pattern id="cl-hero-tile" width="120" height="120" patternUnits="userSpaceOnUse">
        <g
          fill="none"
          stroke="hsl(0 0% 100%)"
          strokeWidth="1"
          strokeOpacity={opacity}
        >
          <path d="M0 60 Q 60 0 120 60 Q 60 120 0 60 Z" />
          <path d="M60 0 Q 120 60 60 120 Q 0 60 60 0 Z" />
          <circle cx="60" cy="60" r="2" fill="hsl(0 0% 100%)" fillOpacity={opacity * 1.5} stroke="none" />
        </g>
      </pattern>
    </defs>
    <rect width="600" height="300" fill="url(#cl-hero-tile)" />
  </svg>
);
