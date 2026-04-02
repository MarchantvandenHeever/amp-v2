import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { endUsers, initiatives, riskFlags, scoreTrends, teamComparison } from '@/data/mockData';
import type { InitiativeOption } from '@/components/charts/AdoptionTrendChart';
import { motion } from 'framer-motion';
import { Users, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AdoptionTrendChart from '@/components/charts/AdoptionTrendChart';

const avgScore = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
  Math.round(endUsers.reduce((s, u) => s + u.scores[key], 0) / endUsers.length);

const SuperAdminDashboard: React.FC = () => {
  const stats = [
    { label: 'Total Users', value: endUsers.length, icon: Users, color: 'bg-amp-participation/10 text-amp-participation' },
    { label: 'Active Initiatives', value: initiatives.filter(i => i.status === 'active').length, icon: Target, color: 'bg-amp-ownership/10 text-amp-ownership' },
    { label: 'Risk Flags', value: riskFlags.filter(r => r.severity === 'high').length, icon: AlertTriangle, color: 'bg-amp-risk/10 text-amp-risk' },
    { label: 'Avg Adoption', value: `${avgScore('adoption')}%`, icon: TrendingUp, color: 'bg-amp-adoption/10 text-amp-adoption' },
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
          <ScoreCard label="Participation" score={avgScore('participation')} color="participation" trend={5} />
          <ScoreCard label="Ownership" score={avgScore('ownership')} color="ownership" trend={3} />
          <ScoreCard label="Confidence" score={avgScore('confidence')} color="confidence" trend={2} />
        </div>

        {/* Trend Chart */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Adoption Trend</h3>
          <AdoptionTrendChart
            data={scoreTrends}
            height={280}
            initiatives={initiatives.filter(i => i.status === 'active').map(i => ({ id: i.id, name: i.name, progress: i.progress }))}
            progress={Math.round(initiatives.filter(i => i.status === 'active').reduce((s, i) => s + i.progress, 0) / Math.max(1, initiatives.filter(i => i.status === 'active').length))}
          />
        </div>

        {/* Team Comparison */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Team Comparison</h3>
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
        </div>

        {/* Risk flags */}
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
                {riskFlags.map(flag => (
                  <tr key={flag.id} className="border-b border-border/50 hover:bg-secondary/50">
                    <td className="py-2.5 px-3 font-medium">{flag.userName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{flag.team}</td>
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SuperAdminDashboard;
