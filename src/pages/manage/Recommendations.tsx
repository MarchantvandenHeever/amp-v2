import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRecommendations, useApplyRecommendation, useDismissRecommendation, useSaveRecommendation } from '@/hooks/useRecommendations';
import { useInitiatives } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Check, X, Bookmark, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHero, StatusChip, type ChipTone } from '@/components/cl';

const severityTone: Record<string, ChipTone> = {
  critical: 'risk',
  high: 'risk',
  medium: 'warning',
  low: 'neutral',
};

const typeLabels: Record<string, string> = {
  add_item: 'Add Item',
  edit_item: 'Edit Item',
  resequence_item: 'Resequence',
  add_nudge: 'Add Nudge',
  add_manager_action: 'Manager Action',
  add_confidence_check: 'Confidence Check',
  add_evidence_task: 'Evidence Task',
  add_role_explainer: 'Role Explainer',
  add_simulation: 'Simulation',
  split_path_by_persona: 'Split by Persona',
  simplify_phase: 'Simplify Phase',
  escalation: 'Escalation',
};

const Recommendations: React.FC = () => {
  const { user } = useAuth();
  const { data: initiatives } = useInitiatives();
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const { data: recommendations, isLoading, refetch } = useRecommendations(selectedInitiative || undefined);
  const applyMutation = useApplyRecommendation();
  const dismissMutation = useDismissRecommendation();
  const saveMutation = useSaveRecommendation();
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('ai-recommendation-engine', {
        body: { initiative_id: selectedInitiative || null, caller_user_id: user?.id },
      });
      if (error) throw error;
      toast.success('Recommendations generated');
      refetch();
    } catch {
      toast.error('Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const filtered = (recommendations || []).filter(r => !statusFilter || r.review_status === statusFilter);

  const statusCounts = {
    pending: (recommendations || []).filter(r => r.review_status === 'pending').length,
    approved: (recommendations || []).filter(r => r.review_status === 'approved').length,
    saved: (recommendations || []).filter(r => r.review_status === 'saved').length,
    dismissed: (recommendations || []).filter(r => r.review_status === 'dismissed').length,
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="-m-6 mb-6">
        <PageHero
          title="AI Recommendations"
          subtitle="Review and apply AI-generated journey improvements"
          size="sm"
        >
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)}
              className="text-sm rounded-full px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white border border-white/20">
              <option value="" className="text-foreground">All Initiatives</option>
              {(initiatives || []).map(i => <option key={i.id} value={i.id} className="text-foreground">{i.name}</option>)}
            </select>
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-primary text-sm font-semibold disabled:opacity-50 hover:bg-white/90 transition-colors">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>
        </PageHero>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'saved', 'approved', 'dismissed'] as const).map(status => (
            <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80')}>
              {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((rec, i) => {
            const expanded = expandedId === rec.id;
            return (
              <motion.div key={rec.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="cl-card overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : rec.id)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusChip tone="info">{typeLabels[rec.recommendation_type] || rec.recommendation_type}</StatusChip>
                        <StatusChip tone={severityTone[rec.severity] || 'neutral'}>{rec.severity}</StatusChip>
                        <span className="text-[10px] text-muted-foreground">Priority: {rec.priority}</span>
                      </div>
                      <h3 className="text-sm font-semibold">{rec.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {rec.review_status === 'pending' && (
                        <>
                          <button onClick={e => { e.stopPropagation(); applyMutation.mutate({ recommendation: rec, approvedBy: user?.id || '' }); }}
                            className="p-1.5 rounded-lg bg-amp-success/10 text-amp-success hover:bg-amp-success/20" title="Apply">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); saveMutation.mutate(rec.id); }}
                            className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80" title="Save for later">
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); dismissMutation.mutate(rec.id); }}
                            className="p-1.5 rounded-lg bg-amp-risk/10 text-amp-risk hover:bg-amp-risk/20" title="Dismiss">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                    </div>
                  </div>
                </div>
                {expanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Rationale:</span>
                        <p className="mt-0.5">{rec.rationale}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expected Impact:</span>
                        <p className="mt-0.5">{rec.expected_impact || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Impacted Personas:</span>
                        <p className="mt-0.5">{(rec.impacted_personas as string[])?.join(', ') || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="mt-0.5 capitalize">{rec.review_status}</p>
                      </div>
                    </div>
                    {rec.proposed_change_json && Object.keys(rec.proposed_change_json as object).length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs text-muted-foreground">Proposed Change:</span>
                        <pre className="mt-1 p-2 bg-secondary rounded-lg text-[10px] overflow-x-auto">
                          {JSON.stringify(rec.proposed_change_json, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="cl-card border-dashed p-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No {statusFilter} recommendations. Click "Generate" to analyse insights.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Recommendations;
