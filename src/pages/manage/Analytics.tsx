import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useScores, useScoreHistory, useProfiles, useInitiatives, useRiskFlags, getAdoptionScore, getScoreLabel, getScoreColor } from '@/hooks/useSupabaseData';
import { useScoringConfig } from '@/hooks/useScoringConfig';
import { useIdealAdoptionScore } from '@/hooks/useIdealAdoptionScore';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import AdoptionTrendChart from '@/components/charts/AdoptionTrendChart';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, AlertTriangle, BarChart3 } from 'lucide-react';
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
  const { data: profiles } = useProfiles();
  const { data: initiatives } = useInitiatives();
  const { data: riskFlags } = useRiskFlags();
  const { idealScore: currentIdeal, desiredTarget } = useIdealAdoptionScore();

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

  // Pillar averages — use the same p-weighted (_dashboard) columns as Overview, with raw*TP fallback.
  const avgScoresRaw = useMemo(() => {
    if (!scores?.length) return { participation: 0, ownership: 0, confidence: 0, adoption: 0 };
    const filtered = selectedInitiative === 'all' ? scores : scores.filter(s => s.initiative_id === selectedInitiative);
    if (!filtered.length) return { participation: 0, ownership: 0, confidence: 0, adoption: 0 };
    return {
      participation: Math.round(filtered.reduce((s, r) => s + (Number(r.participation) || 0), 0) / filtered.length),
      ownership: Math.round(filtered.reduce((s, r) => s + (Number(r.ownership) || 0), 0) / filtered.length),
      confidence: Math.round(filtered.reduce((s, r) => s + (Number(r.confidence) || 0), 0) / filtered.length),
      adoption: Math.round(filtered.reduce((s, r) => s + (Number(r.adoption) || 0), 0) / filtered.length),
    };
  }, [scores, selectedInitiative]);

  const avgScores = useMemo(() => {
    if (!scores?.length) return { participation: 0, ownership: 0, confidence: 0, adoption: 0 };
    const filtered = selectedInitiative === 'all' ? scores : scores.filter(s => s.initiative_id === selectedInitiative);
    if (!filtered.length) return { participation: 0, ownership: 0, confidence: 0, adoption: 0 };
    const avg = (k: 'participation' | 'ownership' | 'confidence' | 'adoption') => {
      const dashKey = `${k}_dashboard` as const;
      const sum = filtered.reduce((acc, r: any) => {
        const v = r[dashKey];
        const fallback = (Number(r[k]) || 0) * currentTP;
        return acc + Number(v ?? fallback);
      }, 0);
      return Math.round(sum / filtered.length);
    };
    return {
      participation: avg('participation'),
      ownership: avg('ownership'),
      confidence: avg('confidence'),
      adoption: avg('adoption'),
    };
  }, [scores, selectedInitiative, currentTP]);

  // Duration-based helper: compute timeProgressRatio from initiative dates for a given week's recorded_at
  const getInitDateRange = (initId?: string) => {
    if (initId && initId !== 'all') {
      const init = activeInits.find(i => i.id === initId);
      return { start: init?.start_date, end: init?.end_date };
    }
    // Combined: earliest start, latest end
    const starts = activeInits.map(i => i.start_date).filter(Boolean) as string[];
    const ends = activeInits.map(i => i.end_date).filter(Boolean) as string[];
    return {
      start: starts.length ? starts.sort()[0] : undefined,
      end: ends.length ? ends.sort().reverse()[0] : undefined,
    };
  };

  const computeIdealAtWeek = (weekNum: number, totalDataWeeks: number, startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return Math.round(desiredTarget * (weekNum / totalDataWeeks));
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const totalDuration = end - start;
    if (totalDuration <= 0) return 0;
    // Each week represents an equal slice of the total planned duration
    const timeProgressRatio = Math.min(weekNum / totalDataWeeks, 1);
    // But we need to map weekNum to actual elapsed time
    // weekNum / totalDataWeeks gives us how far through the data we are
    // We need to map to actual calendar time using start/end dates
    const weekDate = new Date(start + (weekNum / totalDataWeeks) * totalDuration);
    const elapsed = Math.max(0, Math.min(weekDate.getTime() - start, totalDuration));
    return Math.round(desiredTarget * (elapsed / totalDuration));
  };

  // Build trend data from score_history
  const buildTrendFromHistory = (filtered: any[], startDate?: string, endDate?: string) => {
    const byWeek: Record<string, { count: number; participation: number; ownership: number; confidence: number; adoption: number; earliestDate: string }> = {};
    filtered.forEach(r => {
      const week = r.week_label || 'Unknown';
      if (!byWeek[week]) byWeek[week] = { count: 0, participation: 0, ownership: 0, confidence: 0, adoption: 0, earliestDate: r.recorded_at };
      byWeek[week].count++;
      byWeek[week].participation += Number(r.participation) || 0;
      byWeek[week].ownership += Number(r.ownership) || 0;
      byWeek[week].confidence += Number(r.confidence) || 0;
      byWeek[week].adoption += Number(r.adoption) || 0;
      if (r.recorded_at < byWeek[week].earliestDate) byWeek[week].earliestDate = r.recorded_at;
    });
    const weekEntries = Object.entries(byWeek);
    const startMs = startDate ? new Date(startDate).getTime() : 0;
    const endMs = endDate ? new Date(endDate).getTime() : 0;
    const totalDuration = endMs - startMs;

    return weekEntries.map(([week, v]) => {
      const m = week.match(/\d+/);
      const weekNum = m ? parseInt(m[0]) : 1;
      return { week, weekNum, v };
    }).sort((a, b) => a.weekNum - b.weekNum).map((entry) => {
      const { week, weekNum, v } = entry;
      // Calendar-based TP: weekNum weeks from start
      let weekTP = 0;
      if (totalDuration > 0) {
        const weekDateMs = startMs + weekNum * 7 * 24 * 60 * 60 * 1000;
        const elapsed = Math.max(0, Math.min(weekDateMs - startMs, totalDuration));
        weekTP = elapsed / totalDuration;
      }
      return {
        week,
        participation: Math.round((v.participation / v.count) * weekTP),
        ownership: Math.round((v.ownership / v.count) * weekTP),
        confidence: Math.round((v.confidence / v.count) * weekTP),
        adoption: Math.round((v.adoption / v.count) * weekTP),
        idealAdoption: Math.round(desiredTarget * weekTP),
      };
    });
  };

  // Trend data (score_history by week)
  const trendData = useMemo(() => {
    if (!scoreHistory?.length) return [];
    const filtered = selectedInitiative === 'all' ? scoreHistory : scoreHistory.filter(s => s.initiative_id === selectedInitiative);
    const { start, end } = getInitDateRange(selectedInitiative);
    return buildTrendFromHistory(filtered, start, end);
  }, [scoreHistory, selectedInitiative, desiredTarget, activeInits]);

  const visibleTrendData = useMemo(() => {
    if (!trendData.length) return trendData;
    if (selectedInitiativeProgress >= 100) return trendData;
    const cutoffIndex = Math.max(1, Math.ceil((selectedInitiativeProgress / 100) * trendData.length));
    return trendData.slice(0, cutoffIndex);
  }, [trendData, selectedInitiativeProgress]);

  const currentTrendPoint = visibleTrendData[visibleTrendData.length - 1] ?? {
    participation: avgScores.participation,
    ownership: avgScores.ownership,
    confidence: avgScores.confidence,
    adoption: avgScores.adoption,
    idealAdoption: currentIdeal,
  };

  const perInitiativeTrendData = useMemo(() => {
    if (!scoreHistory?.length) return {} as Record<string, any[]>;
    const result: Record<string, any[]> = {};
    activeInits.forEach(init => {
      const filtered = scoreHistory.filter(s => s.initiative_id === init.id);
      result[init.id] = buildTrendFromHistory(filtered, init.start_date ?? undefined, init.end_date ?? undefined);
    });
    return result;
  }, [scoreHistory, activeInits, desiredTarget]);

  // Helper: read p-weighted (_dashboard) value with raw*TP fallback (matches Overview)
  const dashVal = (row: any, k: 'participation' | 'ownership' | 'confidence' | 'adoption') => {
    const v = row[`${k}_dashboard`];
    return Number(v ?? (Number(row[k]) || 0) * currentTP);
  };

  // Group breakdown (by team or persona)
  const groupData = useMemo(() => {
    if (!scores?.length || !profiles?.length) return [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const groups: Record<string, { count: number; participation: number; ownership: number; confidence: number; adoption: number }> = {};
    const filtered = selectedInitiative === 'all' ? scores : scores.filter(s => s.initiative_id === selectedInitiative);
    filtered.forEach(s => {
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
  }, [scores, profiles, selectedInitiative, groupBy, currentTP]);

  // Individual user table
  const userTable = useMemo(() => {
    if (!scores?.length || !profiles?.length) return [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const filtered = selectedInitiative === 'all' ? scores : scores.filter(s => s.initiative_id === selectedInitiative);
    return filtered.map(s => {
      const profile = profileMap.get(s.user_id);
      const adoption = Math.round(dashVal(s, 'adoption'));
      return {
        id: s.user_id,
        name: profile?.display_name || 'Unknown',
        team: profile?.team || '—',
        persona: profile?.persona || '—',
        participation: Math.round(dashVal(s, 'participation')),
        ownership: Math.round(dashVal(s, 'ownership')),
        confidence: Math.round(dashVal(s, 'confidence')),
        adoption,
        label: getScoreLabel(adoption),
      };
    }).sort((a, b) => b.adoption - a.adoption);
  }, [scores, profiles, selectedInitiative, currentTP]);

  // Radar data for overview
  const radarData = useMemo(() => {
    return INDICES.filter(i => selectedIndices.has(i.key)).map(i => ({
      index: i.label,
      score: currentTrendPoint[i.key],
      fullMark: 100,
    }));
  }, [avgScores, selectedIndices]);

  // Distribution data for pie chart
  const distributionData = useMemo(() => {
    if (!userTable.length) return [];
    const buckets = { 'Strong (80+)': 0, 'Developing (60-79)': 0, 'Emerging (40-59)': 0, 'At Risk (<40)': 0 };
    userTable.forEach(u => {
      if (u.adoption >= 80) buckets['Strong (80+)']++;
      else if (u.adoption >= 60) buckets['Developing (60-79)']++;
      else if (u.adoption >= 40) buckets['Emerging (40-59)']++;
      else buckets['At Risk (<40)']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [userTable]);

  const PIE_COLORS = ['hsl(var(--amp-adoption))', 'hsl(var(--amp-info))', 'hsl(var(--amp-warning))', 'hsl(var(--amp-risk))'];

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

          {/* DISTRIBUTION TAB */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
                <h3 className="font-heading font-semibold mb-4">Adoption Score Distribution</h3>
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
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total users scored</span>
                    <span className="font-semibold">{userTable.length}</span>
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
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTable.map(u => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="py-2.5 px-3 font-medium">{u.name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{u.team}</td>
                        <td className="py-2.5 px-3 text-muted-foreground capitalize">{u.persona}</td>
                        {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                          <td key={idx.key} className="py-2.5 px-3 text-right font-semibold" style={{ color: idx.color }}>
                            {u[idx.key]}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.adoption >= 80 ? 'bg-amp-success/10 text-amp-success' :
                            u.adoption >= 60 ? 'bg-amp-info/10 text-amp-info' :
                            u.adoption >= 40 ? 'bg-amp-warning/10 text-amp-confidence' :
                            'bg-amp-risk/10 text-amp-risk'
                          }`}>{u.label}</span>
                        </td>
                      </tr>
                    ))}
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
