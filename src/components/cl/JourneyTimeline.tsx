import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JourneyStepData {
  id: string;
  title: string;
  status: "complete" | "active" | "upcoming" | "risk";
  description?: string;
  start?: string;
  end?: string;
  progress?: number; // 0-100
  expandable?: boolean;
}

interface JourneyTimelineProps {
  steps: JourneyStepData[];
  /** id of the step initially expanded (defaults to first 'active' step) */
  defaultExpandedId?: string;
  className?: string;
}

const dotStyle = (status: JourneyStepData["status"]) => {
  switch (status) {
    case "complete": return "bg-amp-success border-amp-success";
    case "active":   return "bg-card border-amp-success ring-4 ring-amp-success/20";
    case "risk":     return "bg-card border-amp-risk ring-4 ring-amp-risk/20";
    default:         return "bg-card border-border";
  }
};

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  steps,
  defaultExpandedId,
  className,
}) => {
  const initial = defaultExpandedId ?? steps.find((s) => s.status === "active")?.id;
  const [expanded, setExpanded] = useState<string | undefined>(initial);

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
      <ol className="space-y-5">
        {steps.map((step) => {
          const isOpen = expanded === step.id;
          const upcoming = step.status === "upcoming";
          return (
            <li key={step.id} className="relative pl-8">
              <span
                className={cn(
                  "absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 transition-all",
                  dotStyle(step.status),
                )}
              />
              <div className="flex items-center justify-between gap-3">
                <h4
                  className={cn(
                    "text-sm md:text-base font-semibold",
                    upcoming ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.title}
                </h4>
                <div className="flex items-center gap-3">
                  {typeof step.progress === "number" && step.status !== "upcoming" && (
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        step.status === "risk" ? "text-amp-risk" : "text-amp-success",
                      )}
                    >
                      {step.progress}% Complete
                    </span>
                  )}
                  {step.expandable !== false && (step.description || step.start) && (
                    <button
                      onClick={() => setExpanded(isOpen ? undefined : step.id)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground rounded-full border border-border px-3 py-1 hover:bg-muted"
                    >
                      {isOpen ? "Collapse" : "Expand"}
                      <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                    </button>
                  )}
                </div>
              </div>
              {isOpen && (step.description || step.start) && (
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {step.description && <p>{step.description}</p>}
                  {(step.start || step.end) && (
                    <p className="mt-3 text-xs">
                      {step.start && (
                        <>
                          <span className="font-semibold text-foreground">Start:</span> {step.start}
                          <span className="mx-3 text-border">•</span>
                        </>
                      )}
                      {step.end && (
                        <>
                          <span className="font-semibold text-foreground">End:</span> {step.end}
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
