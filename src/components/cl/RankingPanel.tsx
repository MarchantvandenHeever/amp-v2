import React from "react";
import { cn } from "@/lib/utils";

export interface RankedMember {
  id: string;
  rank: number;
  name: string;
  /** 0-100 — null means no data */
  score: number | null;
}

interface RankingPanelProps {
  topAchievers: RankedMember[];
  underperformers: RankedMember[];
  onShowAll?: () => void;
  className?: string;
}

const ScoreCell: React.FC<{ score: number | null; tone: "good" | "bad" }> = ({ score, tone }) => {
  if (score === null) return <span className="text-muted-foreground">-</span>;
  return (
    <span className={cn("font-semibold tabular-nums", tone === "good" ? "text-emerald-700" : "text-red-600")}>
      {score}%
    </span>
  );
};

const Row: React.FC<{ m: RankedMember; tone: "good" | "bad" }> = ({ m, tone }) => (
  <li className="flex items-center justify-between py-2.5">
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-6 text-xs text-muted-foreground tabular-nums">{m.rank}</span>
      <span className="text-sm text-foreground truncate">{m.name}</span>
    </div>
    <ScoreCell score={m.score} tone={tone} />
  </li>
);

export const RankingPanel: React.FC<RankingPanelProps> = ({
  topAchievers,
  underperformers,
  onShowAll,
  className,
}) => (
  <section className={cn("cl-card p-6", className)}>
    <h3 className="cl-section-label mb-4">Your team</h3>

    {topAchievers.length > 0 && (
      <>
        <p className="text-xs text-muted-foreground mb-1">Top achievers</p>
        <ul className="divide-y divide-border/60">
          {topAchievers.map((m) => <Row key={m.id} m={m} tone="good" />)}
        </ul>
      </>
    )}

    {underperformers.length > 0 && (
      <>
        <p className="text-xs text-muted-foreground mt-5 mb-1">Underperforming members</p>
        <ul className="divide-y divide-border/60">
          {underperformers.map((m) => <Row key={m.id} m={m} tone="bad" />)}
        </ul>
      </>
    )}

    {onShowAll && (
      <button
        onClick={onShowAll}
        className="mt-5 w-full rounded-full border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        Show all
      </button>
    )}
  </section>
);
