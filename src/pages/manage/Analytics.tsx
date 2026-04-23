import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useScores, useScoreHistory, useEndUsers, useInitiatives, useRiskFlags, getScoreLabel, getScoreColor } from '@/hooks/useSupabaseData';
import { useIdealAdoptionScore } from '@/hooks/useIdealAdoptionScore';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import AdoptionTrendChart from '@/components/charts/AdoptionTrendChart';
import {
  ResponsiveContainer,
  BarChart, Bar, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, XAxis, YAxis
} from 'recharts';
import { Users, Target, AlertTriangle, BarChart3 } from 'lucide-react';
import { PageHero } from '@/components/cl';

const INDICES = [
  { key: 'participation', label: 'Participation', color: 'hsl(var(--amp-participation))' },
  { key: 'ownership', label: 'Ownership', color: 'hsl(var(--amp-ownership))' },
  { key: 'confidence', label: 'Confidence', color: 'hsl(var(--amp-confidence))' },
  { key: 'adoption', label: 'Adoption', color: 'hsl(var(--amp-adoption))' },
] as const;

type IndexKey = typeof INDICES[number]['key'];

const Analytics: React.FC = () => {
  const { data: scores } = useScores();
  const { data: scoreHistory } = useScoreHistory();
  const { data: profiles } = useEndUsers();
  const { data: initiatives } = useInitiatives();
  const { data: riskFlags } = useRiskFlags();
  const { idealScore: currentIdeal } = useIdealAdoptionScore();

  const [selectedIndices, setSelectedIndices] = useState<Set<IndexKey>>(new Set(['participation', 'ownership', 'confidence', 'adoption']));
  const [selectedInitiative, setSelectedInitiative] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'team' | 'persona'>('team');

  const toggleIndex = (key: IndexKey) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const endUserIds = useMemo(() => new Set((profiles || []).map((p) => p.id)), [profiles]);
  const endUserScores = useMemo(
    () => (scores || []).filter((s) => endUserIds.has(s.user_id)),
    [scores, endUserIds],
  );
  const endUserHistory = useMemo(
    () => (scoreHistory || []).filter((h) => endUserIds.has(h.user_id)),
    [scoreHistory, endUserIds],
  );

  // Per-initiative data setup
  const activeInits = initiatives?.filter(i => i.status === 'active') || [];
  const initiativeOptions = activeInits.map(init => ({
    id: init.id,
    name: init.name,
    progress: init.progress || 0,
  }));

  // Duration-based combined progress
  const currentTP = useMemo(() => {
    const now = Date.now();
    const starts = activeInits.map(i => i.start_date).filter(Boolean) as string[];
    const ends = activeInits.map(i => i.end_date).filter(Boolean) as string[];
    if (!starts.length || !ends.length) return 1;
    const earliest = Math.min(...starts.map(s => new Date(s).getTime()));
    const latest = Math.max(...ends.map(s => new Date(s).getTime()));
    const totalDuration = latest - earliest;
    if (totalDuration <= 0) return 1;
    return Math.min(1, (now - earliest) / totalDuration);
  }, [activeInits]);
  const combinedProgress = Math.round(currentTP * 100);
  const selectedInitiativeProgress = selectedInitiative === 'all'
    ? combinedProgress
    : (activeInits.find(i => i.id === selectedInitiative)?.progress ?? combinedProgress);

  const filteredScores = useMemo(
    () => selectedInitiative === 'all' ? endUserScores : endUserScores.filter(s => s.initiative_id === selectedInitiative),
    [endUserScores, selectedInitiative],
  );

  const avgScores = useMemo(() => {
    if (!filteredScores.length) return { participation: 0, ownership: 0, confidence: 0, adoption: 0 };
    const avg = (k: 'participation' | 'ownership' | 'confidence' | 'adoption') => {
      const dashKey = `${k}_dashboard` as const;
      const sum = filteredScores.reduce((acc, r: any) => {
        const v = r[dashKey];
        const fallback = (Number(r[k]) || 0) * currentTP;
        return acc + Number(v ?? fallback);
      }, 0);
      return Math.round(sum / filteredScores.length);
    };
    return {
      participation: avg('participation'),
      ownership: avg('ownership'),
      confidence: avg('confidence'),
      adoption: avg('adoption'),
    };
  }, [filteredScores, currentTP]);

  // Build trend data from score_history
  // Rows are already written by score-recalc, so do not re-apply time-progress on the client.
  const buildTrendFromHistory = (filtered: any[]) => {
    if (!filtered.length) return [];

    const byWeek: Record<string, { count: number; participation: number; ownership: number; confidence: number; adoption: number; idealAdoption: number }> = {};
    filtered.forEach(r => {
      const week = r.week_label || new Date(r.recorded_at).toISOString().slice(0, 10);
      if (!byWeek[week]) {
        byWeek[week] = {
          count: 0,
          participation: 0,
          ownership: 0,
          confidence: 0,
          adoption: 0,
          idealAdoption: 0,
        };
      }
      byWeek[week].count++;
      byWeek[week].participation += Number(r.participation) || 0;
      byWeek[week].ownership += Number(r.ownership) || 0;
      byWeek[week].confidence += Number(r.confidence) || 0;
      byWeek[week].adoption += Number(r.adoption_dashboard ?? r.adoption) || 0;
      byWeek[week].idealAdoption += Number(r.adoption_ideal) || 0;
    });

    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({
        week,
        participation: Math.round(v.participation / v.count),
        ownership: Math.round(v.ownership / v.count),
        confidence: Math.round(v.confidence / v.count),
        adoption: Math.round(v.adoption / v.count),
        idealAdoption: Math.round(v.idealAdoption / v.count),
      }));
  };

  const trendData = useMemo(() => {
    const filtered = selectedInitiative === 'all'
      ? endUserHistory
      : endUserHistory.filter(s => s.initiative_id === selectedInitiative);
    return buildTrendFromHistory(filtered);
  }, [endUserHistory, selectedInitiative]);

  const currentTrendPoint = {
    participation: avgScores.participation,
    ownership: avgScores.ownership,
    confidence: avgScores.confidence,
    adoption: avgScores.adoption,
    idealAdoption: currentIdeal,
  };

  const perInitiativeTrendData = useMemo(() => {
    if (!endUserHistory.length) return {} as Record<string, any[]>;
    const result: Record<string, any[]> = {};
    activeInits.forEach(init => {
      const filtered = endUserHistory.filter(s => s.initiative_id === init.id);
      result[init.id] = buildTrendFromHistory(filtered);
    });
    return result;
  }, [endUserHistory, activeInits]);

  // Helper: read p-weighted (_dashboard) value with raw*TP fallback (matches Overview)
  const dashVal = (row: any, k: 'participation' | 'ownership' | 'confidence' | 'adoption') => {
    const v = row[`${k}_dashboard`];
    return Number(v ?? (Number(row[k]) || 0) * currentTP);
  };

  // Group breakdown (by team or persona)
  const groupData = useMemo(() => {
    if (!filteredScores.length || !profiles?.length) return [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const groups: Record<string, { count: number; participation: number; ownership: number; confidence: number; adoption: number }> = {};
    filteredScores.forEach(s => {
      const profile = profileMap.get(s.user_id);
      const group = groupBy === 'team' ? (profile?.team || 'Unknown') : (profile?.persona || 'Unknown');
      if (!groups[group]) groups[group] = { count: 0, participation: 0, ownership: 0, confidence: 0, adoption: 0 };
      groups[group].count++;
      groups[group].participation += dashVal(s, 'participation');
      groups[group].ownership += dashVal(s, 'ownership');
      groups[group].confidence += dashVal(s, 'confidence');
      groups[group].adoption += dashVal(s, 'adoption');
    });
    return Object.entries(groups).map(([name, v]) => ({
      name,
      participation: Math.round(v.participation / v.count),
      ownership: Math.round(v.ownership / v.count),
      confidence: Math.round(v.confidence / v.count),
      adoption: Math.round(v.adoption / v.count),
    }));
  }, [filteredScores, profiles, groupBy, currentTP]);

  // Individual user table — adoption performance is measured as ΔA (gap vs ideal)
  // ΔA(pp) = adoption_dashboard − adoption_ideal  (both already p-scaled)
  const userTable = useMemo(() => {
    if (!filteredScores.length || !profiles?.length) return [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    return filteredScores.map((s: any) => {
      const profile = profileMap.get(s.user_id);
      const adoption = Math.round(dashVal(s, 'adoption'));
      const ideal = Math.round(Number(s.adoption_ideal) || 0);
      const deltaA = adoption - ideal; // performance gap in percentage-points
      return {
        id: s.user_id,
        name: profile?.display_name || 'Unknown',
        team: profile?.team || '—',
        persona: profile?.persona || '—',
        participation: Math.round(dashVal(s, 'participation')),
        ownership: Math.round(dashVal(s, 'ownership')),
        confidence: Math.round(dashVal(s, 'confidence')),
        adoption,
        ideal,
        deltaA,
        label: getScoreLabel(adoption),
      };
    }).sort((a, b) => a.deltaA - b.deltaA); // worst performance first
  }, [filteredScores, profiles, currentTP]);

  // Radar data for overview
  const radarData = useMemo(() => {
    return INDICES.filter(i => selectedIndices.has(i.key)).map(i => ({
      index: i.label,
      score: avgScores[i.key],
      fullMark: 100,
    }));
  }, [avgScores, selectedIndices]);

  // Distribution by Adoption Performance (ΔA = actual − ideal, in percentage-points).
  // Both values are already scaled by time-progress, so ΔA is the true performance signal.
  const distributionData = useMemo(() => {
    if (!userTable.length) return [];
    const buckets = {
      'Ahead (Δ ≥ +5pp)': 0,
      'On Track (−5 to +5pp)': 0,
      'Behind (−15 to −5pp)': 0,
      'At Risk (Δ < −15pp)': 0,
    };
    userTable.forEach((u: any) => {
      const d = u.deltaA;
      if (d >= 5) buckets['Ahead (Δ ≥ +5pp)']++;
      else if (d >= -5) buckets['On Track (−5 to +5pp)']++;
      else if (d >= -15) buckets['Behind (−15 to −5pp)']++;
      else buckets['At Risk (Δ < −15pp)']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [userTable]);

  // Ahead → Adoption (green), On Track → info, Behind → warning, At Risk → risk
  const PIE_COLORS = ['hsl(var(--amp-success))', 'hsl(var(--amp-info))', 'hsl(var(--amp-warning))', 'hsl(var(--amp-risk))'];

  const riskCount = riskFlags?.filter(r => r.severity === 'high').length || 0;

  return (
    <AppLayout>
      <div className="-m-6 mb-6">
        <PageHero
          title="Analytics"
          subtitle="Behavioural adoption intelligence across your organisation"
          size="sm"
        >
          <div className="mt-4">
            <Select value={selectedInitiative} onValueChange={setSelectedInitiative}>
              <SelectTrigger className="w-56 bg-white/10 border-white/20 text-white backdrop-blur-sm rounded-full">
                <SelectValue placeholder="All Initiatives" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Initiatives</SelectItem>
                {initiatives?.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageHero>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Index selector */}
        <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-4">Display Indices</span>
          <div className="inline-flex flex-wrap gap-4 mt-2">
            {INDICES.map(idx => (
              <label key={idx.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedIndices.has(idx.key)}
                  onCheckedChange={() => toggleIndex(idx.key)}
                  disabled={selectedIndices.has(idx.key) && selectedIndices.size === 1}
                />
                <span className="text-sm font-medium" style={{ color: idx.color }}>{idx.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* KPI summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {INDICES.filter(i => selectedIndices.has(i.key)).map((idx, i) => (
            <motion.div key={idx.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <ScoreCard label={idx.label} score={avgScores[idx.key]} color={idx.key} />
            </motion.div>
          ))}
        </div>

        {/* Summary stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: userTable.length, icon: Users, cls: 'bg-primary/10 text-primary' },
            { label: 'Active Initiatives', value: initiatives?.filter(i => i.status === 'active').length || 0, icon: Target, cls: 'bg-amp-ownership/10 text-amp-ownership' },
            { label: 'High Risk Flags', value: riskCount, icon: AlertTriangle, cls: 'bg-amp-risk/10 text-amp-risk' },
            { label: 'Avg Adoption', value: `${avgScores.adoption}%`, icon: BarChart3, cls: 'bg-amp-adoption/10 text-amp-adoption' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 amp-shadow-card flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.cls}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-heading font-bold text-lg">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="users">User Scores</TabsTrigger>
          </TabsList>

          {/* TRENDS TAB */}
          <TabsContent value="trends" className="space-y-4">
            {/* Adoption Trend Chart with initiative filter */}
            <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
              <h3 className="font-heading font-semibold mb-4">Score Trend Over Time</h3>
              {trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No trend data available</p>
              ) : (
                <AdoptionTrendChart
                  data={trendData}
                  height={320}
                  initiatives={initiativeOptions}
                  initiativeData={perInitiativeTrendData}
                  progress={selectedInitiativeProgress}
                />
              )}
            </div>

            {/* Radar chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
                <h3 className="font-heading font-semibold mb-4">Index Radar</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="index" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--amp-adoption))" fill="hsl(var(--amp-adoption))" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card flex flex-col items-center justify-center">
                <h3 className="font-heading font-semibold mb-4">Overall Adoption</h3>
                <AdoptionScoreRing score={currentTrendPoint.adoption} size={180} idealScore={currentTrendPoint.idealAdoption} />
                <p className={`mt-3 text-sm font-semibold ${getScoreColor(currentTrendPoint.adoption)}`}>
                  {getScoreLabel(currentTrendPoint.adoption)}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* BREAKDOWN TAB */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Group by:</span>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'team' | 'persona')}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="persona">Persona</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bar chart */}
            <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
              <h3 className="font-heading font-semibold mb-4">Scores by {groupBy === 'team' ? 'Team' : 'Persona'}</h3>
              {groupData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={groupData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px', background: 'hsl(var(--card))' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                      <Bar key={idx.key} dataKey={idx.key} name={idx.label} fill={idx.color} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Group table */}
            <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
              <h3 className="font-heading font-semibold mb-4">{groupBy === 'team' ? 'Team' : 'Persona'} Summary Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">{groupBy === 'team' ? 'Team' : 'Persona'}</th>
                      {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                        <th key={idx.key} className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">{idx.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupData.map(row => (
                      <tr key={row.name} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="py-2.5 px-3 font-medium">{row.name}</td>
                        {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                          <td key={idx.key} className="py-2.5 px-3 text-right font-semibold" style={{ color: idx.color }}>
                            {row[idx.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* DISTRIBUTION TAB — Adoption Performance (ΔA vs ideal) */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="bg-amp-info/5 border border-amp-info/20 rounded-xl p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Adoption Performance</strong> measures each user's
              adoption score against the <em>ideal</em> trajectory at this point in time
              (both already scaled by time-progress). ΔA = actual − ideal, in percentage-points.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
                <h3 className="font-heading font-semibold mb-4">Adoption Performance Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {distributionData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px', background: 'hsl(var(--card))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
                <h3 className="font-heading font-semibold mb-4">Distribution Breakdown</h3>
                <div className="space-y-4">
                  {distributionData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-sm flex-1">{d.name}</span>
                      <span className="font-heading font-bold text-lg">{d.value}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {userTable.length ? Math.round((d.value / userTable.length) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-border space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total users scored</span>
                    <span className="font-semibold">{userTable.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg ΔA (performance gap)</span>
                    <span className="font-semibold">
                      {userTable.length
                        ? `${Math.round(userTable.reduce((a: number, u: any) => a + u.deltaA, 0) / userTable.length)} pp`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
              <h3 className="font-heading font-semibold mb-4">Individual User Scores</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Team</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Persona</th>
                      {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                        <th key={idx.key} className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">{idx.label}</th>
                      ))}
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Ideal</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase" title="Adoption performance: actual − ideal (pp)">ΔA</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTable.map((u: any) => {
                      const perfClass =
                        u.deltaA >= 5 ? 'bg-amp-success/10 text-amp-success' :
                        u.deltaA >= -5 ? 'bg-amp-info/10 text-amp-info' :
                        u.deltaA >= -15 ? 'bg-amp-warning/10 text-amp-confidence' :
                        'bg-amp-risk/10 text-amp-risk';
                      const perfLabel =
                        u.deltaA >= 5 ? 'Ahead' :
                        u.deltaA >= -5 ? 'On Track' :
                        u.deltaA >= -15 ? 'Behind' : 'At Risk';
                      const deltaClass = u.deltaA >= 0 ? 'text-amp-success' : u.deltaA >= -15 ? 'text-amp-warning' : 'text-amp-risk';
                      return (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/50">
                          <td className="py-2.5 px-3 font-medium">{u.name}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{u.team}</td>
                          <td className="py-2.5 px-3 text-muted-foreground capitalize">{u.persona}</td>
                          {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                            <td key={idx.key} className="py-2.5 px-3 text-right font-semibold" style={{ color: idx.color }}>
                              {u[idx.key]}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{u.ideal}</td>
                          <td className={`py-2.5 px-3 text-right font-semibold tabular-nums ${deltaClass}`}>
                            {u.deltaA > 0 ? '+' : ''}{u.deltaA}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${perfClass}`}>{perfLabel}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Analytics;
