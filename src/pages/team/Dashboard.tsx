import React, { useMemo } from "react";
import { Loader2, Users, ShieldAlert, TrendingUp, Trophy } from "lucide-react";

import { EndUserLayout } from "@/components/layout/EndUserLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEndUsers,
  useRiskFlags,
  useScores,
  useInitiatives,
} from "@/hooks/useSupabaseData";

import {
  PageHero,
  KpiTile,
  AdoptionScoreCard,
  RankingPanel,
  RightRailPanel,
  EmptyState,
  StatusChip,
  type RankedMember,
} from "@/components/cl";
import { derivePersona } from "@/lib/personaDerivation";

const TeamDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: allProfiles, isLoading: loadingProfiles } = useEndUsers();
  const { data: riskFlags } = useRiskFlags();
  const { data: scores, isLoading: loadingScores } = useScores();
  const { data: initiatives } = useInitiatives();

  const teamName = user?.team || "Sales";
  const isAdminView = user?.role === "change_manager" || user?.role === "super_admin";

  // Time progress (matches Dashboard logic).
  const currentTP = useMemo(() => {
    const active = initiatives?.filter((i) => i.status === "active") || [];
    const starts = active.map((i) => i.start_date).filter(Boolean) as string[];
    const ends = active.map((i) => i.end_date).filter(Boolean) as string[];
    if (!starts.length || !ends.length) return 1;
    const earliest = Math.min(...starts.map((s) => new Date(s).getTime()));
    const latest = Math.max(...ends.map((s) => new Date(s).getTime()));
    const total = latest - earliest;
    if (total <= 0) return 1;
    return Math.min(1, (Date.now() - earliest) / total);
  }, [initiatives]);

  // Team members: team_lead → their team only. Admins → all end users.
  const teamMembers = useMemo(() => {
    if (!allProfiles) return [];
    if (isAdminView) return allProfiles;
    return allProfiles.filter((u) => u.team === teamName);
  }, [allProfiles, isAdminView, teamName]);

  const teamScores = useMemo(
    () => scores?.filter((s) => teamMembers.some((m) => m.id === s.user_id)) || [],
    [scores, teamMembers],
  );

  const teamRisks = useMemo(
    () => riskFlags?.filter((r) => teamMembers.some((m) => m.id === r.user_id)) || [],
    [riskFlags, teamMembers],
  );

  const avg = (key: "participation" | "ownership" | "confidence" | "adoption") =>
    Math.round(
      (teamScores.length
        ? teamScores.reduce((sum, s) => sum + Number(s[key] || 0), 0) / teamScores.length
        : 0) * currentTP,
    );

  const membersWithScores = useMemo(
    () =>
      teamMembers
        .map((m) => {
          const s = teamScores.find((sc) => sc.user_id === m.id);
          return {
            id: m.id,
            name: m.display_name,
            persona: derivePersona(m as any, s as any),
            team: m.team,
            adoption: Math.round(Number(s?.adoption || 0) * currentTP),
          };
        })
        .sort((a, b) => b.adoption - a.adoption),
    [teamMembers, teamScores, currentTP],
  );

  const topAchievers: RankedMember[] = useMemo(
    () =>
      membersWithScores.slice(0, 5).map((m, i) => ({
        id: m.id,
        rank: i + 1,
        name: m.name,
        score: m.adoption,
      })),
    [membersWithScores],
  );

  const underperformers: RankedMember[] = useMemo(() => {
    const slice = [...membersWithScores].slice(-5).reverse();
    return slice.map((m, i) => ({
      id: m.id,
      rank: membersWithScores.length - i,
      name: m.name,
      score: m.adoption,
    }));
  }, [membersWithScores]);

  if (!user) return null;

  if (loadingProfiles || loadingScores) {
    return (
      <EndUserLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </EndUserLayout>
    );
  }

  const adoption = avg("adoption");
  const dimensions = [
    { key: "participation", label: "Participation", value: avg("participation"), color: "hsl(var(--amp-participation))" },
    { key: "ownership", label: "Ownership", value: avg("ownership"), color: "hsl(var(--amp-ownership))" },
    { key: "confidence", label: "Confidence", value: avg("confidence"), color: "hsl(var(--amp-confidence))" },
  ];

  const titleSuffix = isAdminView ? "All teams" : `${teamName} team`;

  return (
    <EndUserLayout>
      <PageHero
        title={`Team workspace — ${titleSuffix}`}
        subtitle="See how your team is adopting the change. Spot the people who need a nudge."
        size="md"
      />

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-16 space-y-6">
        {teamMembers.length === 0 ? (
          <EmptyState
            title="No team members yet"
            description="Once members are assigned to your team, they'll show up here."
          />
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiTile icon={<Users className="w-6 h-6" />} iconTone="info" value={teamMembers.length} label="Team members" />
              <KpiTile icon={<TrendingUp className="w-6 h-6" />} iconTone="success" value={`${adoption}%`} label="Avg adoption" />
              <KpiTile icon={<Trophy className="w-6 h-6" />} iconTone="warning" value={topAchievers[0]?.score ?? 0} label="Top score" />
              <KpiTile icon={<ShieldAlert className="w-6 h-6" />} iconTone="risk" value={teamRisks.length} label="Risk flags" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <div className="space-y-6 min-w-0">
                <AdoptionScoreCard
                  title="Team adoption score"
                  dimensions={dimensions}
                  adoption={adoption}
                  lastUpdatedLabel={`${teamMembers.length} members · updated today`}
                />

                {/* Team table */}
                <section className="cl-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="cl-section-label">All team members</h3>
                    <span className="text-xs text-muted-foreground">
                      Sorted by adoption
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {membersWithScores.map((m, i) => {
                      const hasRisk = teamRisks.some((r) => r.user_id === m.id);
                      return (
                        <li key={m.id} className="flex items-center gap-3 py-3">
                          <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                            {m.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {m.persona || "—"}{isAdminView && m.team ? ` · ${m.team}` : ""}
                            </p>
                          </div>
                          {hasRisk && <StatusChip tone="risk">Risk</StatusChip>}
                          <span className="font-semibold tabular-nums text-amp-adoption w-12 text-right">
                            {m.adoption}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>

              {/* Right rail */}
              <aside className="space-y-6">
                <RankingPanel
                  topAchievers={topAchievers}
                  underperformers={underperformers.filter(
                    (u) => !topAchievers.some((t) => t.id === u.id),
                  )}
                />

                {teamRisks.length > 0 && (
                  <RightRailPanel title="Active risks" meta={
                    <span className="text-xs text-muted-foreground">{teamRisks.length} flagged</span>
                  }>
                    <ul className="space-y-3">
                      {teamRisks.slice(0, 5).map((r: any) => (
                        <li key={r.id} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {r.profiles?.display_name || "Unknown"}
                            </span>
                            <StatusChip tone={r.severity === "high" ? "risk" : "warning"}>
                              {r.severity}
                            </StatusChip>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{r.type}</p>
                        </li>
                      ))}
                    </ul>
                  </RightRailPanel>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </EndUserLayout>
  );
};

export default TeamDashboard;
