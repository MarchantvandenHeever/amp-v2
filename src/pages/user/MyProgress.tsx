import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useScoreHistory, useScores, useAllJourneyItems, useAssignments, useJourneys, useInitiatives, getScoreLabel, getScoreColor } from '@/hooks/useSupabaseData';
import { useIdealAdoptionScore } from '@/hooks/useIdealAdoptionScore';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdoptionTrendChart from '@/components/charts/AdoptionTrendChart';
import { TrendingUp, CheckCircle2, Clock, Target, BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MyProgress: React.FC = () => {
  const { user } = useAuth();
  const { data: scoreHistory, isLoading: loadingHistory } = useScoreHistory();
  const { data: scores } = useScores();
  const { data: allItems, isLoading: loadingItems } = useAllJourneyItems();
  const { data: allAssignments, isLoading: loadingAssignments } = useAssignments();
  const { data: allJourneys } = useJourneys();
  const { data: initiatives } = useInitiatives();
  const { idealScore, journeyProgress, desiredTarget } = useIdealAdoptionScore(user?.id);

  if (!user) return null;

  const isLoading = loadingHistory || loadingItems || loadingAssignments;

  // User's assignments → journey IDs
  const userAssignments = (allAssignments || []).filter((a: any) => a.user_id === user.id);
  const userJourneyIds = userAssignments.map((a: any) => a.journey_id);
  const userItems = (allItems || []).filter((item: any) => userJourneyIds.includes(item.journey_id));
  const completedItems = userItems.filter((i: any) => i.status === 'completed');
  const inProgressItems = userItems.filter((i: any) => i.status === 'in_progress');
  const totalItems = userItems.length;

  console.log('[MyProgress] user.id:', user.id, 'assignments:', userAssignments.length, 'journeyIds:', userJourneyIds, 'userItems:', userItems.length, 'completed:', completedItems.length);

  // Parse durations
  const parseDuration = (d: string | null) => {
    if (!d) return 0;
    const match = d.match(/(\d+)\s*(m|h|min|hr|hour)/i);
    if (!match) return 15;
    const val = parseInt(match[1]);
    return match[2].startsWith('h') ? val * 60 : val;
  };

  const totalTimeSpent = completedItems.reduce((sum: number, i: any) => sum + parseDuration(i.duration), 0);
  const totalTimeRemaining = userItems.filter((i: any) => i.status !== 'completed').reduce((sum: number, i: any) => sum + parseDuration(i.duration), 0);

  // Score trend data — aggregate across initiatives by week label
  const userHistoryRaw = (scoreHistory || []).filter((s: any) => s.user_id === user.id);
  const byWeek: Record<string, { count: number; participation: number; ownership: number; confidence: number; adoption: number }> = {};
  userHistoryRaw.forEach((s: any) => {
    const week = s.week_label || 'W1';
    if (!byWeek[week]) byWeek[week] = { count: 0, participation: 0, ownership: 0, confidence: 0, adoption: 0 };
    byWeek[week].count++;
    byWeek[week].participation += Number(s.participation || 0);
    byWeek[week].ownership += Number(s.ownership || 0);
    byWeek[week].confidence += Number(s.confidence || 0);
    byWeek[week].adoption += Number(s.adoption || 0);
  });
  const userHistory = Object.entries(byWeek)
    .map(([week, v]) => {
      const m = week.match(/\d+/);
      const weekNum = m ? parseInt(m[0]) : 1;
      return {
        week,
        weekNum,
        participation: Math.round(v.participation / v.count),
        ownership: Math.round(v.ownership / v.count),
        confidence: Math.round(v.confidence / v.count),
        adoption: Math.round(v.adoption / v.count),
      };
    })
    .sort((a, b) => a.weekNum - b.weekNum);
  // Duration-based ideal adoption using initiative date ranges
  // Find the user's initiative date ranges via their journeys
  const userInitiativeIds = [...new Set((allJourneys || [])
    .filter((j: any) => userJourneyIds.includes(j.id) && j.initiative_id)
    .map((j: any) => j.initiative_id))];
  const userInits = (initiatives || []).filter((i: any) => userInitiativeIds.includes(i.id) && i.status === 'active');
  // Fallback to all active initiatives if user has none
  const relevantInits = userInits.length > 0 ? userInits : (initiatives || []).filter((i: any) => i.status === 'active');
  // Combined date range
  const starts = relevantInits.map((i: any) => i.start_date).filter(Boolean) as string[];
  const ends = relevantInits.map((i: any) => i.end_date).filter(Boolean) as string[];
  const combinedStartStr = starts.length ? starts.sort()[0] : null;
  const combinedEndStr = ends.length ? ends.sort().reverse()[0] : null;

  // Duration-based combined progress for truncating chart
  const combinedProgressValue = (() => {
    if (!combinedStartStr || !combinedEndStr) return 100;
    const startMs = new Date(combinedStartStr).getTime();
    const endMs = new Date(combinedEndStr).getTime();
    const totalDuration = endMs - startMs;
    if (totalDuration <= 0) return 100;
    return Math.min(100, Math.round(((Date.now() - startMs) / totalDuration) * 100));
  })();

  const userHistoryWithIdeal = userHistory.map(h => {
    let idealAdoption: number;
    if (combinedStartStr && combinedEndStr) {
      const startMs = new Date(combinedStartStr).getTime();
      const endMs = new Date(combinedEndStr).getTime();
      const totalDuration = endMs - startMs;
      // Each week label maps to a calendar date: start + weekNum * 7 days
      const weekDateMs = startMs + h.weekNum * 7 * 24 * 60 * 60 * 1000;
      const elapsed = Math.max(0, Math.min(weekDateMs - startMs, totalDuration));
      idealAdoption = totalDuration > 0 ? Math.round(desiredTarget * (elapsed / totalDuration)) : 0;
    } else {
      idealAdoption = 0;
    }
    return {
      week: h.week,
      participation: h.participation,
      ownership: h.ownership,
      confidence: h.confidence,
      adoption: h.adoption,
      idealAdoption,
    };
  });

  // Radar data
  const radarData = [
    { dimension: 'Participation', value: user.scores.participation, fullMark: 100 },
    { dimension: 'Ownership', value: user.scores.ownership, fullMark: 100 },
    { dimension: 'Confidence', value: user.scores.confidence, fullMark: 100 },
  ];

  // Completion by type
  const typeGroups: Record<string, { total: number; completed: number }> = {};
  userItems.forEach((item: any) => {
    const t = item.type || 'task';
    if (!typeGroups[t]) typeGroups[t] = { total: 0, completed: 0 };
    typeGroups[t].total++;
    if (item.status === 'completed') typeGroups[t].completed++;
  });
  const completionByType = Object.entries(typeGroups).map(([type, data]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    completed: data.completed,
    remaining: data.total - data.completed,
  }));

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
        <div>
          <h1 className="font-heading text-2xl font-bold">My Progress</h1>
          <p className="text-sm text-muted-foreground">Detailed view of your adoption journey and score breakdowns.</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-amp-adoption" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="font-heading text-2xl font-bold">{completedItems.length}<span className="text-sm text-muted-foreground font-normal">/{totalItems}</span></p>
            <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-amp-adoption" style={{ width: `${totalItems > 0 ? (completedItems.length / totalItems) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amp-participation" />
              <span className="text-xs text-muted-foreground">In Progress</span>
            </div>
            <p className="font-heading text-2xl font-bold">{inProgressItems.length}</p>
            <p className="text-[10px] text-muted-foreground mt-2">Active tasks</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amp-ownership" />
              <span className="text-xs text-muted-foreground">Time Invested</span>
            </div>
            <p className="font-heading text-2xl font-bold">{totalTimeSpent >= 60 ? `${Math.floor(totalTimeSpent / 60)}h ${totalTimeSpent % 60}m` : `${totalTimeSpent}m`}</p>
            <p className="text-[10px] text-muted-foreground mt-2">Completed items</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-amp-confidence" />
              <span className="text-xs text-muted-foreground">Time Remaining</span>
            </div>
            <p className="font-heading text-2xl font-bold">{totalTimeRemaining >= 60 ? `${Math.floor(totalTimeRemaining / 60)}h ${totalTimeRemaining % 60}m` : `${totalTimeRemaining}m`}</p>
            <p className="text-[10px] text-muted-foreground mt-2">To complete all</p>
          </div>
        </div>

        {/* Scores + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 amp-shadow-card flex flex-col items-center justify-center">
            <AdoptionScoreRing score={user.scores.adoption} size={160} idealScore={idealScore} />
            <p className="text-sm font-semibold mt-3">Adoption Score</p>
            <p className={cn("text-xs font-medium mt-0.5", getScoreColor(user.scores.adoption))}>{getScoreLabel(user.scores.adoption)}</p>
          </div>
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5 amp-shadow-card">
            <h3 className="font-heading font-semibold mb-3 text-sm">Score Breakdown</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <ScoreCard label="Participation" score={user.scores.participation} color="participation" size="sm" />
              <ScoreCard label="Ownership" score={user.scores.ownership} color="ownership" size="sm" />
              <ScoreCard label="Confidence" score={user.scores.confidence} color="confidence" size="sm" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar dataKey="value" stroke="hsl(var(--amp-adoption))" fill="hsl(var(--amp-adoption))" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Chart */}
        {userHistoryWithIdeal.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
            <h3 className="font-heading font-semibold mb-4">Score Trend Over Time</h3>
            <AdoptionTrendChart data={userHistoryWithIdeal} height={280} progress={combinedProgressValue} />
          </div>
        )}

        {/* Completion by Type */}
        {completionByType.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
            <h3 className="font-heading font-semibold mb-4">Completion by Activity Type</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={completionByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                <Bar dataKey="completed" stackId="a" fill="hsl(var(--amp-adoption))" radius={[0, 0, 0, 0]} name="Completed" />
                <Bar dataKey="remaining" stackId="a" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Recent Completions</h3>
          {completedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed items yet. Start your journey!</p>
          ) : (
            <div className="space-y-2">
              {completedItems.slice(-10).reverse().map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-amp-adoption shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.type} · {item.duration || '15m'}</p>
                  </div>
                  {item.completed_date && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(item.completed_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MyProgress;
