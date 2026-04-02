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

  const handleStart = async () => {
    setStarting(true);
    try {
      const { error } = await supabase
        .from('journey_items')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['journey_items'] });
      toast.success('Task started!');
    } catch (err: any) {
      toast.error('Failed to start task: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    if (!user) { toast.error('Not logged in'); return; }
    setCompleting(true);
    try {
      // 1. Mark item completed
      const { error } = await supabase
        .from('journey_items')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (error) throw error;

      // 2. Log activity event with correct user profile id
      await supabase.from('activity_events').insert({
        user_id: user.id,
        journey_item_id: item.id,
        event_type: 'task_completed',
        metadata: { type: item.type, title: item.title },
      });

      // 3. Award points
      const pointsEarned = item.mandatory ? 20 : 10;
      await supabase.from('points_ledger').insert({
        user_id: user.id,
        points: pointsEarned,
        journey_item_id: item.id,
        reason: `Completed: ${item.title}`,
      });

      // 4. Update profile points and streak
      const newPoints = (user.points || 0) + pointsEarned;
      const newStreak = (user.streak || 0) + 1;
      await supabase.from('profiles').update({
        points: newPoints,
        streak: newStreak,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      // 5. Recalculate journey progress
      if (item.journey_id) {
        const { data: journeyItems } = await supabase
          .from('journey_items')
          .select('id, status, weight')
          .eq('journey_id', item.journey_id);
        if (journeyItems && journeyItems.length > 0) {
          const totalWeight = journeyItems.reduce((s, i) => s + (i.weight || 1), 0);
          const completedWeight = journeyItems
            .filter(i => i.status === 'completed' || i.id === item.id) // include current
            .reduce((s, i) => s + (i.weight || 1), 0);
          const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
          await supabase.from('journeys').update({ progress }).eq('id', item.journey_id);
        }
      }

      // 6. Update user scores based on contributions
      const contribs = (item.contributes_to || []) as string[];
      if (contribs.length > 0) {
        const { data: currentScore } = await supabase
          .from('scores')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const bump = 3; // points per contribution dimension
        const newScores = {
          participation: Number(currentScore?.participation || user.scores.participation) + (contribs.includes('participation') ? bump : 0),
          ownership: Number(currentScore?.ownership || user.scores.ownership) + (contribs.includes('ownership') ? bump : 0),
          confidence: Number(currentScore?.confidence || user.scores.confidence) + (contribs.includes('confidence') ? bump : 0),
        };
        // Cap at journey progress ceiling (ideal adoption logic)
        const cappedScores = {
          participation: Math.min(newScores.participation, 100),
          ownership: Math.min(newScores.ownership, 100),
          confidence: Math.min(newScores.confidence, 100),
        };
        const adoption = Math.round((cappedScores.participation + cappedScores.ownership + cappedScores.confidence) / 3);

        if (currentScore) {
          await supabase.from('scores').update({
            ...cappedScores,
            adoption,
            calculated_at: new Date().toISOString(),
          }).eq('id', currentScore.id);
        } else {
          await supabase.from('scores').insert({
            user_id: user.id,
            ...cappedScores,
            adoption,
          });
        }
      }

      // 7. Invalidate all relevant caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['journey_items'] }),
        queryClient.invalidateQueries({ queryKey: ['journeys'] }),
        queryClient.invalidateQueries({ queryKey: ['scores'] }),
        queryClient.invalidateQueries({ queryKey: ['score_history'] }),
        queryClient.invalidateQueries({ queryKey: ['profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['points_ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['activity_events'] }),
      ]);

      // 8. Refresh the user context so dashboard reflects new points/scores
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
