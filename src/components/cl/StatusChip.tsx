import React from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "success" | "warning" | "risk" | "info" | "neutral" | "dark";

interface StatusChipProps {
  tone?: ChipTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const toneClass: Record<ChipTone, string> = {
  success: "chip-success",
  warning: "chip-warning",
  risk:    "chip-risk",
  info:    "chip-info",
  neutral: "chip-neutral",
  dark:    "chip-dark",
};

export const StatusChip: React.FC<StatusChipProps> = ({ tone = "neutral", icon, children, className }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
      toneClass[tone],
      className,
    )}
  >
    {icon}
    {children}
  </span>
);
