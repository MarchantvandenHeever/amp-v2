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
  centerLabel = "Adoption",
  size = 220,
  className,
}) => {
  const stroke = 12;
  const gap = 4;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((r, i) => {
          const radius = size / 2 - stroke / 2 - i * (stroke + gap);
          if (radius <= 0) return null;
          const c = 2 * Math.PI * radius;
          const dash = (Math.max(0, Math.min(100, r.value)) / 100) * c;
          return (
            <g key={i} transform={`rotate(-90 ${cx} ${cy})`}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={stroke}
                strokeLinecap="round"
                opacity={0.55}
              />
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
          <span className="text-4xl font-bold text-foreground tracking-tight">{Math.round(centerValue)}</span>
          <span className="text-base font-semibold text-foreground ml-0.5">%</span>
        </div>
        <span className="text-xs text-muted-foreground mt-0.5">{centerLabel}</span>
      </div>
    </div>
  );
};
