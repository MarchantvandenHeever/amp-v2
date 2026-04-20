import React from "react";
import { cn } from "@/lib/utils";

export interface WorkspaceTab {
  key: string;
  label: string;
  disabled?: boolean;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Navy bar with uppercase tabs and bottom underline on active. */
export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ tabs, active, onChange, className }) => (
  <div className={cn("bg-nav text-nav-foreground", className)}>
    <div className="max-w-7xl mx-auto px-6 md:px-10 flex gap-8">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.key)}
            className={cn(
              "relative py-4 text-xs font-semibold tracking-[0.14em] uppercase transition-colors",
              isActive ? "text-nav-active" : "text-nav-muted hover:text-nav-foreground/90",
              t.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {t.label}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-nav-foreground rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  </div>
);
