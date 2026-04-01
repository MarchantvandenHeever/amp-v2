import React, { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { journeys as initialJourneys, JourneyItem, Journey } from '@/data/mockData';
import { motion } from 'framer-motion';
import { GripVertical, Plus, ChevronDown, ChevronUp, Settings, CheckCircle2, Circle, Upload, MessageSquare, Star, Target, FileText, Trash2, Edit, Users, Copy } from 'lucide-react';
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

const pillarColors = {
  participation: 'bg-amp-participation text-primary-foreground',
  ownership: 'bg-amp-ownership text-primary-foreground',
  confidence: 'bg-amp-confidence text-accent-foreground',
};

const JourneyBuilder: React.FC = () => {
  const [journeyList, setJourneyList] = useState<Journey[]>(() => JSON.parse(JSON.stringify(initialJourneys)));
  const [selectedId, setSelectedId] = useState(journeyList[1]?.id);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState<{ open: boolean; item: JourneyItem | null }>({ open: false, item: null });
  const [assignModal, setAssignModal] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const selectedJourney = journeyList.find(j => j.id === selectedId)!;

  const updateJourney = useCallback((updater: (j: Journey) => Journey) => {
    setJourneyList(prev => prev.map(j => j.id === selectedId ? updater(j) : j));
  }, [selectedId]);

  // ---- Drag & Drop ----
  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const onDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    updateJourney(j => {
      const items = [...j.items];
      const [moved] = items.splice(dragIdx, 1);
      items.splice(idx, 0, moved);
      return { ...j, items };
    });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const onDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  // ---- CRUD ----
  const handleSaveItem = (item: JourneyItem) => {
    updateJourney(j => {
      const exists = j.items.find(i => i.id === item.id);
      if (exists) {
        return { ...j, items: j.items.map(i => i.id === item.id ? item : i) };
      }
      return { ...j, items: [...j.items, item] };
    });
    toast.success(itemModal.item ? 'Item updated' : 'Item added');
  };

  const handleDeleteItem = (itemId: string) => {
    updateJourney(j => ({ ...j, items: j.items.filter(i => i.id !== itemId) }));
    toast.success('Item removed');
    if (expandedItem === itemId) setExpandedItem(null);
  };

  const handleDuplicateItem = (item: JourneyItem) => {
    const dup = { ...item, id: `ji-dup-${Date.now()}`, title: `${item.title} (copy)`, status: 'available' as const };
    updateJourney(j => ({ ...j, items: [...j.items, dup] }));
    toast.success('Item duplicated');
  };

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
            {journeyList.map(j => (
              <button key={j.id} onClick={() => { setSelectedId(j.id); setExpandedItem(null); }}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all text-sm",
                  selectedId === j.id
                    ? "border-primary bg-primary/5 amp-shadow-card"
                    : "border-border hover:border-primary/30 hover:bg-secondary/50"
                )}>
                <p className="font-medium">{j.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{j.items.length} items · {j.progress}%</p>
              </button>
            ))}
          </div>

          {/* Journey detail / builder */}
          <div className="lg:col-span-3 space-y-4">
            {/* Journey metadata */}
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
                <span>{selectedJourney.items.filter(i => i.mandatory).length} mandatory items</span>
                <span>{selectedJourney.items.filter(i => i.status === 'completed').length}/{selectedJourney.items.length} completed</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Workflow Items ({selectedJourney.items.length})
                </h3>
                <button onClick={() => setItemModal({ open: true, item: null })}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>

              {selectedJourney.items.length === 0 && (
                <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No workflow items yet. Add your first micro-action.</p>
                  <button onClick={() => setItemModal({ open: true, item: null })}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4 inline mr-1" /> Add First Item
                  </button>
                </div>
              )}

              {selectedJourney.items.map((item, i) => {
                const Icon = typeIcons[item.type] || Circle;
                const expanded = expandedItem === item.id;
                const isDragOver = dragOverIdx === i && dragIdx !== i;
                return (
                  <div
                    key={item.id}
                    draggable
                    draggable
                    onDragStart={onDragStart(i)}
                    onDragOver={onDragOver(i)}
                    onDrop={onDrop(i)}
                    onDragEnd={onDragEnd}
                    className={cn(
                      "bg-card border rounded-xl amp-shadow-card overflow-hidden transition-all",
                      dragIdx === i ? "opacity-40 border-primary" : "border-border",
                      isDragOver && "border-primary border-dashed ring-2 ring-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedItem(expanded ? null : item.id)}>
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">{i + 1}</div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.status === 'completed' ? 'bg-amp-success/10' : 'bg-secondary'
                      }`}>
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-amp-success" />
                        ) : (
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{item.title}</span>
                          {item.mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium shrink-0">required</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{typeLabels[item.type]}</span>
                          <span className="text-xs text-muted-foreground">· {item.duration}</span>
                          <span className="text-xs text-muted-foreground">· W:{item.weight}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 mr-2">
                        {item.contributesTo.map(c => (
                          <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full ${pillarColors[c]}`}>
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
                          <div><span className="text-muted-foreground">Due Date:</span><p className="mt-0.5">{item.dueDate || '—'}</p></div>
                          <div><span className="text-muted-foreground">Completed:</span><p className="mt-0.5">{item.completedDate || '—'}</p></div>
                          <div><span className="text-muted-foreground">Contributes to:</span>
                            <p className="mt-0.5 capitalize">{item.contributesTo.join(', ')}</p>
                          </div>
                          <div><span className="text-muted-foreground">Mandatory:</span><p className="mt-0.5">{item.mandatory ? 'Yes' : 'No'}</p></div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={(e) => { e.stopPropagation(); setItemModal({ open: true, item }); }}
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
              })}
            </div>
          </div>
        </div>
      </div>

      <JourneyItemModal
        open={itemModal.open}
        onClose={() => setItemModal({ open: false, item: null })}
        onSave={handleSaveItem}
        item={itemModal.item}
      />

      <AssignJourneyModal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        journeyName={selectedJourney.name}
      />
    </AppLayout>
  );
};

export default JourneyBuilder;
