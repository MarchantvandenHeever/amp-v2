import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedTab {
  key: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Pill-shaped two-state segmented control (e.g. TO DO / COMPLETE). */
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ tabs, active, onChange, className }) => (
  <div
    className={cn(
      "inline-flex bg-muted/70 rounded-full p-1 text-xs font-semibold tracking-wider uppercase",
      className,
    )}
  >
    {tabs.map((t) => {
      const isActive = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-4 py-2 rounded-full transition-colors",
            isActive
              ? "bg-nav text-nav-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className={cn("ml-1.5", isActive ? "opacity-80" : "opacity-70")}>({t.count})</span>
          )}
        </button>
      );
    })}
  </div>
);
