import React from "react";
import { cn } from "@/lib/utils";

interface RightRailPanelProps {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const RightRailPanel: React.FC<RightRailPanelProps> = ({
  title,
  meta,
  actions,
  children,
  className,
}) => (
  <section className={cn("cl-card p-5 md:p-6 flex flex-col", className)}>
    <header className="flex items-center justify-between gap-3 mb-4">
      <h3 className="cl-section-label">{title}</h3>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </header>
    {meta && <div className="mb-3">{meta}</div>}
    <div className="flex-1 min-h-0">{children}</div>
  </section>
);
