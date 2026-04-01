import React, { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJourneys, useJourneyItems } from '@/hooks/useSupabaseData';
import { NewJourneyModal } from '@/components/journey/NewJourneyModal';
import { supabase } from '@/integrations/supabase/client';
import { GripVertical, Plus, ChevronDown, ChevronUp, CheckCircle2, Circle, Upload, MessageSquare, Star, Target, FileText, Trash2, Edit, Users, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JourneyItemModal } from '@/components/journey/JourneyItemModal';
import { AssignJourneyModal } from '@/components/journey/AssignJourneyModal';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ElementType> = {
  content: FileText,
  activity: CheckCircle2,
  form: MessageSquare,
  confidence_check: Star,
  evidence_upload: Upload,
  reflection: MessageSquare,
  scenario: Target,
};

const typeLabels: Record<string, string> = {
  content: 'Content',
  activity: 'Activity',
  form: 'Form',
  confidence_check: 'Confidence Check',
  evidence_upload: 'Evidence Upload',
  reflection: 'Reflection',
  scenario: 'Scenario',
};

const pillarColors: Record<string, string> = {
  participation: 'bg-amp-participation text-primary-foreground',
  ownership: 'bg-amp-ownership text-primary-foreground',
  confidence: 'bg-amp-confidence text-accent-foreground',
};

