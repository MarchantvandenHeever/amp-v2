import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  CheckCircle2, Circle, Clock, Lock, Star, Upload, MessageSquare, Target,
  Play, ExternalLink, FileText, Loader2
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  duration?: string | null;
  due_date?: string | null;
  mandatory?: boolean | null;
  execution_mode?: string;
  contributes_to?: string[] | null;
  content_item_id?: string | null;
  journey_id?: string;
}

interface TaskDetailModalProps {
  item: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  content: { label: 'Content', icon: FileText, color: 'text-primary' },
  activity: { label: 'Activity', icon: Play, color: 'text-amp-info' },
  form: { label: 'Form', icon: MessageSquare, color: 'text-amp-ownership' },
  confidence_check: { label: 'Confidence Check', icon: Star, color: 'text-amp-confidence' },
  evidence_upload: { label: 'Evidence Upload', icon: Upload, color: 'text-amp-participation' },
  reflection: { label: 'Reflection', icon: MessageSquare, color: 'text-amp-ownership' },
  scenario: { label: 'Scenario', icon: Target, color: 'text-amp-confidence' },
};

const contributionLabels: Record<string, { label: string; color: string }> = {
  participation: { label: 'Participation', color: 'bg-amp-participation' },
  ownership: { label: 'Ownership', color: 'bg-amp-ownership' },
  confidence: { label: 'Confidence', color: 'bg-amp-confidence' },
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ item, open, onOpenChange }) => {
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  if (!item) return null;

  const typeInfo = typeLabels[item.type] || { label: item.type, icon: Circle, color: 'text-primary' };
  const TypeIcon = typeInfo.icon;
  const contributions = (item.contributes_to || []) as string[];
  const isLocked = item.status === 'locked';
  const isCompleted = item.status === 'completed';
  const isActive = item.status === 'in_progress' || item.status === 'available';

  const invalidateJourneyQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['journey_items'] }),
      queryClient.invalidateQueries({ queryKey: ['journey_items', 'all'] }),
      queryClient.invalidateQueries({ queryKey: ['journey_items', item.journey_id] }),
      queryClient.invalidateQueries({ queryKey: ['journeys'] }),
      queryClient.invalidateQueries({ queryKey: ['journeys', undefined] }),
      queryClient.invalidateQueries({ queryKey: ['journeys', item.initiative_id] }),
      queryClient.invalidateQueries({ queryKey: ['scores'] }),
      queryClient.invalidateQueries({ queryKey: ['score_history'] }),
      queryClient.invalidateQueries({ queryKey: ['profiles'] }),
      queryClient.invalidateQueries({ queryKey: ['points_ledger'] }),
      queryClient.invalidateQueries({ queryKey: ['activity_events'] }),
    ]);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const { error } = await supabase
        .from('journey_items')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;

      await invalidateJourneyQueries();
      toast.success('Task started!');
    } catch (err: any) {
      toast.error('Failed to start task: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error('Not logged in');
      return;
    }

    setCompleting(true);
    try {
      const completedAtIso = new Date().toISOString();
      const completedDate = completedAtIso.split('T')[0];

      const { error } = await supabase
        .from('journey_items')
        .update({
          status: 'completed',
          completed_date: completedDate,
          updated_at: completedAtIso,
        })
        .eq('id', item.id);
      if (error) throw error;

      await supabase.from('activity_events').insert({
        user_id: user.id,
        journey_item_id: item.id,
        event_type: 'task_completed',
        metadata: { type: item.type, title: item.title },
      });

      const pointsEarned = item.mandatory ? 20 : 10;
      await supabase.from('points_ledger').insert({
        user_id: user.id,
        points: pointsEarned,
        journey_item_id: item.id,
        reason: `Completed: ${item.title}`,
      });

      const newPoints = (user.points || 0) + pointsEarned;
      const newStreak = (user.streak || 0) + 1;
      await supabase
        .from('profiles')
        .update({
          points: newPoints,
          streak: newStreak,
          updated_at: completedAtIso,
        })
        .eq('id', user.id);

      let initiativeId: string | null = null;
      let journeyItemsForProgress: Array<{ id: string; status: string; weight: number | null; predecessor_id?: string | null }> = [];

      if (item.journey_id) {
        const [{ data: journeyRecord }, { data: journeyItems }] = await Promise.all([
          supabase
            .from('journeys')
            .select('initiative_id')
            .eq('id', item.journey_id)
            .maybeSingle(),
          supabase
            .from('journey_items')
            .select('id, status, weight, predecessor_id')
            .eq('journey_id', item.journey_id),
        ]);

        initiativeId = journeyRecord?.initiative_id ?? null;
        journeyItemsForProgress = journeyItems ?? [];

        if (journeyItemsForProgress.length > 0) {
          const completedIds = new Set(
            journeyItemsForProgress
              .filter((journeyItem) => journeyItem.status === 'completed' || journeyItem.id === item.id)
              .map((journeyItem) => journeyItem.id),
          );

          const totalWeight = journeyItemsForProgress.reduce(
            (sum, journeyItem) => sum + Math.max(journeyItem.weight || 1, 1),
            0,
          );

          const completedWeight = journeyItemsForProgress.reduce((sum, journeyItem) => {
            if (!completedIds.has(journeyItem.id)) return sum;
            return sum + Math.max(journeyItem.weight || 1, 1);
          }, 0);

          const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

          await supabase.from('journeys').update({ progress, updated_at: completedAtIso }).eq('id', item.journey_id);

          const unlockableIds = journeyItemsForProgress
            .filter(
              (journeyItem) =>
                journeyItem.status === 'locked' &&
                journeyItem.predecessor_id &&
                completedIds.has(journeyItem.predecessor_id),
            )
            .map((journeyItem) => journeyItem.id);

          if (unlockableIds.length > 0) {
            await supabase
              .from('journey_items')
              .update({ status: 'available', updated_at: completedAtIso })
              .in('id', unlockableIds);
          }
        }
      }

      const contribs = (item.contributes_to || []) as string[];
      if (contribs.length > 0) {
        const traitKeyFor = (pillar: string): string | null => {
          if (pillar === 'participation') return 'P_x4';
          if (pillar === 'ownership') return 'O_x1';
          if (pillar === 'confidence') return item.type === 'confidence_check' ? 'C_x1' : 'C_x5';
          return null;
        };

        const eventRows = contribs
          .filter((pillar) => ['participation', 'ownership', 'confidence'].includes(pillar))
          .map((pillar) => ({
            user_id: user.id,
            initiative_id: initiativeId,
            journey_id: item.journey_id ?? null,
            journey_item_id: item.id,
            pillar,
            event_type: 'task_completed',
            value: 1,
            payload: {
              trait_key: traitKeyFor(pillar),
              item_type: item.type,
              mandatory: !!item.mandatory,
            },
          }));

        if (eventRows.length) {
          const { error: evErr } = await supabase.from('behavioural_events').insert(eventRows);
          if (evErr) console.error('[behavioural_events] insert failed', evErr);
        }

        const { error: fnErr } = await supabase.functions.invoke('score-recalc', {
          body: { user_id: user.id, ...(initiativeId ? { initiative_id: initiativeId } : {}) },
        });
        if (fnErr) console.error('[score-recalc] invoke failed', fnErr);
      }

      await invalidateJourneyQueries();
      await refreshUser();

      toast.success('Task completed! 🎉', { description: `+${pointsEarned} points earned` });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to complete task: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0`}>
              <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
            </div>
            <span className="text-lg">{item.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status & Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isCompleted ? 'default' : isLocked ? 'secondary' : 'outline'} className="text-xs">
              {isCompleted ? '✓ Completed' : isLocked ? '🔒 Locked' : item.status === 'in_progress' ? '▶ In Progress' : '○ Available'}
            </Badge>
            <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
            {item.mandatory && <Badge variant="outline" className="text-xs border-amp-warning/30 text-amp-warning">Required</Badge>}
            {item.execution_mode === 'parallel' && <Badge variant="outline" className="text-xs">∥ Parallel</Badge>}
          </div>

          {/* Description */}
          {item.description && (
            <div className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
              {item.description}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-semibold">{item.duration || '5 min'}</p>
              <p className="text-[10px] text-muted-foreground">Duration</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <Target className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-semibold">{contributions.length}</p>
              <p className="text-[10px] text-muted-foreground">Score Contributions</p>
            </div>
          </div>

          {/* Contributions */}
          {contributions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Contributes to:</p>
              <div className="flex gap-2">
                {contributions.map(c => {
                  const info = contributionLabels[c] || { label: c, color: 'bg-primary' };
                  return (
                    <div key={c} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/40 text-xs">
                      <span className={`w-2 h-2 rounded-full ${info.color}`} />
                      <span className="font-medium capitalize">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due date */}
          {item.due_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Due: {item.due_date}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {isActive && item.status === 'available' && (
              <Button onClick={handleStart} disabled={starting} className="flex-1" variant="outline">
                {starting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Start Task
              </Button>
            )}
            {isActive && (
              <Button onClick={handleComplete} disabled={completing} className="flex-1">
                {completing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Mark Complete
              </Button>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 text-amp-success text-sm w-full justify-center py-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Task Completed</span>
              </div>
            )}
            {isLocked && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm w-full justify-center py-2">
                <Lock className="w-5 h-5" />
                <span className="font-medium">Complete prerequisite tasks first</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
