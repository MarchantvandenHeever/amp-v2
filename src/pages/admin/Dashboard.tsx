import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { useEndUsers, useInitiatives, useRiskFlags, useScores, useScoreHistory } from '@/hooks/useSupabaseData';
import { useIdealAdoptionScore } from '@/hooks/useIdealAdoptionScore';
import type { InitiativeOption } from '@/components/charts/AdoptionTrendChart';
import { motion } from 'framer-motion';
import { Users, Target, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AdoptionTrendChart from '@/components/charts/AdoptionTrendChart';

const SuperAdminDashboard: React.FC = () => {
  const { data: profiles, isLoading: loadingProfiles } = useEndUsers();
  const { data: initiatives, isLoading: loadingInit } = useInitiatives();
  const { data: riskFlags, isLoading: loadingRisks } = useRiskFlags();
  const { data: scores, isLoading: loadingScores } = useScores();
  const { idealScore: currentIdeal, desiredTarget } = useIdealAdoptionScore();

  if (loadingProfiles || loadingInit || loadingRisks || loadingScores) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const endUsers = profiles || [];
  const endUserScores = scores?.filter(s => endUsers.some(p => p.id === s.user_id)) || [];

  const avgScoreRaw = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
    endUserScores.length ? Math.round(endUserScores.reduce((sum, s) => sum + Number(s[key] || 0), 0) / endUserScores.length) : 0;

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

  const avgScore = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
    Math.round(avgScoreRaw(key) * currentTP);

  // Team comparison — use the same p-weighted (_dashboard) values as pillar tiles & trend
  const teams = [...new Set(endUsers.map(p => p.team).filter(Boolean))] as string[];
  const teamComparison = teams.map(team => {
    const teamProfiles = endUsers.filter(p => p.team === team);
    const teamScores = endUserScores.filter(s => teamProfiles.some(p => p.id === s.user_id));
    const avg = (k: string) => {
      if (!teamScores.length) return 0;
      const dashKey = `${k}_dashboard`;
      const sum = teamScores.reduce((acc, s) => {
        const v = (s as any)[dashKey];
        const fallback = Number((s as any)[k] || 0) * currentTP;
        return acc + Number(v ?? fallback);
      }, 0);
      return Math.round(sum / teamScores.length);
    };
    return { team, participation: avg('participation'), ownership: avg('ownership'), confidence: avg('confidence'), adoption: avg('adoption') };
  });

  // Build trend data from initiative date ranges
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

  function progressVisibleData<T>(rows: T[], progressValue?: number) {
    if (progressValue == null || progressValue >= 100 || rows.length === 0) return rows;
    const cutoffIndex = Math.max(1, Math.ceil((progressValue / 100) * rows.length));
    return rows.slice(0, cutoffIndex);
  }

  const scoreTrends = buildTrendData(combinedStart, combinedEnd, (key) => avgScoreRaw(key as any));
  const visibleScoreTrends = progressVisibleData(scoreTrends, combinedProgress);
  const currentTrendPoint = visibleScoreTrends[visibleScoreTrends.length - 1] ?? {
    participation: avgScore('participation'), ownership: avgScore('ownership'),
    confidence: avgScore('confidence'), adoption: avgScore('adoption'),
    idealAdoption: currentIdeal,
  };

  const initiativeOptions = activeInits.map(i => ({ id: i.id, name: i.name, progress: i.progress || 0 }));

  const stats = [
    { label: 'Total Users', value: endUsers.length, icon: Users, color: 'bg-amp-participation/10 text-amp-participation' },
    { label: 'Active Initiatives', value: activeInits.length, icon: Target, color: 'bg-amp-ownership/10 text-amp-ownership' },
    { label: 'Risk Flags', value: riskFlags?.filter(r => r.severity === 'high').length || 0, icon: AlertTriangle, color: 'bg-amp-risk/10 text-amp-risk' },
    { label: 'Avg Adoption', value: `${currentTrendPoint.adoption}%`, icon: TrendingUp, color: 'bg-amp-adoption/10 text-amp-adoption' },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">AMP makes behavioural readiness visible across your organisation</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="font-heading text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ScoreCard label="Participation" score={currentTrendPoint.participation} color="participation" trend={5} />
          <ScoreCard label="Ownership" score={currentTrendPoint.ownership} color="ownership" trend={3} />
          <ScoreCard label="Confidence" score={currentTrendPoint.confidence} color="confidence" trend={2} />
        </div>

        {/* Trend Chart */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Adoption Trend</h3>
          <AdoptionTrendChart
            data={scoreTrends}
            height={280}
            initiatives={initiativeOptions}
            progress={combinedProgress}
          />
        </div>

        {/* Team Comparison */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Team Comparison</h3>
          {teamComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="team" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="participation" fill="hsl(var(--amp-participation))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ownership" fill="hsl(var(--amp-ownership))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confidence" fill="hsl(var(--amp-confidence))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No team data available</p>
          )}
        </div>

        {/* Risk flags from DB */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Active Risk Flags</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Team</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Risk Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Severity</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {(riskFlags || []).map(flag => (
                  <tr key={flag.id} className="border-b border-border/50 hover:bg-secondary/50">
                    <td className="py-2.5 px-3 font-medium">{(flag as any).profiles?.display_name || '—'}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{(flag as any).profiles?.team || '—'}</td>
                    <td className="py-2.5 px-3">{flag.type}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        flag.severity === 'high' ? 'bg-amp-risk/10 text-amp-risk' :
                        flag.severity === 'medium' ? 'bg-amp-warning/10 text-amp-confidence' :
                        'bg-secondary text-muted-foreground'
                      }`}>{flag.severity}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{flag.recommendation}</td>
                  </tr>
                ))}
                {(riskFlags || []).length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No active risk flags</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SuperAdminDashboard;
