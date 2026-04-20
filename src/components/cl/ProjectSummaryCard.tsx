import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip } from "./StatusChip";
import { Progress } from "@/components/ui/progress";

interface ProjectSummaryCardProps {
  title: string;
  description?: string;
  /** 0-100. Null = "-" */
  adoptionScore: number | null;
  averageScore?: number | null;
  members?: { id: string; name: string; avatarUrl?: string }[];
  totalMembers?: number;
  pendingTasks?: number;
  overdueTasks?: number;
  progress?: number; // 0-100
  onView?: () => void;
  className?: string;
}

const initials = (n: string) => n.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join("");

export const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({
  title,
  description,
  adoptionScore,
  averageScore,
  members = [],
  totalMembers,
  pendingTasks = 0,
  overdueTasks = 0,
  progress,
  onView,
  className,
}) => {
  const visibleMembers = members.slice(0, 3);
  const remaining = (totalMembers ?? members.length) - visibleMembers.length;
  const scoreTone = adoptionScore === null ? "text-muted-foreground"
    : adoptionScore >= 70 ? "text-amp-success"
    : adoptionScore >= 50 ? "text-amp-warning"
    : "text-amp-risk";

  return (
    <article className={cn("cl-card p-6 flex flex-col h-full transition-shadow hover:cl-card-hover", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={cn("text-3xl font-bold leading-none", scoreTone)}>
            {adoptionScore === null ? "—" : `${Math.round(adoptionScore)}%`}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Adoption score</p>
        </div>
        {(visibleMembers.length > 0 || remaining > 0) && (
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {visibleMembers.map((m) =>
                m.avatarUrl ? (
                  <img key={m.id} src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full ring-2 ring-card object-cover" />
                ) : (
                  <div key={m.id} className="w-8 h-8 rounded-full ring-2 ring-card bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                    {initials(m.name)}
                  </div>
                ),
              )}
              {remaining > 0 && (
                <div className="w-8 h-8 rounded-full ring-2 ring-card bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                  +{remaining}
                </div>
              )}
            </div>
            {typeof averageScore === "number" && (
              <span className="ml-2 text-xs">
                <span className={cn("font-semibold", averageScore >= 60 ? "text-amp-success" : "text-amp-warning")}>
                  {averageScore}%
                </span>{" "}
                <span className="text-muted-foreground">average</span>
              </span>
            )}
          </div>
        )}
      </div>

      <h3 className="mt-5 font-semibold text-foreground text-base leading-snug">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
      )}

      {typeof progress === "number" && (
        <div className="mt-4">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <StatusChip tone="neutral">{pendingTasks} pending tasks</StatusChip>
        {overdueTasks > 0 && (
          <StatusChip tone="risk">
            {overdueTasks} overdue task{overdueTasks === 1 ? "" : "s"}
          </StatusChip>
        )}
      </div>

      {onView && (
        <button
          onClick={onView}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          View project <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </article>
  );
};
