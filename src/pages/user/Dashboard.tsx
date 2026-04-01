import React, { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { useAuth } from '@/contexts/AuthContext';
import { useJourneys, useAllJourneyItems, useAnnouncements, useBadges, useUserBadges, getTierFromPoints, getScoreLabel } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';
import { Target, Flame, Star, ChevronRight, Clock, CheckCircle2, Circle, Lock, Upload, MessageSquare, Loader2, CalendarDays, ListChecks } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';

const itemTypeIcon: Record<string, React.ElementType> = {
  content: Circle,
  activity: CheckCircle2,
  form: MessageSquare,
  confidence_check: Star,
  evidence_upload: Upload,
  reflection: MessageSquare,
  scenario: Target,
};

const EndUserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: journeys, isLoading: loadingJourneys } = useJourneys();
  const { data: allItems, isLoading: loadingItems } = useAllJourneyItems();
  const { data: announcements } = useAnnouncements();
  const { data: badges } = useBadges();
  const { data: userBadges } = useUserBadges(user?.id);

  // Derive today's tasks and upcoming tasks
  const { todayTasks, upcomingTasks } = useMemo(() => {
    if (!allItems) return { todayTasks: [], upcomingTasks: [] };
    const activeTasks = allItems.filter(i => i.status === 'available' || i.status === 'in_progress');
    const today: typeof activeTasks = [];
    const upcoming: typeof activeTasks = [];

    activeTasks.forEach(item => {
      if (item.due_date) {
        try {
          const d = parseISO(item.due_date);
          if (isToday(d)) { today.push(item); return; }
          if (isTomorrow(d) || isThisWeek(d)) { upcoming.push(item); return; }
        } catch {}
      }
      // Items with no date or past-due that are still active => today
      if (item.status === 'in_progress') today.push(item);
      else upcoming.push(item);
    });

    // If no items landed in today, move the first upcoming ones
    if (today.length === 0 && upcoming.length > 0) {
      today.push(...upcoming.splice(0, Math.min(3, upcoming.length)));
    }

    return { todayTasks: today.slice(0, 5), upcomingTasks: upcoming.slice(0, 5) };
  }, [allItems]);

  if (!user) return null;

  if (loadingJourneys || loadingItems) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const tier = getTierFromPoints(user.points);
  const activeJourneys = journeys?.filter(j => j.status === 'active') || [];
  const activeAnnouncements = announcements?.filter(a => a.active) || [];
  const totalCompleted = allItems?.filter(i => i.status === 'completed').length || 0;
  const totalItems = allItems?.length || 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="amp-gradient-hero rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
              <p className="text-primary-foreground/70 text-sm mt-1">Small actions build embedment. Keep going.</p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amp-confidence" />
                  <span className="font-heading font-bold text-lg">{user.streak}</span>
                </div>
                <p className="text-[10px] text-primary-foreground/60">day streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amp-confidence" />
                  <span className="font-heading font-bold text-lg">{user.points}</span>
                </div>
                <p className="text-[10px] text-primary-foreground/60">points</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-xs font-medium">
                {tier}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <AdoptionScoreRing score={user.scores.adoption} size={60} />
            <p className="text-[10px] text-muted-foreground mt-1">{getScoreLabel(user.scores.adoption)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <p className="font-heading text-2xl font-bold text-foreground">{todayTasks.length}</p>
            <p className="text-[10px] text-muted-foreground">Tasks Today</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <p className="font-heading text-2xl font-bold text-foreground">{activeJourneys.length}</p>
            <p className="text-[10px] text-muted-foreground">Active Journeys</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card text-center">
            <p className="font-heading text-2xl font-bold text-foreground">{totalCompleted}/{totalItems}</p>
            <p className="text-[10px] text-muted-foreground">Items Done</p>
          </div>
        </div>

        {/* Announcements */}
        {activeAnnouncements.length > 0 && (
          <div className="space-y-2">
            {activeAnnouncements.slice(0, 2).map(ann => (
              <div key={ann.id} className="bg-card border border-border rounded-xl p-4 amp-shadow-card flex items-start gap-3">
                <span className="text-lg">{ann.type === 'celebration' ? '🏆' : ann.type === 'action' ? '🚀' : '📋'}</span>
                <div>
                  <p className="text-sm font-semibold">{ann.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ann.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Today's Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold">Tasks for Today</h3>
          </div>
          {todayTasks.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center amp-shadow-card">
              <CheckCircle2 className="w-8 h-8 text-amp-success mx-auto mb-2" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No tasks due today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(item => {
                const Icon = itemTypeIcon[item.type] || Circle;
                return (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4 amp-shadow-card flex items-center gap-3 hover:amp-shadow-card-hover transition-shadow">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.type.replace('_', ' ')} · {item.duration || '5 min'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(item.contributes_to as string[] || []).map(c => (
                        <span key={c} className={`w-2 h-2 rounded-full ${
                          c === 'participation' ? 'bg-amp-participation' :
                          c === 'ownership' ? 'bg-amp-ownership' : 'bg-amp-confidence'
                        }`} title={c} />
                      ))}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'in_progress' ? 'bg-amp-info/10 text-amp-info' : 'bg-primary/10 text-primary'
                      }`}>{item.status === 'in_progress' ? 'In Progress' : 'Ready'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-heading font-semibold text-muted-foreground">Coming Up</h3>
            </div>
            <div className="space-y-1.5">
              {upcomingTasks.map(item => {
                const Icon = itemTypeIcon[item.type] || Circle;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-secondary/40 text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.duration || '5 min'}</span>
                    {item.due_date && (
                      <span className="text-xs text-muted-foreground">{format(parseISO(item.due_date), 'MMM d')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Journeys Summary */}
        <div>
          <h3 className="font-heading font-semibold mb-3">Your Active Journeys</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeJourneys.map(journey => {
              const journeyItems = allItems?.filter(i => i.journey_id === journey.id) || [];
              const completed = journeyItems.filter(i => i.status === 'completed').length;
              const nextItem = journeyItems.find(i => i.status === 'in_progress' || i.status === 'available');
              return (
                <motion.div key={journey.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">{journey.name}</h4>
                    <span className="text-xs text-muted-foreground">{completed}/{journeyItems.length}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amp-adoption" style={{ width: `${journey.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold">{journey.progress}%</span>
                  </div>
                  {nextItem && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3" />
                      <span>Next: {nextItem.title}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 className="font-heading font-semibold mb-3">Recent Achievements</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {badges?.slice(0, 6).map(badge => {
              const earned = user.badges.includes(badge.name);
              return (
                <div key={badge.id} className={`bg-card border border-border rounded-xl p-3 text-center amp-shadow-card shrink-0 w-20 ${!earned ? 'opacity-25' : ''}`}>
                  <span className="text-xl block mb-1">{badge.icon}</span>
                  <p className="text-[10px] font-semibold truncate">{badge.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default EndUserDashboard;
