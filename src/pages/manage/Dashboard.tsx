import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { useEndUsers, useInitiatives, useRiskFlags, useJourneys, useScores, useScoreHistory } from '@/hooks/useSupabaseData';
import { useIdealAdoptionScore } from '@/hooks/useIdealAdoptionScore';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdoptionTrendChart from '@/components/charts/AdoptionTrendChart';
import { PageHero, StatusChip } from '@/components/cl';

const ChangeManagerDashboard: React.FC = () => {
  const { data: profiles, isLoading: loadingProfiles } = useEndUsers();
  const { data: initiatives, isLoading: loadingInit } = useInitiatives();
  const { data: riskFlags, isLoading: loadingRisks } = useRiskFlags();
  const { data: journeys } = useJourneys();
  const { data: scores, isLoading: loadingScores } = useScores();
  const { data: history } = useScoreHistory();
  const { idealScore: currentIdeal, desiredTarget } = useIdealAdoptionScore();

  if (loadingProfiles || loadingInit || loadingRisks || loadingScores) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const endUserScores = scores?.filter(s => profiles?.some(p => p.id === s.user_id)) || [];
  // Pull verbatim AMP dashboard fields (already time-progress weighted by score-recalc).
  const avgScoreRaw = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
    endUserScores.length ? Math.round(endUserScores.reduce((sum, s) => sum + Number(s[key] || 0), 0) / endUserScores.length) : 0;
  const avgScoreDashboard = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') => {
    const dashKey = `${key}_dashboard` as keyof typeof endUserScores[number];
    return endUserScores.length
      ? Math.round(endUserScores.reduce((sum, s) => sum + Number((s as any)[dashKey] || 0), 0) / endUserScores.length)
      : 0;
  };

  const teams = [...new Set(profiles?.map(p => p.team).filter(Boolean) || [])];
  const teamComparison = teams.map(team => {
    const teamProfiles = profiles?.filter(p => p.team === team) || [];
    const teamScores = endUserScores.filter(s => teamProfiles.some(p => p.id === s.user_id));
    const avg = (k: string) => teamScores.length ? Math.round(teamScores.reduce((sum, s) => sum + Number((s as any)[k] || 0), 0) / teamScores.length) : 0;
    // Show dashboard (p-weighted) values to match AMP semantics.
    return {
      team,
      participation: avg('participation_dashboard'),
      ownership: avg('ownership_dashboard'),
      confidence: avg('confidence_dashboard'),
      adoption: avg('adoption_dashboard'),
    };
  });

  const activeInits = initiatives?.filter(i => i.status === 'active') || [];

  // Combined time-progress p across active initiatives (used only for progress chip / chart cutoff).
  const now = new Date();
  const currentTP = (() => {
    const starts = activeInits.map(i => i.start_date).filter(Boolean) as string[];
    const ends = activeInits.map(i => i.end_date).filter(Boolean) as string[];
    if (!starts.length || !ends.length) return 1;
    const earliest = Math.min(...starts.map(s => new Date(s).getTime()));
    const latest = Math.max(...ends.map(s => new Date(s).getTime()));
    const totalDuration = latest - earliest;
    if (totalDuration <= 0) return 1;
    return Math.min(1, (now.getTime() - earliest) / totalDuration);
  })();
  const combinedProgress = Math.round(currentTP * 100);

  // ─── Trend data sourced from real score_history (written by score-recalc) ───
  // Each row already contains AMP dashboard fields; no client-side TP multiplication.
  const buildTrendFromHistory = (rows: any[]) => {
    if (!rows || rows.length === 0) return [];
    // Defensive: ignore legacy/seed rows with non-ISO week_label (e.g. "W1").
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const clean = rows.filter((r: any) => !r.week_label || ISO_DATE_RE.test(r.week_label));
    if (!clean.length) return [];
    // Group by ISO week label (already populated by score-recalc); aggregate by mean.
    const byWeek = new Map<string, any[]>();
    for (const r of clean) {
      const key = r.week_label || new Date(r.recorded_at).toISOString().slice(0, 10);
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(r);
    }
    const sortedKeys = Array.from(byWeek.keys()).sort();
    return sortedKeys.map((key) => {
      const bucket = byWeek.get(key)!;
      const mean = (k: string) =>
        Math.round(bucket.reduce((s, x) => s + Number(x[k] || 0), 0) / bucket.length);
      return {
        week: key,
        participation: mean('participation'),
        ownership: mean('ownership'),
        confidence: mean('confidence'),
        adoption: mean('adoption_dashboard'),
        idealAdoption: mean('adoption_ideal'),
      };
    });
  };

  const combinedHistoryRows = (history || []).filter(
    (h: any) => endUserScores.some((s) => s.user_id === h.user_id),
  );
  const scoreTrends = buildTrendFromHistory(combinedHistoryRows);

  // Latest live snapshot (no synthesis): pull straight from `scores` dashboard fields.
  const currentTrendPoint = {
    participation: avgScoreDashboard('participation'),
    ownership: avgScoreDashboard('ownership'),
    confidence: avgScoreDashboard('confidence'),
    adoption: avgScoreDashboard('adoption'),
    idealAdoption: currentIdeal,
  };

  // Per-initiative trend data (real history filtered by initiative_id)
  const initiativeOptions = activeInits.map(init => ({
    id: init.id,
    name: init.name,
    progress: init.progress || 0,
  }));

  const initiativeData: Record<string, any[]> = {};
  activeInits.forEach(init => {
    const initRows = (history || []).filter((h: any) => h.initiative_id === init.id);
    initiativeData[init.id] = buildTrendFromHistory(initRows);
  });

  return (
    <AppLayout>
      <div className="-m-6 mb-0">
        <PageHero
          title="Adoption Dashboard"
          subtitle="Ownership and confidence signal whether change is truly forming."
          size="sm"
        />
      </div>
      <div className="max-w-7xl mx-auto space-y-6 pt-6">

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="cl-card p-6 flex flex-col items-center justify-center">
            <AdoptionScoreRing score={currentTrendPoint.adoption} size={140} idealScore={currentTrendPoint.idealAdoption} />
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-semibold">Overall Adoption</p>
          </div>
          <ScoreCard label="Participation" score={currentTrendPoint.participation} color="participation" trend={5} />
          <ScoreCard label="Ownership" score={currentTrendPoint.ownership} color="ownership" trend={3} />
          <ScoreCard label="Confidence" score={currentTrendPoint.confidence} color="confidence" trend={2} />
        </div>

        <div>
          <h3 className="cl-section-label mb-3">Active Initiatives</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initiatives?.filter(i => i.status === 'active').map(init => (
              <motion.div key={init.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="cl-card hover:cl-card-hover transition-shadow cursor-pointer p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{init.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{init.user_count} users</p>
                  </div>
                  <StatusChip tone="info">{init.phase.replace(/_/g, ' ')}</StatusChip>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amp-adoption" style={{ width: `${init.progress}%` }} />
                  </div>
                  <span className="text-xs font-semibold">{init.progress}%</span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{journeys?.filter(j => j.initiative_id === init.id).length || 0} journeys</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="cl-card p-6">
            <h3 className="cl-section-label mb-4">Adoption Trend</h3>
            <AdoptionTrendChart
              data={scoreTrends}
              height={240}
              initiatives={initiativeOptions}
              initiativeData={initiativeData}
              progress={combinedProgress}
            />
          </div>
          <div className="cl-card p-6">
            <h3 className="cl-section-label mb-4">Team Comparison</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={teamComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="team" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                <Bar dataKey="adoption" fill="hsl(var(--amp-adoption))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="participation" fill="hsl(var(--amp-participation))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ownership" fill="hsl(var(--amp-ownership))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cl-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="cl-section-label">At-Risk Users</h3>
            <StatusChip tone="risk">
              {riskFlags?.filter(r => r.severity === 'high').length || 0} high risk
            </StatusChip>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Team</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Risk</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Severity</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {riskFlags?.map(flag => (
                  <tr key={flag.id} className="border-b border-border/50 hover:bg-secondary/50">
                    <td className="py-2.5 px-3 font-medium">{(flag as any).profiles?.display_name || 'Unknown'}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{(flag as any).profiles?.team || '-'}</td>
                    <td className="py-2.5 px-3">{flag.type}</td>
                    <td className="py-2.5 px-3">
                      <StatusChip tone={flag.severity === 'high' ? 'risk' : flag.severity === 'medium' ? 'warning' : 'neutral'}>
                        {flag.severity}
                      </StatusChip>
                    </td>
                    <td className="py-2.5 px-3 text-primary text-xs font-medium cursor-pointer hover:underline">{flag.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChangeManagerDashboard;
