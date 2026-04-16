import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJourneys, useJourneyItems, useJourneyPhases } from '@/hooks/useSupabaseData';
import { NewJourneyModal } from '@/components/journey/NewJourneyModal';
import { supabase } from '@/integrations/supabase/client';
import { GripVertical, Plus, ChevronDown, ChevronUp, CheckCircle2, Circle, Upload, MessageSquare, Star, Target, FileText, Trash2, Edit, Users, Copy, Loader2, BarChart3, List, Layers, Link2, Power, PowerOff, Sparkles } from 'lucide-react';
import { JourneyBuilderAgent } from '@/components/ai/JourneyBuilderAgent';
import { cn } from '@/lib/utils';
import { JourneyItemModal } from '@/components/journey/JourneyItemModal';
import { AssignJourneyModal } from '@/components/journey/AssignJourneyModal';
import { GanttChart } from '@/components/journey/GanttChart';
import { PhaseModal } from '@/components/journey/PhaseManager';
import { SubJourneyModal } from '@/components/journey/SubJourneyModal';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ElementType> = {
  content: FileText, activity: CheckCircle2, form: MessageSquare,
  confidence_check: Star, evidence_upload: Upload, reflection: MessageSquare, scenario: Target,
};
const typeLabels: Record<string, string> = {
  content: 'Content', activity: 'Activity', form: 'Form', confidence_check: 'Confidence Check',
  evidence_upload: 'Evidence Upload', reflection: 'Reflection', scenario: 'Scenario',
};
const pillarColors: Record<string, string> = {
  participation: 'bg-amp-participation text-primary-foreground',
  ownership: 'bg-amp-ownership text-primary-foreground',
  confidence: 'bg-amp-confidence text-accent-foreground',
};

