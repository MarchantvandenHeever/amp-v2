import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, TrendingUp, Flame, Star, Crown, Zap } from 'lucide-react';
import { useProfiles, useScores, getTierFromPoints } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const tierConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Leader: { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  Owner: { icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  Contributor: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  Starter: { icon: Award, color: 'text-muted-foreground', bg: 'bg-muted/50' },
};

const rankIcons = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20 border-yellow-400/30' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-gradient-to-br from-slate-300/20 to-slate-400/20 border-slate-300/30' },
  { icon: Medal, color: 'text-amber-600', bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: scores } = useScores();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'points' | 'adoption' | 'streak'>('points');

  const endUsers = (profiles || []).filter(p => p.role === 'end_user');
  const teams = [...new Set(endUsers.map(p => p.team).filter(Boolean))];

  const filtered = teamFilter === 'all' ? endUsers : endUsers.filter(p => p.team === teamFilter);

  const scoreMap = new Map((scores || []).map(s => [s.user_id, s]));

  const ranked = [...filtered].map(p => {
    const s = scoreMap.get(p.id);
    const adoption = s ? Number(s.adoption || 0) : 0;
    return { ...p, adoption, tier: getTierFromPoints(p.points || 0) };
  }).sort((a, b) => {
    if (sortBy === 'points') return (b.points || 0) - (a.points || 0);
    if (sortBy === 'adoption') return b.adoption - a.adoption;
    return (b.streak || 0) - (a.streak || 0);
  });

  const currentUserRank = ranked.findIndex(p => p.id === user?.id) + 1;
  const currentUserData = ranked.find(p => p.id === user?.id);

  if (profilesLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">See how you stack up against your peers. Healthy competition drives adoption!</p>
        </div>

        {/* Current user highlight */}
        {currentUserData && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                #{currentUserRank}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{currentUserData.display_name} <span className="text-muted-foreground font-normal">(You)</span></p>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{currentUserData.points || 0} pts</span>
                  <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-500" />{currentUserData.streak || 0} day streak</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{currentUserData.adoption.toFixed(0)}% adoption</span>
                </div>
              </div>
              <Badge variant="outline" className={cn(tierConfig[currentUserData.tier]?.bg, tierConfig[currentUserData.tier]?.color, 'border')}>
                {currentUserData.tier}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points">Sort by Points</SelectItem>
              <SelectItem value="adoption">Sort by Adoption Score</SelectItem>
              <SelectItem value="streak">Sort by Streak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="full" className="space-y-4">
          <TabsList>
            <TabsTrigger value="full">Full Rankings</TabsTrigger>
            <TabsTrigger value="teams">By Team</TabsTrigger>
          </TabsList>

          <TabsContent value="full">
            {/* Top 3 podium */}
            {ranked.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 0, 2].map(idx => {
                  const p = ranked[idx];
                  if (!p) return null;
                  const rank = idx + 1;
                  const ri = rankIcons[idx] || rankIcons[2];
                  const RankIcon = ri.icon;
                  return (
                    <Card key={p.id} className={cn('text-center border', ri.bg, idx === 0 && 'row-start-1 col-start-2 -mt-4')}>
                      <CardContent className="pt-6 pb-4">
                        <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                          <RankIcon className={cn('w-7 h-7', ri.color)} />
                        </div>
                        <p className="font-semibold text-foreground">{p.display_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.team || 'No team'}</p>
                        <div className="mt-3 flex items-center justify-center gap-2">
                          <span className="text-lg font-bold text-foreground">{p.points || 0}</span>
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-500" />{p.streak || 0}d</span>
                          <span>{p.adoption.toFixed(0)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Participants</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {ranked.map((p, i) => {
                    const tier = tierConfig[p.tier] || tierConfig.Starter;
                    const TierIcon = tier.icon;
                    const isCurrentUser = p.id === user?.id;
                    return (
                      <div key={p.id} className={cn('flex items-center gap-4 px-6 py-3 transition-colors', isCurrentUser && 'bg-primary/5')}>
                        <span className={cn('w-8 text-center font-bold text-sm', i < 3 ? 'text-primary' : 'text-muted-foreground')}>
                          {i + 1}
                        </span>
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                          {p.display_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {p.display_name} {isCurrentUser && <span className="text-primary text-xs">(You)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{p.team || 'No team'}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Flame className="w-3 h-3 text-orange-500" />{p.streak || 0}d
                        </div>
                        <div className="text-right w-20">
                          <p className="font-semibold text-sm text-foreground">{p.points || 0} pts</p>
                          <p className="text-xs text-muted-foreground">{p.adoption.toFixed(0)}% adopt.</p>
                        </div>
                        <Badge variant="outline" className={cn(tier.bg, tier.color, 'text-xs border')}>
                          <TierIcon className="w-3 h-3 mr-1" />{p.tier}
                        </Badge>
                      </div>
                    );
                  })}
                  {ranked.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">No participants found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <div className="grid gap-4 md:grid-cols-2">
              {teams.map(team => {
                const teamUsers = ranked.filter(p => p.team === team);
                const avgPoints = teamUsers.length ? Math.round(teamUsers.reduce((s, p) => s + (p.points || 0), 0) / teamUsers.length) : 0;
                const avgAdoption = teamUsers.length ? teamUsers.reduce((s, p) => s + p.adoption, 0) / teamUsers.length : 0;
                return (
                  <Card key={team}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{team}</CardTitle>
                        <div className="text-xs text-muted-foreground">{teamUsers.length} members</div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>Avg: {avgPoints} pts</span>
                        <span>{avgAdoption.toFixed(0)}% adoption</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {teamUsers.slice(0, 5).map((p, i) => (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                            <span className="w-6 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.display_name}</p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">{p.points || 0}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
