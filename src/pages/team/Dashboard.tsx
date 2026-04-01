import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing, ScoreRow } from '@/components/scores/ScoreCard';
import { useAuth } from '@/contexts/AuthContext';
import { endUsers, riskFlags } from '@/data/mockData';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TeamDashboard: React.FC = () => {
  const { user } = useAuth();
  const teamName = user?.team || 'Sales';
  const teamMembers = endUsers.filter(u => u.team === teamName);
  const teamRisks = riskFlags.filter(r => r.team === teamName);

  const avgScore = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
    Math.round(teamMembers.reduce((s, u) => s + u.scores[key], 0) / (teamMembers.length || 1));

  const chartData = teamMembers.map(u => ({
    name: u.name.split(' ')[0],
    participation: u.scores.participation,
    ownership: u.scores.ownership,
    confidence: u.scores.confidence,
  }));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">{teamName} Team Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{teamMembers.length} team members · {teamRisks.length} risk flags</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card flex flex-col items-center">
            <AdoptionScoreRing score={avgScore('adoption')} />
            <p className="text-xs text-muted-foreground mt-2">Team Adoption</p>
          </div>
          <ScoreCard label="Participation" score={avgScore('participation')} color="participation" />
          <ScoreCard label="Ownership" score={avgScore('ownership')} color="ownership" />
          <ScoreCard label="Confidence" score={avgScore('confidence')} color="confidence" />
        </div>

        {/* Member comparison chart */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Member Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
              <Bar dataKey="participation" fill="hsl(var(--amp-participation))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ownership" fill="hsl(var(--amp-ownership))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="confidence" fill="hsl(var(--amp-confidence))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member list */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Team Members</h3>
          <div className="space-y-3">
            {teamMembers.sort((a, b) => b.scores.adoption - a.scores.adoption).map((member, i) => (
              <motion.div key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-xs font-semibold">{member.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.persona} · {member.streak} day streak · {member.points} pts</p>
                </div>
                <div className="hidden md:flex gap-4 items-center">
                  <ScoreRow label="Participation" score={member.scores.participation} color="bg-amp-participation" />
                  <ScoreRow label="Ownership" score={member.scores.ownership} color="bg-amp-ownership" />
                  <ScoreRow label="Confidence" score={member.scores.confidence} color="bg-amp-confidence" />
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-heading font-bold text-amp-adoption">{member.scores.adoption}</p>
                  <p className="text-[10px] text-muted-foreground">adoption</p>
                </div>
                {member.riskFlags && member.riskFlags.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amp-risk/10 text-amp-risk font-medium shrink-0">risk</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TeamDashboard;
