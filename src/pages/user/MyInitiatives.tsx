import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useInitiatives, useJourneys, useAllJourneyItems, useJourneyPhases } from '@/hooks/useSupabaseData';
import { GanttChart } from '@/components/journey/GanttChart';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Target, Clock, CheckCircle2, Circle, Lock, ChevronDown, ChevronRight,
  Loader2, Calendar, BarChart3, Layers, Route as RouteIcon, Timer
} from 'lucide-react';
import { parseISO, isToday, isThisWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const parseDurationMinutes = (d?: string | null): number => {
  if (!d) return 5;
  const m = d.match(/(\d+)/);
  const num = m ? parseInt(m[1]) : 5;
  if (d.includes('hour') || d.includes('hr')) return num * 60;
  return num; // assume minutes
};

const formatTime = (mins: number): string => {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
};

const statusIcon: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  in_progress: Circle,
  available: Circle,
  locked: Lock,
};

const statusStyle: Record<string, string> = {
  completed: 'text-amp-success',
  in_progress: 'text-amp-info',
  available: 'text-primary',
  locked: 'text-muted-foreground/40',
};

const MyInitiatives: React.FC = () => {
  const { user } = useAuth();
  const { data: initiatives, isLoading: li } = useInitiatives();
  const { data: journeys, isLoading: lj } = useJourneys();
  const { data: allItems, isLoading: lit } = useAllJourneyItems();
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month'>('today');
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'journeys' | 'phases' | 'gantt'>('journeys');

  // Fetch all phases
  const { data: allPhases } = useJourneyPhases();

  const activeInitiatives = useMemo(() => initiatives?.filter(i => i.status === 'active' || i.status === 'in_progress') || [], [initiatives]);
  const activeJourneys = useMemo(() => journeys?.filter(j => j.status === 'active') || [], [journeys]);

  // Time-filtered items for the summary
  const timeFilteredItems = useMemo(() => {
    if (!allItems) return [];
    const active = allItems.filter(i => i.status === 'available' || i.status === 'in_progress');

    if (timePeriod === 'today') {
      return active.filter(i => {
        if (!i.due_date) return i.status === 'in_progress';
        try { return isToday(parseISO(i.due_date)); } catch { return false; }
      });
    }
    if (timePeriod === 'week') {
      return active.filter(i => {
        if (!i.due_date) return true;
        try { return isThisWeek(parseISO(i.due_date)); } catch { return true; }
      });
    }
    // month
    const now = new Date();
    return active.filter(i => {
      if (!i.due_date) return true;
      try {
        return isWithinInterval(parseISO(i.due_date), { start: startOfMonth(now), end: endOfMonth(now) });
      } catch { return true; }
    });
  }, [allItems, timePeriod]);

  const totalTimeMinutes = useMemo(() => {
    return timeFilteredItems.reduce((sum, i) => sum + parseDurationMinutes(i.duration), 0);
  }, [timeFilteredItems]);

  if (!user) return null;
  if (li || lj || lit) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">My Initiatives</h1>
            <p className="text-sm text-muted-foreground">Detailed view of your active workstreams and time commitments</p>
          </div>
        </div>

        {/* Time Summary Bar */}
        <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Time Commitment</h3>
            </div>
            <Select value={timePeriod} onValueChange={(v: 'today' | 'week' | 'month') => setTimePeriod(v)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="font-heading text-2xl font-bold text-foreground">{formatTime(totalTimeMinutes)}</p>
              <p className="text-xs text-muted-foreground">Total Time Required</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="font-heading text-2xl font-bold text-foreground">{timeFilteredItems.length}</p>
              <p className="text-xs text-muted-foreground">Active Items</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="font-heading text-2xl font-bold text-foreground">{timeFilteredItems.filter(i => i.mandatory).length}</p>
              <p className="text-xs text-muted-foreground">Mandatory</p>
            </div>
          </div>

          {/* Item breakdown */}
          {timeFilteredItems.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {timeFilteredItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background text-sm">
                  <Circle className="w-3 h-3 text-primary shrink-0" />
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-muted-foreground font-medium">{item.duration || '5 min'}</span>
                  {item.mandatory && <Badge variant="outline" className="text-[9px] h-4">Required</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Tabs */}
        <Tabs value={activeView} onValueChange={(v: string) => setActiveView(v as any)}>
          <TabsList className="grid grid-cols-3 w-fit">
            <TabsTrigger value="journeys" className="gap-1.5 text-xs">
              <RouteIcon className="w-3.5 h-3.5" /> Journeys
            </TabsTrigger>
            <TabsTrigger value="phases" className="gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5" /> Phase View
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" /> Gantt View
            </TabsTrigger>
          </TabsList>

          {/* Journey View */}
          <TabsContent value="journeys" className="space-y-4 mt-4">
            {activeInitiatives.map(init => {
              const initJourneys = activeJourneys.filter(j => j.initiative_id === init.id);
              return (
                <div key={init.id} className="bg-card border border-border rounded-xl amp-shadow-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-secondary/20">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">{init.name}</h4>
                      <Badge variant="outline" className="text-[10px] h-5 ml-auto">{init.phase}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{init.description}</p>
                  </div>

                  {initJourneys.length === 0 && (
                    <div className="p-4 text-xs text-muted-foreground text-center">No active journeys for this initiative</div>
                  )}

                  {initJourneys.map(journey => {
                    const items = allItems?.filter(i => i.journey_id === journey.id) || [];
                    const completed = items.filter(i => i.status === 'completed').length;
                    const totalMin = items.reduce((s, i) => s + parseDurationMinutes(i.duration), 0);
                    const remainMin = items.filter(i => i.status !== 'completed').reduce((s, i) => s + parseDurationMinutes(i.duration), 0);
                    const isExpanded = expandedJourney === journey.id;

                    return (
                      <div key={journey.id} className="border-b border-border/50 last:border-0">
                        <button
                          onClick={() => setExpandedJourney(isExpanded ? null : journey.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <RouteIcon className="w-4 h-4 text-primary shrink-0" />
                          <span className="flex-1 text-sm font-medium">{journey.name}</span>
                          <span className="text-xs text-muted-foreground">{completed}/{items.length} done</span>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-amp-adoption" style={{ width: `${journey.progress}%` }} />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(remainMin)} left</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-1">
                            <div className="flex gap-4 text-xs text-muted-foreground mb-2 px-2">
                              <span>Total: {formatTime(totalMin)}</span>
                              <span>Remaining: {formatTime(remainMin)}</span>
                              <span>Completed: {formatTime(totalMin - remainMin)}</span>
                            </div>
                            {items.map(item => {
                              const Icon = statusIcon[item.status] || Circle;
                              const style = statusStyle[item.status] || '';
                              return (
                                <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${item.status === 'locked' ? 'opacity-40' : 'hover:bg-secondary/30'}`}>
                                  <Icon className={`w-4 h-4 shrink-0 ${style}`} />
                                  <span className={`flex-1 ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                                  <span className="text-xs text-muted-foreground">{item.duration || '5 min'}</span>
                                  {item.execution_mode === 'parallel' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amp-info/10 text-amp-info font-medium">∥</span>
                                  )}
                                  {item.mandatory && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amp-warning/10 text-amp-warning font-medium">req</span>}
                                  <div className="flex gap-1">
                                    {(item.contributes_to as string[] || []).map(c => (
                                      <span key={c} className={`w-1.5 h-1.5 rounded-full ${
                                        c === 'participation' ? 'bg-amp-participation' :
                                        c === 'ownership' ? 'bg-amp-ownership' : 'bg-amp-confidence'
                                      }`} />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Journeys without initiative */}
            {activeJourneys.filter(j => !j.initiative_id).length > 0 && (
              <div className="bg-card border border-border rounded-xl amp-shadow-card overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/20">
                  <h4 className="font-semibold text-sm">Other Journeys</h4>
                </div>
                {activeJourneys.filter(j => !j.initiative_id).map(journey => {
                  const items = allItems?.filter(i => i.journey_id === journey.id) || [];
                  const completed = items.filter(i => i.status === 'completed').length;
                  const remainMin = items.filter(i => i.status !== 'completed').reduce((s, i) => s + parseDurationMinutes(i.duration), 0);
                  const isExpanded = expandedJourney === journey.id;

                  return (
                    <div key={journey.id} className="border-b border-border/50 last:border-0">
                      <button
                        onClick={() => setExpandedJourney(isExpanded ? null : journey.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <span className="flex-1 text-sm font-medium">{journey.name}</span>
                        <span className="text-xs text-muted-foreground">{completed}/{items.length}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(remainMin)} left</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-1">
                          {items.map(item => {
                            const Icon = statusIcon[item.status] || Circle;
                            const style = statusStyle[item.status] || '';
                            return (
                              <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${item.status === 'locked' ? 'opacity-40' : ''}`}>
                                <Icon className={`w-4 h-4 shrink-0 ${style}`} />
                                <span className="flex-1">{item.title}</span>
                                <span className="text-xs text-muted-foreground">{item.duration || '5 min'}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Phase View */}
          <TabsContent value="phases" className="space-y-4 mt-4">
            {activeJourneys.map(journey => {
              const items = allItems?.filter(i => i.journey_id === journey.id) || [];
              const phases = allPhases || [];
              const journeyPhases = phases.filter(p => p.journey_id === journey.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

              // Items grouped by phase
              const phaseGroups = journeyPhases.map(phase => ({
                phase,
                items: items.filter(i => i.phase_id === phase.id),
              }));
              const noPhaseItems = items.filter(i => !i.phase_id);

              return (
                <div key={journey.id} className="bg-card border border-border rounded-xl amp-shadow-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h4 className="font-semibold text-sm">{journey.name}</h4>
                    <p className="text-xs text-muted-foreground">{journey.description}</p>
                  </div>

                  {phaseGroups.map(({ phase, items: phaseItems }) => (
                    <div key={phase.id} className="border-b border-border/50">
                      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20">
                        <span className={`w-2 h-2 rounded-full ${phase.status === 'active' ? 'bg-amp-success' : 'bg-muted-foreground/40'}`} />
                        <span className="text-xs font-semibold">{phase.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {phaseItems.filter(i => i.status === 'completed').length}/{phaseItems.length} items
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(phaseItems.reduce((s, i) => s + parseDurationMinutes(i.duration), 0))}
                        </span>
                      </div>
                      <div className="px-4 py-2 space-y-1">
                        {phaseItems.map(item => {
                          const Icon = statusIcon[item.status] || Circle;
                          const style = statusStyle[item.status] || '';
                          return (
                            <div key={item.id} className={`flex items-center gap-3 px-2 py-1.5 rounded text-sm ${item.status === 'locked' ? 'opacity-40' : ''}`}>
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${style}`} />
                              <span className="flex-1 truncate">{item.title}</span>
                              <span className="text-xs text-muted-foreground">{item.duration || '5 min'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {noPhaseItems.length > 0 && (
                    <div className="px-4 py-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">Unphased Items</p>
                      {noPhaseItems.map(item => {
                        const Icon = statusIcon[item.status] || Circle;
                        const style = statusStyle[item.status] || '';
                        return (
                          <div key={item.id} className={`flex items-center gap-3 px-2 py-1.5 rounded text-sm ${item.status === 'locked' ? 'opacity-40' : ''}`}>
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${style}`} />
                            <span className="flex-1 truncate">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.duration || '5 min'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {journeyPhases.length === 0 && (
                    <div className="p-4 text-xs text-muted-foreground text-center">No phases defined for this journey</div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* Gantt View */}
          <TabsContent value="gantt" className="space-y-4 mt-4">
            {activeJourneys.map(journey => {
              const items = allItems?.filter(i => i.journey_id === journey.id) || [];
              const phases = allPhases?.filter(p => p.journey_id === journey.id) || [];
              return (
                <div key={journey.id}>
                  <h4 className="font-semibold text-sm mb-2">{journey.name}</h4>
                  <GanttChart items={items} phases={phases} />
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MyInitiatives;
