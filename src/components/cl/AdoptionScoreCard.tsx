import React from "react";
import { cn } from "@/lib/utils";
import { MultiRingDonut } from "./MultiRingDonut";

export interface AdoptionDimension {
  key: string;
  label: string;
  value: number;     // 0-100
  delta?: number;    // change vs last week
  color: string;     // CSS color (hsl token preferred)
}

interface AdoptionScoreCardProps {
  title?: string;
  lastUpdatedLabel?: string;
  dimensions: AdoptionDimension[];
  adoption: number; // 0-100
  className?: string;
}

const formatDelta = (d?: number) => {
  if (d === undefined || d === null) return null;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d}`;
};

export const AdoptionScoreCard: React.FC<AdoptionScoreCardProps> = ({
  title = "Your adoption score",
  lastUpdatedLabel = "Last updated today",
  dimensions,
  adoption,
  className,
}) => (
  <section className={cn("cl-card p-6 md:p-7", className)}>
    <header className="flex items-center justify-between mb-6">
      <h3 className="cl-section-label">{title}</h3>
      <span className="text-xs text-muted-foreground">{lastUpdatedLabel}</span>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
      <ul className="divide-y divide-border/60">
        {dimensions.map((d) => {
          const delta = formatDelta(d.delta);
          const deltaTone =
            d.delta === undefined ? "" : d.delta >= 0 ? "text-emerald-700" : "text-red-600";
          return (
            <li key={d.key} className="flex items-center justify-between py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="font-medium text-foreground">{d.label}</span>
                {delta && (
                  <span className={cn("text-xs font-semibold", deltaTone)}>
                    ({delta}) <span className="font-normal text-muted-foreground">from last week</span>
                  </span>
                )}
              </div>
              <span className="font-semibold text-foreground tabular-nums">{Math.round(d.value)}%</span>
            </li>
          );
        })}
      </ul>

      <MultiRingDonut
        rings={dimensions.map((d) => ({ value: d.value, color: d.color }))}
        centerValue={adoption}
      />
    </div>
  </section>
);
