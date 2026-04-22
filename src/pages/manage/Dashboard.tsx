import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { useEndUsers, useInitiatives, useRiskFlags, useJourneys, useScores } from '@/hooks/useSupabaseData';
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
  const { idealScore: currentIdeal, desiredTarget } = useIdealAdoptionScore();

  if (loadingProfiles || loadingInit || loadingRisks || loadingScores) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const endUserScores = scores?.filter(s => profiles?.some(p => p.id === s.user_id)) || [];
  const avgScoreRaw = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
    endUserScores.length ? Math.round(endUserScores.reduce((sum, s) => sum + Number(s[key] || 0), 0) / endUserScores.length) : 0;

  const teams = [...new Set(profiles?.map(p => p.team).filter(Boolean) || [])];
  const teamComparison = teams.map(team => {
    const teamProfiles = profiles?.filter(p => p.team === team) || [];
    const teamScores = endUserScores.filter(s => teamProfiles.some(p => p.id === s.user_id));
    const avg = (k: string) => teamScores.length ? Math.round(teamScores.reduce((sum, s) => sum + Number((s as any)[k] || 0), 0) / teamScores.length) : 0;
    return { team, participation: avg('participation'), ownership: avg('ownership'), confidence: avg('confidence'), adoption: avg('adoption') };
  });

  const activeInits = initiatives?.filter(i => i.status === 'active') || [];

  // Duration-based combined progress
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

  // KPI scores factored by current TP
  const avgScore = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
    Math.round(avgScoreRaw(key) * currentTP);

  // Duration-based trend using initiative date ranges
  // Find combined date range across active initiatives
  const combinedStart = activeInits.reduce((earliest, init) => {
    if (!init.start_date) return earliest;
    const d = new Date(init.start_date);
    return !earliest || d < earliest ? d : earliest;
  }, null as Date | null);
  const combinedEnd = activeInits.reduce((latest, init) => {
    if (!init.end_date) return latest;
    const d = new Date(init.end_date);
    return !latest || d > latest ? d : latest;
  }, null as Date | null);

  const totalWeeks = 10;
  // now already declared above

  const buildTrendData = (startDate: Date | null, endDate: Date | null, scoresFn: (key: string) => number) => {
    if (!startDate || !endDate) {
      return Array.from({ length: totalWeeks }, (_, i) => ({
        week: `W${i + 1}`,
        participation: 0, ownership: 0, confidence: 0, adoption: 0,
        idealAdoption: Math.round(desiredTarget * ((i + 1) / totalWeeks)),
      }));
    }
    const totalDuration = endDate.getTime() - startDate.getTime();
    return Array.from({ length: totalWeeks }, (_, i) => {
      // Each synthetic week maps to a calendar point
      const weekDateMs = startDate.getTime() + ((i + 1) / totalWeeks) * totalDuration;
      const elapsed = Math.max(0, Math.min(weekDateMs - startDate.getTime(), totalDuration));
      const weekTP = totalDuration > 0 ? elapsed / totalDuration : 0;
      return {
        week: `W${i + 1}`,
        participation: Math.min(100, Math.round(scoresFn('participation') * weekTP)),
        ownership: Math.min(100, Math.round(scoresFn('ownership') * weekTP)),
        confidence: Math.min(100, Math.round(scoresFn('confidence') * weekTP)),
        adoption: Math.min(100, Math.round(scoresFn('adoption') * weekTP)),
        idealAdoption: Math.round(desiredTarget * weekTP),
      };
    });
  };

  const scoreTrends = buildTrendData(combinedStart, combinedEnd, (key) => avgScoreRaw(key as any));
  const visibleScoreTrends = progressVisibleData(scoreTrends, combinedProgress);
  const currentTrendPoint = visibleScoreTrends[visibleScoreTrends.length - 1] ?? {
    participation: avgScore('participation'),
    ownership: avgScore('ownership'),
    confidence: avgScore('confidence'),
    adoption: avgScore('adoption'),
    idealAdoption: currentIdeal,
  };

  // Per-initiative trend data
  const initiativeOptions = activeInits.map(init => ({
    id: init.id,
    name: init.name,
    progress: init.progress || 0,
  }));

  const initiativeData: Record<string, any[]> = {};
  activeInits.forEach(init => {
    const initScores = endUserScores.filter(s => s.initiative_id === init.id);
    const initAvg = (key: string) =>
      initScores.length ? Math.round(initScores.reduce((sum, s) => sum + Number((s as any)[key] || 0), 0) / initScores.length) : avgScoreRaw(key as any);
    const initStart = init.start_date ? new Date(init.start_date) : null;
    const initEnd = init.end_date ? new Date(init.end_date) : null;
    initiativeData[init.id] = buildTrendData(initStart, initEnd, initAvg);
  });

  function progressVisibleData<T>(rows: T[], progressValue?: number) {
    if (progressValue == null || progressValue >= 100 || rows.length === 0) return rows;
    const cutoffIndex = Math.max(1, Math.ceil((progressValue / 100) * rows.length));
    return rows.slice(0, cutoffIndex);
  }

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
          <h3 className="font-heading font-semibold mb-3">Active Initiatives</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initiatives?.filter(i => i.status === 'active').map(init => (
              <motion.div key={init.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-5 amp-shadow-card hover:amp-shadow-card-hover transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{init.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{init.user_count} users</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amp-adoption/10 text-amp-adoption font-medium">{init.phase.replace(/_/g, ' ')}</span>
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
          <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
            <h3 className="font-heading font-semibold mb-4">Adoption Trend</h3>
            <AdoptionTrendChart
              data={scoreTrends}
              height={240}
              initiatives={initiativeOptions}
              initiativeData={initiativeData}
              progress={combinedProgress}
            />
          </div>
          <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
            <h3 className="font-heading font-semibold mb-4">Team Comparison</h3>
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

        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">At-Risk Users</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-amp-risk/10 text-amp-risk font-medium">
              {riskFlags?.filter(r => r.severity === 'high').length || 0} high risk
            </span>
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
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        flag.severity === 'high' ? 'bg-amp-risk/10 text-amp-risk' :
                        flag.severity === 'medium' ? 'bg-amp-warning/10 text-amp-confidence' :
                        'bg-secondary text-muted-foreground'
                      }`}>{flag.severity}</span>
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
