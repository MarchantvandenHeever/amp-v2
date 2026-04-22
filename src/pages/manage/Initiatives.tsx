import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInitiatives, useMilestones, useJourneys } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Calendar, Users, ChevronRight, ChevronDown, Loader2, Edit, Trash2, Plus, Target } from 'lucide-react';
import { NewInitiativeModal } from '@/components/initiatives/NewInitiativeModal';
import { MilestoneModal } from '@/components/initiatives/MilestoneModal';
import { toast } from 'sonner';
import { PageHero, StatusChip } from '@/components/cl';

const InitiativeList: React.FC = () => {
  const { data: initiatives, isLoading: loadingInit, refetch } = useInitiatives();
  const { data: milestones, refetch: refetchMilestones } = useMilestones();
  const { data: journeys } = useJourneys();
  const [showNew, setShowNew] = useState(false);
  const [editInit, setEditInit] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; milestone: any | null; initiativeId: string }>({ open: false, milestone: null, initiativeId: '' });

  const handleDeleteInitiative = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this initiative? This cannot be undone.')) return;
    const { error } = await supabase.from('initiatives').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Initiative deleted');
    refetch();
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;
    const { error } = await supabase.from('milestones').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Milestone deleted');
    refetchMilestones();
  };

  if (loadingInit) {
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
      <div className="-m-6 mb-0">
        <PageHero
          title="Initiatives"
          subtitle="Manage adoption initiatives and track progress."
          size="sm"
        >
          <button
            onClick={() => setShowNew(true)}
            className="mt-4 self-start inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Initiative
          </button>
        </PageHero>
      </div>
      <div className="max-w-5xl mx-auto space-y-4 pt-6">
          {(initiatives || []).map((init, i) => {
            const initMilestones = (milestones || []).filter(m => m.initiative_id === init.id);
            const initJourneys = (journeys || []).filter(j => j.initiative_id === init.id);
            const expanded = expandedId === init.id;
            return (
              <motion.div key={init.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="cl-card hover:cl-card-hover transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expanded ? null : init.id)}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-lg">{init.name}</h3>
                      {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{init.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditInit(init); }}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Edit">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={(e) => handleDeleteInitiative(init.id, e)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amp-adoption" style={{ width: `${init.progress || 0}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{init.progress || 0}%</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{init.start_date} → {init.end_date}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{init.user_count || 0} users</span>
                  <StatusChip tone="info">{init.phase.replace(/_/g, ' ')}</StatusChip>
                  <StatusChip tone={init.status === 'active' ? 'success' : init.status === 'completed' ? 'info' : 'neutral'}>
                    {init.status}
                  </StatusChip>
                  <span>{initMilestones.length} milestones · {initJourneys.length} journeys</span>
                </div>

                {/* Expanded: Milestones with edit controls */}
                {expanded && (
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-primary" /> Milestones
                      </h4>
                      <button onClick={() => setMilestoneModal({ open: true, milestone: null, initiativeId: init.id })}
                        className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                        <Plus className="w-3 h-3" /> Add Milestone
                      </button>
                    </div>
                    {initMilestones.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No milestones yet</p>
                    ) : (
                      <div className="grid gap-2">
                        {initMilestones.map(ms => (
                          <div key={ms.id} className={`p-3 rounded-lg border ${
                            ms.status === 'completed' ? 'border-amp-success/30 bg-amp-success/5' :
                            ms.status === 'active' ? 'border-primary/30 bg-primary/5' :
                            'border-border bg-secondary/30'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{ms.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary capitalize">{ms.status}</span>
                                  <span className="text-[10px] text-muted-foreground">W:{ms.weight || 0}</span>
                                  {ms.start_date && <span className="text-[10px] text-muted-foreground">{ms.start_date} → {ms.end_date}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-20 flex items-center gap-1">
                                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full ${ms.status === 'completed' ? 'bg-amp-success' : 'bg-primary'}`} style={{ width: `${ms.progress || 0}%` }} />
                                  </div>
                                  <span className="text-[10px] font-semibold">{ms.progress || 0}%</span>
                                </div>
                                <button onClick={() => setMilestoneModal({ open: true, milestone: ms, initiativeId: init.id })}
                                  className="p-1 rounded hover:bg-secondary transition-colors">
                                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => handleDeleteMilestone(ms.id)}
                                  className="p-1 rounded hover:bg-destructive/10 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
      </div>

      <NewInitiativeModal open={showNew || !!editInit} onClose={() => { setShowNew(false); setEditInit(null); }} onCreated={() => { refetch(); refetchMilestones(); }} initiative={editInit} />
      <MilestoneModal open={milestoneModal.open} onClose={() => setMilestoneModal({ open: false, milestone: null, initiativeId: '' })} onSaved={() => refetchMilestones()} milestone={milestoneModal.milestone} initiativeId={milestoneModal.initiativeId} />
    </AppLayout>
  );
};

export default InitiativeList;
