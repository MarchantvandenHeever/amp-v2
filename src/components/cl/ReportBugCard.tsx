import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroPattern } from "./HeroPattern";

interface ReportBugCardProps {
  title: string;
  ctaLabel?: string;
  onCta?: () => void;
  eyebrow?: string;
  className?: string;
}

export const ReportBugCard: React.FC<ReportBugCardProps> = ({
  title,
  ctaLabel = "Report a bug",
  onCta,
  eyebrow = "Help us improve",
  className,
}) => (
  <div className={cn("relative overflow-hidden cl-bug-card rounded-2xl p-6", className)}>
    <HeroPattern className="absolute inset-y-0 right-0 w-1/2 pointer-events-none" opacity={0.25} />
    <div className="relative">
      <p className="text-xs uppercase tracking-[0.14em] text-foreground/70 font-semibold">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-bold text-foreground leading-snug max-w-[260px]">{title}</h3>
      {onCta && (
        <button
          onClick={onCta}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-card hover:bg-card/90 border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors"
        >
          {ctaLabel} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);
