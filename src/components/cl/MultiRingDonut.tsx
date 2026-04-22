import React from "react";
import { cn } from "@/lib/utils";

interface Ring {
  /** 0-100 */
  value: number;
  color: string; // hsl(var(--...)) or any CSS color
  label?: string;
}

interface MultiRingDonutProps {
  rings: Ring[];
  /** 0-100 — value rendered in the center */
  centerValue: number;
  /** Optional color for the implicit center (adoption) ring */
  centerColor?: string;
  centerLabel?: string;
  size?: number;
  className?: string;
}

/**
 * Concentric SVG donut. Each ring is the same stroke width, separated by a small gap.
 * Renders dependency-free, scales cleanly.
 */
export const MultiRingDonut: React.FC<MultiRingDonutProps> = ({
  rings,
  centerValue,
  centerColor = "hsl(var(--primary))",
  centerLabel = "Adoption",
  size = 220,
  className,
}) => {
  const stroke = 11;
  const gap = 5;
  const cx = size / 2;
  const cy = size / 2;

  // Only render the pillar rings; adoption is shown as the center percentage.
  const allRings: Ring[] = rings;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {allRings.map((r, i) => {
          const radius = size / 2 - stroke / 2 - i * (stroke + gap);
          if (radius <= stroke) return null;
          const c = 2 * Math.PI * radius;
          const pct = Math.max(0, Math.min(100, r.value)) / 100;
          const dash = pct * c;
          return (
            <g key={i} transform={`rotate(-90 ${cx} ${cy})`}>
              {/* Track */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={stroke}
                opacity={0.45}
              />
              {/* Value arc */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c - dash}`}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-foreground tracking-tight tabular-nums">
            {Math.round(centerValue)}
          </span>
          <span className="text-base font-semibold text-foreground ml-0.5">%</span>
        </div>
        <span className="text-xs text-muted-foreground mt-0.5">{centerLabel}</span>
      </div>
    </div>
  );
};
