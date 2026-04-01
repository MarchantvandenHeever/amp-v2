import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing, ScoreRow } from '@/components/scores/ScoreCard';
import { useAuth } from '@/contexts/AuthContext';
import { useEndUsers, useRiskFlags, useScores } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TeamDashboard: React.FC = () => {
  const { user } = useAuth();
  const teamName = user?.team || 'Sales';
  const { data: allProfiles, isLoading: loadingProfiles } = useEndUsers();
  const { data: riskFlags } = useRiskFlags();
  const { data: scores, isLoading: loadingScores } = useScores();

  if (loadingProfiles || loadingScores) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const teamMembers = allProfiles?.filter(u => u.team === teamName) || [];
  const teamRisks = riskFlags?.filter(r => teamMembers.some(m => m.id === r.user_id)) || [];

  const teamScores = scores?.filter(s => teamMembers.some(m => m.id === s.user_id)) || [];
  const avgScore = (key: 'participation' | 'ownership' | 'confidence' | 'adoption') =>
    teamScores.length ? Math.round(teamScores.reduce((sum, s) => sum + Number(s[key] || 0), 0) / teamScores.length) : 0;

  const chartData = teamMembers.map(u => {
    const s = teamScores.find(sc => sc.user_id === u.id);
    return {
      name: u.display_name.split(' ')[0],
      participation: Number(s?.participation || 0),
      ownership: Number(s?.ownership || 0),
      confidence: Number(s?.confidence || 0),
    };
  });

  const membersWithScores = teamMembers.map(m => {
    const s = teamScores.find(sc => sc.user_id === m.id);
    return { ...m, scores: { participation: Number(s?.participation || 0), ownership: Number(s?.ownership || 0), confidence: Number(s?.confidence || 0), adoption: Number(s?.adoption || 0) } };
  }).sort((a, b) => b.scores.adoption - a.scores.adoption);

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

        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Team Members</h3>
          <div className="space-y-3">
            {membersWithScores.map((member, i) => {
              const hasRisk = riskFlags?.some(r => r.user_id === member.id);
              return (
                <motion.div key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground text-xs font-semibold">{member.display_name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{member.display_name}</p>
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
                  {hasRisk && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amp-risk/10 text-amp-risk font-medium shrink-0">risk</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TeamDashboard;
