import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useBadges, useUserBadges, useScoreHistory, getTierFromPoints, getScoreLabel } from '@/hooks/useSupabaseData';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Star, Award, TrendingUp, Loader2 } from 'lucide-react';

const MyProgress: React.FC = () => {
  const { user } = useAuth();
  const { data: allBadges, isLoading: loadingBadges } = useBadges();
  const { data: userBadges } = useUserBadges(user?.id);
  const { data: scoreHistory, isLoading: loadingHistory } = useScoreHistory();

  if (!user) return null;

  const tier = getTierFromPoints(user.points);
  const earnedBadgeIds = (userBadges || []).map((ub: any) => ub.badge_id);
  const badges = allBadges || [];

  // Build personal trend from score_history
  const userHistory = (scoreHistory || [])
    .filter(s => s.user_id === user.id)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map(s => ({
      week: s.week_label || '',
      participation: Number(s.participation || 0),
      ownership: Number(s.ownership || 0),
      confidence: Number(s.confidence || 0),
      adoption: Number(s.adoption || 0),
    }));

  const isLoading = loadingBadges || loadingHistory;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

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
            <p className="font-heading text-2xl font-bold">{earnedBadgeIds.length}</p>
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
        {userHistory.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
            <h3 className="font-heading font-semibold mb-4">Your Adoption Journey</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userHistory}>
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
        )}

        {/* Badges */}
        <div>
          <h3 className="font-heading font-semibold mb-3">Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {badges.map(badge => {
              const earned = earnedBadgeIds.includes(badge.id);
              return (
                <div key={badge.id} className={`bg-card border border-border rounded-xl p-4 text-center amp-shadow-card transition-opacity ${!earned ? 'opacity-25' : ''}`}>
                  <span className="text-3xl block mb-2">{badge.icon || '🏅'}</span>
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
