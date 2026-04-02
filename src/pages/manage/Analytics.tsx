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

  // Compute averages
  const avgScores = useMemo(() => {
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

  // Trend data (score_history by week)
  const trendData = useMemo(() => {
    if (!scoreHistory?.length) return [];
    const filtered = selectedInitiative === 'all' ? scoreHistory : scoreHistory.filter(s => s.initiative_id === selectedInitiative);
    const byWeek: Record<string, { count: number; participation: number; ownership: number; confidence: number; adoption: number }> = {};
    filtered.forEach(r => {
      const week = r.week_label || 'Unknown';
      if (!byWeek[week]) byWeek[week] = { count: 0, participation: 0, ownership: 0, confidence: 0, adoption: 0 };
      byWeek[week].count++;
      byWeek[week].participation += Number(r.participation) || 0;
      byWeek[week].ownership += Number(r.ownership) || 0;
      byWeek[week].confidence += Number(r.confidence) || 0;
      byWeek[week].adoption += Number(r.adoption) || 0;
    });
    const totalWeeks = Object.keys(byWeek).length;
    return Object.entries(byWeek).map(([week, v], idx) => ({
      week,
      participation: Math.round(v.participation / v.count),
      ownership: Math.round(v.ownership / v.count),
      confidence: Math.round(v.confidence / v.count),
      adoption: Math.round(v.adoption / v.count),
      idealAdoption: totalWeeks > 0 ? Math.round(desiredTarget * ((idx + 1) / totalWeeks)) : 0,
    }));
  }, [scoreHistory, selectedInitiative]);

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
      groups[group].participation += Number(s.participation) || 0;
      groups[group].ownership += Number(s.ownership) || 0;
      groups[group].confidence += Number(s.confidence) || 0;
      groups[group].adoption += Number(s.adoption) || 0;
    });
    return Object.entries(groups).map(([name, v]) => ({
      name,
      participation: Math.round(v.participation / v.count),
      ownership: Math.round(v.ownership / v.count),
      confidence: Math.round(v.confidence / v.count),
      adoption: Math.round(v.adoption / v.count),
    }));
  }, [scores, profiles, selectedInitiative, groupBy]);

  // Individual user table
  const userTable = useMemo(() => {
    if (!scores?.length || !profiles?.length) return [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const filtered = selectedInitiative === 'all' ? scores : scores.filter(s => s.initiative_id === selectedInitiative);
    return filtered.map(s => {
      const profile = profileMap.get(s.user_id);
      return {
        id: s.user_id,
        name: profile?.display_name || 'Unknown',
        team: profile?.team || '—',
        persona: profile?.persona || '—',
        participation: Number(s.participation) || 0,
        ownership: Number(s.ownership) || 0,
        confidence: Number(s.confidence) || 0,
        adoption: Number(s.adoption) || 0,
        label: getScoreLabel(Number(s.adoption) || 0),
      };
    }).sort((a, b) => b.adoption - a.adoption);
  }, [scores, profiles, selectedInitiative]);

  // Radar data for overview
  const radarData = useMemo(() => {
    return INDICES.filter(i => selectedIndices.has(i.key)).map(i => ({
      index: i.label,
      score: avgScores[i.key],
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Behavioural adoption intelligence across your organisation</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedInitiative} onValueChange={setSelectedInitiative}>
              <SelectTrigger className="w-48">
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
        </div>

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
            {/* Line chart */}
            <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
              <h3 className="font-heading font-semibold mb-4">Score Trend Over Time</h3>
              {trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No trend data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trendData}>
                    <defs>
                      {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                        <linearGradient key={idx.key} id={`grad-${idx.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={idx.color} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={idx.color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px', background: 'hsl(var(--card))' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {INDICES.filter(i => selectedIndices.has(i.key)).map(idx => (
                      <Area key={idx.key} type="monotone" dataKey={idx.key} name={idx.label}
                        stroke={idx.color} strokeWidth={2} fill={`url(#grad-${idx.key})`} dot={false} />
                    ))}
                    {selectedIndices.has('adoption') && (
                      <Line type="monotone" dataKey="idealAdoption" name="Ideal Adoption" stroke="hsl(var(--amp-adoption))" strokeWidth={2} dot={false} strokeDasharray="6 4" opacity={0.4} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
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
                <AdoptionScoreRing score={avgScores.adoption} size={180} idealScore={currentIdeal} />
                <p className={`mt-3 text-sm font-semibold ${getScoreColor(avgScores.adoption)}`}>
                  {getScoreLabel(avgScores.adoption)}
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
