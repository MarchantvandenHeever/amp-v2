import React from "react";
import { Lightbulb, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecommendationTone = "tip" | "warning" | "time";

interface RecommendationRowProps {
  tone?: RecommendationTone;
  title: string;
  description?: string;
  className?: string;
}

const toneMap = {
  tip:     { icon: Lightbulb,      bg: "chip-warning" },
  warning: { icon: AlertTriangle,  bg: "chip-warning" },
  time:    { icon: Clock,          bg: "chip-warning" },
};

export const RecommendationRow: React.FC<RecommendationRowProps> = ({
  tone = "tip",
  title,
  description,
  className,
}) => {
  const Icon = toneMap[tone].icon;
  return (
    <div className={cn("flex items-start gap-4 py-4 border-b border-border/60 last:border-b-0", className)}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", toneMap[tone].bg)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-sm md:text-base">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>}
      </div>
    </div>
  );
};