const JourneyBuilder: React.FC = () => {
  const { data: journeys, isLoading: loadingJourneys } = useJourneys();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: items, isLoading: loadingItems, refetch: refetchItems } = useJourneyItems(selectedId || undefined);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [assignModal, setAssignModal] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Auto-select first journey
  useEffect(() => {
    if (journeys && journeys.length > 0 && !selectedId) {
      setSelectedId(journeys[0].id);
    }
  }, [journeys, selectedId]);

  const selectedJourney = journeys?.find(j => j.id === selectedId);
  const sortedItems = [...(items || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  // Drag & Drop
  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const onDrop = async (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...sortedItems];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    // Update order_index in DB
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('journey_items').update({ order_index: i }).eq('id', reordered[i].id);
    }
    setDragIdx(null);
    setDragOverIdx(null);
    refetchItems();
  };

  const handleSaveItem = async (item: any) => {
    if (item.id && items?.find(i => i.id === item.id)) {
      // Update
      const { error } = await supabase.from('journey_items').update({
        title: item.title,
        description: item.description,
        type: item.type,
        weight: item.weight,
        duration: item.duration,
        mandatory: item.mandatory,
        contributes_to: item.contributesTo || item.contributes_to || [],
        due_date: item.dueDate || item.due_date || null,
      }).eq('id', item.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Item updated');
    } else {
      // Insert
      const { error } = await supabase.from('journey_items').insert({
        journey_id: selectedId!,
        title: item.title,
        description: item.description,
        type: item.type,
        weight: item.weight || 10,
        duration: item.duration || '5 min',
        mandatory: item.mandatory ?? true,
        contributes_to: item.contributesTo || item.contributes_to || [],
        order_index: sortedItems.length,
        status: 'available',
      });
      if (error) { toast.error('Failed to add'); return; }
      toast.success('Item added');
    }
    refetchItems();
  };

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from('journey_items').delete().eq('id', itemId);
    toast.success('Item removed');
    refetchItems();
    if (expandedItem === itemId) setExpandedItem(null);
  };

  const handleDuplicateItem = async (item: any) => {
    await supabase.from('journey_items').insert({
      journey_id: selectedId!,
      title: `${item.title} (copy)`,
      description: item.description,
      type: item.type,
      weight: item.weight,
      duration: item.duration,
      mandatory: item.mandatory,
      contributes_to: item.contributes_to,
      order_index: sortedItems.length,
      status: 'available',
    });
    toast.success('Item duplicated');
    refetchItems();
  };

  if (loadingJourneys) {
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Journey Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Design behavioural adoption journeys with structured micro-actions</p>
          </div>
          <button className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            + New Journey
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Journey list */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Journeys</h3>
            {(journeys || []).map(j => (
              <button key={j.id} onClick={() => { setSelectedId(j.id); setExpandedItem(null); }}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all text-sm",
                  selectedId === j.id
                    ? "border-primary bg-primary/5 amp-shadow-card"
                    : "border-border hover:border-primary/30 hover:bg-secondary/50"
                )}>
                <p className="font-medium">{j.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{j.progress || 0}%</p>
              </button>
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
                      <button onClick={() => setAssignModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border font-medium hover:bg-secondary transition-colors">
                        <Users className="w-3.5 h-3.5" /> Assign
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedJourney.status === 'active' ? 'bg-amp-success/10 text-amp-success' :
                        selectedJourney.status === 'draft' ? 'bg-secondary text-muted-foreground' :
                        'bg-amp-info/10 text-amp-info'
                      }`}>{selectedJourney.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Weight: {selectedJourney.weight}</span>
                    <span>{sortedItems.filter(i => i.mandatory).length} mandatory items</span>
                    <span>{sortedItems.filter(i => i.status === 'completed').length}/{sortedItems.length} completed</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Workflow Items ({sortedItems.length})
                    </h3>
                    <button onClick={() => setItemModal({ open: true, item: null })}
                      className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>

                  {loadingItems ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : sortedItems.length === 0 ? (
                    <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
                      <p className="text-sm text-muted-foreground mb-3">No workflow items yet.</p>
                      <button onClick={() => setItemModal({ open: true, item: null })}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                        <Plus className="w-4 h-4 inline mr-1" /> Add First Item
                      </button>
                    </div>
                  ) : (
                    sortedItems.map((item, i) => {
                      const Icon = typeIcons[item.type] || Circle;
                      const expanded = expandedItem === item.id;
                      const isDragOver = dragOverIdx === i && dragIdx !== i;
                      const contributesTo = item.contributes_to || [];
                      return (
                        <div key={item.id} draggable onDragStart={onDragStart(i)} onDragOver={onDragOver(i)}
                          onDrop={() => onDrop(i)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                          className={cn(
                            "bg-card border rounded-xl amp-shadow-card overflow-hidden transition-all",
                            dragIdx === i ? "opacity-40 border-primary" : "border-border",
                            isDragOver && "border-primary border-dashed ring-2 ring-primary/20"
                          )}>
                          <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedItem(expanded ? null : item.id)}>
                            <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">{i + 1}</div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.status === 'completed' ? 'bg-amp-success/10' : 'bg-secondary'}`}>
                              {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-amp-success" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{item.title}</span>
                                {item.mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium shrink-0">required</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{typeLabels[item.type] || item.type}</span>
                                <span className="text-xs text-muted-foreground">· {item.duration}</span>
                                <span className="text-xs text-muted-foreground">· W:{item.weight}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 mr-2">
                              {contributesTo.map((c: string) => (
                                <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full ${pillarColors[c] || 'bg-secondary'}`}>
                                  {c[0].toUpperCase()}
                                </span>
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
                                <div><span className="text-muted-foreground">Completed:</span><p className="mt-0.5">{item.completed_date || '—'}</p></div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button onClick={(e) => { e.stopPropagation(); setItemModal({ open: true, item: { ...item, contributesTo: item.contributes_to, dueDate: item.due_date } }); }}
                                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1">
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDuplicateItem(item); }}
                                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1">
                                  <Copy className="w-3 h-3" /> Duplicate
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                  className="px-3 py-1.5 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <JourneyItemModal
        open={itemModal.open}
        onClose={() => setItemModal({ open: false, item: null })}
        onSave={handleSaveItem}
        item={itemModal.item}
      />

      {selectedJourney && (
        <AssignJourneyModal
          open={assignModal}
          onClose={() => setAssignModal(false)}
          journeyName={selectedJourney.name}
        />
      )}
    </AppLayout>
  );
};

export default JourneyBuilder;
