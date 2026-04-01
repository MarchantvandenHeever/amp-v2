import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { allBadges, getTierFromPoints, getScoreLabel } from '@/data/mockData';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Star, Award, TrendingUp } from 'lucide-react';

// Simulated personal trend data
const personalTrend = [
  { week: 'W1', participation: 30, ownership: 15, confidence: 25, adoption: 22 },
  { week: 'W3', participation: 50, ownership: 35, confidence: 40, adoption: 38 },
  { week: 'W5', participation: 65, ownership: 50, confidence: 50, adoption: 51 },
  { week: 'W7', participation: 75, ownership: 62, confidence: 58, adoption: 62 },
  { week: 'W9', participation: 82, ownership: 70, confidence: 65, adoption: 69 },
  { week: 'W10', participation: 85, ownership: 75, confidence: 70, adoption: 74 },
];

const MyProgress: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const tier = getTierFromPoints(user.points);
  const earnedBadges = allBadges.filter(b => user.badges.includes(b.name));

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="font-heading text-2xl font-bold">My Progress</h1>
        <p className="text-sm text-muted-foreground">Adoption is evidenced through behaviour. Here's your journey so far.</p>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <Flame className="w-5 h-5 text-amp-confidence mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold">{user.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <Star className="w-5 h-5 text-amp-confidence mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold">{user.points}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <Award className="w-5 h-5 text-amp-ownership mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold">{earnedBadges.length}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <TrendingUp className="w-5 h-5 text-amp-adoption mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold">{tier}</p>
            <p className="text-xs text-muted-foreground">Current Tier</p>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card flex flex-col items-center">
            <AdoptionScoreRing score={user.scores.adoption} size={130} />
            <p className="text-xs text-muted-foreground mt-2">{getScoreLabel(user.scores.adoption)}</p>
          </div>
          <ScoreCard label="Participation" score={user.scores.participation} color="participation" />
          <ScoreCard label="Ownership" score={user.scores.ownership} color="ownership" />
          <ScoreCard label="Confidence" score={user.scores.confidence} color="confidence" />
        </div>

        {/* Trend */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Your Adoption Journey</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={personalTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
              <Line type="monotone" dataKey="adoption" stroke="hsl(var(--amp-adoption))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="participation" stroke="hsl(var(--amp-participation))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="ownership" stroke="hsl(var(--amp-ownership))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="confidence" stroke="hsl(var(--amp-confidence))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Badges */}
        <div>
          <h3 className="font-heading font-semibold mb-3">Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {allBadges.map(badge => {
              const earned = user.badges.includes(badge.name);
              return (
                <div key={badge.id} className={`bg-card border border-border rounded-xl p-4 text-center amp-shadow-card transition-opacity ${!earned ? 'opacity-25' : ''}`}>
                  <span className="text-3xl block mb-2">{badge.icon}</span>
                  <p className="text-xs font-semibold">{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MyProgress;
