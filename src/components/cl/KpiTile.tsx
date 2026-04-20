import React from "react";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface KpiTileProps {
  icon: React.ReactNode;
  iconTone?: "neutral" | "warning" | "risk" | "success" | "info";
  value: string | number;
  label: string;
  hint?: string;
  className?: string;
}

const toneMap: Record<NonNullable<KpiTileProps["iconTone"]>, string> = {
  neutral: "chip-neutral",
  warning: "chip-warning",
  risk:    "chip-risk",
  success: "chip-success",
  info:    "chip-info",
};

export const KpiTile: React.FC<KpiTileProps> = ({
  icon,
  iconTone = "neutral",
  value,
  label,
  hint,
  className,
}) => (
  <div className={cn("cl-card p-5 flex items-center gap-4", className)}>
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", toneMap[iconTone])}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-3xl font-bold text-foreground leading-none">{value}</div>
      <div className="mt-1.5 text-[11px] tracking-[0.14em] uppercase font-semibold text-muted-foreground flex items-center gap-1">
        {label}
        {hint && <Info className="w-3 h-3 opacity-60" aria-label={hint} />}
      </div>
    </div>
  </div>
);
