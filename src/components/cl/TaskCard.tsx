import React from "react";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip, ChipTone } from "./StatusChip";
import { IconCircleButton } from "./IconCircleButton";

export interface TaskChip {
  label: string;
  tone?: ChipTone;
}

interface TaskCardProps {
  title: string;
  chips?: TaskChip[];
  locked?: boolean;
  onOpen?: () => void;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({ title, chips = [], locked, onOpen, className }) => (
  <div
    className={cn(
      "cl-card p-4 md:p-5 flex items-center gap-3 transition-shadow",
      !locked && "hover:cl-card-hover cursor-pointer",
      locked && "opacity-70",
      className,
    )}
    onClick={() => !locked && onOpen?.()}
  >
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{title}</p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {chips.map((c, i) => (
            <StatusChip key={i} tone={c.tone}>
              {c.label}
            </StatusChip>
          ))}
        </div>
      )}
    </div>
    <IconCircleButton
      icon={locked ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
      onClick={(e) => {
        e.stopPropagation();
        if (!locked) onOpen?.();
      }}
      disabled={locked}
    />
  </div>
);