const JourneyBuilder: React.FC = () => {
  const { data: journeys, isLoading: loadingJourneys, refetch: refetchJourneys } = useJourneys();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: items, isLoading: loadingItems, refetch: refetchItems } = useJourneyItems(selectedId || undefined);
  const { data: phases, refetch: refetchPhases } = useJourneyPhases(selectedId || undefined);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [assignModal, setAssignModal] = useState(false);
  const [journeyModal, setJourneyModal] = useState<{ open: boolean; journey: any | null }>({ open: false, journey: null });
  const [phaseModal, setPhaseModal] = useState<{ open: boolean; phase: any | null }>({ open: false, phase: null });
  const [subJourneyModal, setSubJourneyModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (journeys && journeys.length > 0 && !selectedId) setSelectedId(journeys[0].id);
  }, [journeys, selectedId]);

  const selectedJourney = journeys?.find(j => j.id === selectedId);
  const sortedItems = [...(items || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const sortedPhases = [...(phases || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const subJourneys = (journeys || []).filter(j => (j as any).parent_journey_id === selectedId);

  // Group items by phase
  const groupedItems = React.useMemo(() => {
    const groups: { phase: any | null; items: any[] }[] = [];
    const phaseMap: Record<string, any[]> = {};
    const noPhase: any[] = [];
    sortedItems.forEach(item => {
      const pid = (item as any).phase_id;
      if (pid && sortedPhases.find(p => p.id === pid)) {
        if (!phaseMap[pid]) phaseMap[pid] = [];
        phaseMap[pid].push(item);
      } else {
        noPhase.push(item);
      }
    });
    sortedPhases.forEach(p => {
      groups.push({ phase: p, items: phaseMap[p.id] || [] });
    });
    if (noPhase.length > 0) groups.push({ phase: null, items: noPhase });
    return groups;
  }, [sortedItems, sortedPhases]);

  // Drag & Drop
  const onDragStart = (idx: number) => (e: React.DragEvent) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (idx: number) => (e: React.DragEvent) => { e.preventDefault(); setDragOverIdx(idx); };
  const onDrop = async (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...sortedItems];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('journey_items').update({ order_index: i }).eq('id', reordered[i].id);
    }
    setDragIdx(null); setDragOverIdx(null); refetchItems();
  };

  const handleSaveItem = async (item: any) => {
    const payload = {
      title: item.title,
      description: item.description,
      type: item.type,
      weight: item.weight || 10,
      duration: item.duration || '5 min',
      mandatory: item.mandatory ?? true,
      contributes_to: item.contributesTo || [],
      due_date: item.dueDate || null,
      execution_mode: item.executionMode || 'series',
      predecessor_id: item.predecessorId || null,
      phase_id: item.phaseId || null,
      content_item_id: item.contentItemId || null,
    };

    if (item.id && items?.find(i => i.id === item.id)) {
      const existing = items.find(i => i.id === item.id);
      const { error } = await supabase.from('journey_items').update(payload).eq('id', item.id);
      if (error) { toast.error('Failed to update'); return; }

      await supabase.from('ai_change_log').insert({
        change_type: 'edit_journey_item',
        journey_id: selectedId,
        journey_item_id: item.id,
        before_state: existing,
        after_state: { ...existing, ...payload },
        rationale: 'Manual edit by admin/change manager',
      });

      toast.success('Item updated');
    } else {
      const { error } = await supabase.from('journey_items').insert({
        ...payload, journey_id: selectedId!, order_index: sortedItems.length, status: 'available',
      });
      if (error) { toast.error('Failed to add'); return; }
      toast.success('Item added');
    }
    refetchItems();
  };

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from('journey_items').delete().eq('id', itemId);
    toast.success('Item removed'); refetchItems();
    if (expandedItem === itemId) setExpandedItem(null);
  };

  const handleDuplicateItem = async (item: any) => {
    await supabase.from('journey_items').insert({
      journey_id: selectedId!, title: `${item.title} (copy)`, description: item.description,
      type: item.type, weight: item.weight, duration: item.duration, mandatory: item.mandatory,
      contributes_to: item.contributes_to, order_index: sortedItems.length, status: 'available',
      execution_mode: (item as any).execution_mode || 'series', phase_id: (item as any).phase_id || null,
    });
    toast.success('Item duplicated'); refetchItems();
  };

  const handleSavePhase = async (phase: any) => {
    if (phase.id) {
      await supabase.from('journey_phases').update({
        name: phase.name, description: phase.description, status: phase.status,
        start_date: phase.start_date || null, end_date: phase.end_date || null,
      }).eq('id', phase.id);
      // Cascade: activate/deactivate items in this phase
      const newStatus = phase.status === 'active' ? 'available' : 'locked';
      await supabase.from('journey_items').update({ status: newStatus }).eq('phase_id', phase.id);
      toast.success('Phase updated — items ' + (phase.status === 'active' ? 'activated' : 'deactivated'));
    } else {
      await supabase.from('journey_phases').insert({
        journey_id: selectedId!, name: phase.name, description: phase.description,
        status: phase.status, start_date: phase.start_date || null, end_date: phase.end_date || null,
        order_index: sortedPhases.length,
      });
      toast.success('Phase created');
    }
    refetchPhases(); refetchItems();
  };

  const handleDeletePhase = async (phaseId: string) => {
    // Unlink items first
    await supabase.from('journey_items').update({ phase_id: null }).eq('phase_id', phaseId);
    await supabase.from('journey_phases').delete().eq('id', phaseId);
    toast.success('Phase deleted'); refetchPhases(); refetchItems();
  };

  const handleTogglePhase = async (phase: any) => {
    const newStatus = phase.status === 'active' ? 'inactive' : 'active';
    await supabase.from('journey_phases').update({ status: newStatus }).eq('id', phase.id);
    const itemStatus = newStatus === 'active' ? 'available' : 'locked';
    await supabase.from('journey_items').update({ status: itemStatus }).eq('phase_id', phase.id);
    toast.success(`Phase ${newStatus === 'active' ? 'activated' : 'deactivated'} — items updated`);
    refetchPhases(); refetchItems();
  };

  const handleLinkSubJourney = async (journeyId: string, phaseId: string) => {
    await supabase.from('journeys').update({ parent_journey_id: selectedId, phase_id: phaseId }).eq('id', journeyId);
    toast.success('Sub-journey linked'); refetchJourneys();
  };

  if (loadingJourneys) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const renderItemRow = (item: any, globalIdx: number) => {
    const Icon = typeIcons[item.type] || Circle;
    const expanded = expandedItem === item.id;
    const isDragOver = dragOverIdx === globalIdx && dragIdx !== globalIdx;
    const contributesTo = item.contributes_to || [];
    const predecessor = item.predecessor_id ? sortedItems.find(i => i.id === item.predecessor_id) : null;

    return (
      <div key={item.id} draggable onDragStart={onDragStart(globalIdx)} onDragOver={onDragOver(globalIdx)}
        onDrop={() => onDrop(globalIdx)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
        className={cn("bg-card border rounded-xl amp-shadow-card overflow-hidden transition-all",
          dragIdx === globalIdx ? "opacity-40 border-primary" : "border-border",
          isDragOver && "border-primary border-dashed ring-2 ring-primary/20")}>
        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedItem(expanded ? null : item.id)}>
          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">{globalIdx + 1}</div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.status === 'completed' ? 'bg-amp-success/10' : 'bg-secondary'}`}>
            {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-amp-success" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{item.title}</span>
              {item.mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium shrink-0">required</span>}
              {(item as any).execution_mode === 'parallel' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amp-info/10 text-amp-info font-medium shrink-0">parallel</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{typeLabels[item.type] || item.type}</span>
              <span className="text-xs text-muted-foreground">· {item.duration}</span>
              <span className="text-xs text-muted-foreground">· W:{item.weight}</span>
              {predecessor && <span className="text-xs text-amp-warning">→ {predecessor.title}</span>}
            </div>
          </div>
          <div className="flex gap-1 mr-2">
            {contributesTo.map((c: string) => (
              <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full ${pillarColors[c] || 'bg-secondary'}`}>{c[0].toUpperCase()}</span>
            ))}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-border">
            <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
              <div><span className="text-muted-foreground">Description:</span><p className="mt-0.5">{item.description}</p></div>
              <div><span className="text-muted-foreground">Status:</span><p className="mt-0.5 capitalize">{item.status.replace('_', ' ')}</p></div>
              <div><span className="text-muted-foreground">Due Date:</span><p className="mt-0.5">{item.due_date || '—'}</p></div>
              <div><span className="text-muted-foreground">Execution:</span><p className="mt-0.5 capitalize">{(item as any).execution_mode || 'series'}</p></div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={e => { e.stopPropagation(); setItemModal({ open: true, item: { ...item, contributesTo: item.contributes_to, dueDate: item.due_date, executionMode: (item as any).execution_mode, predecessorId: item.predecessor_id, phaseId: (item as any).phase_id, contentItemId: (item as any).content_item_id } }); }}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1">
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button onClick={e => { e.stopPropagation(); handleDuplicateItem(item); }}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1">
                <Copy className="w-3 h-3" /> Duplicate
              </button>
              <button onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); }}
                className="px-3 py-1.5 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="flex gap-0">
      <div className={`${aiPanelOpen ? 'flex-1 min-w-0' : 'w-full'} max-w-6xl mx-auto space-y-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Journey Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Design behavioural adoption journeys with phases, dependencies & parallel execution</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAiPanelOpen(!aiPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${aiPanelOpen ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
              <Sparkles className="w-4 h-4" /> AI Agent
            </button>
            <button onClick={() => setJourneyModal({ open: true, journey: null })} className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              + New Journey
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Journey list */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Journeys</h3>
            {(journeys || []).filter(j => !(j as any).parent_journey_id).map(j => (
              <div key={j.id} className={cn("w-full text-left p-3 rounded-lg border transition-all text-sm group",
                selectedId === j.id ? "border-primary bg-primary/5 amp-shadow-card" : "border-border hover:border-primary/30 hover:bg-secondary/50")}>
                <div className="flex items-start justify-between">
                  <button onClick={() => { setSelectedId(j.id); setExpandedItem(null); }} className="flex-1 text-left">
                    <p className="font-medium">{j.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{j.progress || 0}% · {j.status}</p>
                  </button>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setJourneyModal({ open: true, journey: j })} className="p-1 rounded hover:bg-secondary"><Edit className="w-3 h-3 text-muted-foreground" /></button>
                    <button onClick={async () => {
                      if (!confirm('Delete this journey?')) return;
                      await supabase.from('journeys').delete().eq('id', j.id);
                      toast.success('Journey deleted'); refetchJourneys();
                      if (selectedId === j.id) setSelectedId(null);
                    }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Journey detail */}
          <div className="lg:col-span-3 space-y-4">
            {selectedJourney && (
              <>
                <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="font-heading text-lg font-semibold">{selectedJourney.name}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedJourney.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setJourneyModal({ open: true, journey: selectedJourney })}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border font-medium hover:bg-secondary transition-colors">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => setAssignModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border font-medium hover:bg-secondary transition-colors">
                        <Users className="w-3.5 h-3.5" /> Assign
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedJourney.status === 'active' ? 'bg-amp-success/10 text-amp-success' :
                        selectedJourney.status === 'draft' ? 'bg-secondary text-muted-foreground' :
                        'bg-amp-info/10 text-amp-info'}`}>{selectedJourney.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Weight: {selectedJourney.weight}</span>
                    <span>{sortedItems.filter(i => i.mandatory).length} mandatory</span>
                    <span>{sortedItems.filter(i => i.status === 'completed').length}/{sortedItems.length} completed</span>
                    <span>{sortedPhases.length} phases</span>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode('list')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80')}>
                      <List className="w-3.5 h-3.5" /> List
                    </button>
                    <button onClick={() => setViewMode('gantt')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5", viewMode === 'gantt' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80')}>
                      <BarChart3 className="w-3.5 h-3.5" /> Gantt
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPhaseModal({ open: true, phase: null })} className="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors">
                      <Layers className="w-3.5 h-3.5" /> Add Phase
                    </button>
                    {sortedPhases.length > 0 && (
                      <button onClick={() => setSubJourneyModal(true)} className="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors">
                        <Link2 className="w-3.5 h-3.5" /> Link Sub-Journey
                      </button>
                    )}
                    <button onClick={() => setItemModal({ open: true, item: null })} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                </div>

                {/* Gantt view */}
                {viewMode === 'gantt' && (
                  <GanttChart items={sortedItems as any} phases={sortedPhases as any} />
                )}

                {/* List view */}
                {viewMode === 'list' && (
                  <div className="space-y-4">
                    {loadingItems ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <>
                        {/* Phases with items */}
                        {groupedItems.map((group, gi) => (
                          <div key={gi}>
                            {group.phase && (
                              <div className="flex items-center justify-between mb-2 px-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${group.phase.status === 'active' ? 'bg-amp-success' : group.phase.status === 'completed' ? 'bg-amp-info' : 'bg-muted-foreground/40'}`} />
                                  <h4 className="text-sm font-semibold">{group.phase.name}</h4>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{group.phase.status}</span>
                                  <span className="text-[10px] text-muted-foreground">{group.items.length} items</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleTogglePhase(group.phase)} title={group.phase.status === 'active' ? 'Deactivate phase' : 'Activate phase'}
                                    className="p-1 rounded hover:bg-secondary transition-colors">
                                    {group.phase.status === 'active' ? <PowerOff className="w-3.5 h-3.5 text-amp-warning" /> : <Power className="w-3.5 h-3.5 text-amp-success" />}
                                  </button>
                                  <button onClick={() => setPhaseModal({ open: true, phase: group.phase })}
                                    className="p-1 rounded hover:bg-secondary transition-colors"><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
                                  <button onClick={() => handleDeletePhase(group.phase.id)}
                                    className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                                </div>
                              </div>
                            )}
                            {!group.phase && sortedPhases.length > 0 && group.items.length > 0 && (
                              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Unphased Items</h4>
                            )}

                            {/* Sub-journeys in this phase */}
                            {group.phase && subJourneys.filter(sj => (sj as any).phase_id === group.phase.id).map(sj => (
                              <div key={sj.id} className="mb-2 ml-4 p-3 bg-secondary/30 rounded-lg border border-border/50 flex items-center gap-2">
                                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">Sub-Journey: {sj.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{sj.status}</span>
                              </div>
                            ))}

                            <div className="space-y-2 mb-4">
                              {group.items.length === 0 && group.phase ? (
                                <div className="ml-4 p-4 border border-dashed border-border rounded-lg text-center">
                                  <p className="text-xs text-muted-foreground">No items in this phase</p>
                                </div>
                              ) : group.items.map((item, i) => renderItemRow(item, sortedItems.indexOf(item)))}
                            </div>
                          </div>
                        ))}

                        {sortedItems.length === 0 && sortedPhases.length === 0 && (
                          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
                            <p className="text-sm text-muted-foreground mb-3">No workflow items yet. Start by adding phases or items.</p>
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => setPhaseModal({ open: true, phase: null })}
                                className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">
                                <Layers className="w-4 h-4 inline mr-1" /> Add Phase
                              </button>
                              <button onClick={() => setItemModal({ open: true, item: null })}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                                <Plus className="w-4 h-4 inline mr-1" /> Add Item
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Agent Panel */}
      {aiPanelOpen && selectedId && (
        <div className="w-[400px] shrink-0 h-[calc(100vh-8rem)]">
          <JourneyBuilderAgent
            journeyId={selectedId}
            initiativeId={selectedJourney?.initiative_id || undefined}
            existingItems={sortedItems}
            onItemInserted={() => refetchItems()}
            onClose={() => setAiPanelOpen(false)}
          />
        </div>
      )}
      </div>

      <JourneyItemModal
        open={itemModal.open}
        onClose={() => setItemModal({ open: false, item: null })}
        onSave={handleSaveItem}
        item={itemModal.item}
        existingItems={sortedItems}
        phases={sortedPhases}
      />

      <PhaseModal
        open={phaseModal.open}
        onClose={() => setPhaseModal({ open: false, phase: null })}
        onSave={handleSavePhase}
        phase={phaseModal.phase}
      />

      {selectedJourney && (
        <>
          <AssignJourneyModal open={assignModal} onClose={() => setAssignModal(false)} journeyName={selectedJourney.name} />
          <SubJourneyModal
            open={subJourneyModal}
            onClose={() => setSubJourneyModal(false)}
            onLink={handleLinkSubJourney}
            availableJourneys={journeys || []}
            phases={sortedPhases}
            currentJourneyId={selectedId!}
          />
        </>
      )}
      <NewJourneyModal open={journeyModal.open} onClose={() => setJourneyModal({ open: false, journey: null })} onCreated={() => refetchJourneys()} journey={journeyModal.journey} />
    </AppLayout>
  );
};

export default JourneyBuilder;
