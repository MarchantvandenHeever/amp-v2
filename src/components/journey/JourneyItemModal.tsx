import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContentItems } from '@/hooks/useSupabaseData';
import { JourneyItem } from '@/data/mockData';
import { FileText, Search } from 'lucide-react';

const itemTypes = [
  { value: 'content', label: 'Content' },
  { value: 'activity', label: 'Activity / Task' },
  { value: 'form', label: 'Form' },
  { value: 'confidence_check', label: 'Confidence Check' },
  { value: 'evidence_upload', label: 'Evidence Upload' },
  { value: 'reflection', label: 'Reflection' },
  { value: 'scenario', label: 'Scenario / Checkpoint' },
];

const pillars = ['participation', 'ownership', 'confidence'] as const;

interface JourneyItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
  item?: any | null;
  existingItems?: any[];
  phases?: any[];
}

export const JourneyItemModal: React.FC<JourneyItemModalProps> = ({ open, onClose, onSave, item, existingItems = [], phases = [] }) => {
  const { data: contentItems } = useContentItems();
  const [tab, setTab] = useState<string>('custom');
  const [contentSearch, setContentSearch] = useState('');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: 'content' as string,
    title: '',
    description: '',
    weight: 10,
    duration: '5 min',
    mandatory: true,
    status: 'available' as string,
    contributesTo: ['participation'] as string[],
    dueDate: '',
    executionMode: 'series' as string,
    predecessorId: '' as string,
    phaseId: '' as string,
    contentItemId: '' as string,
  });

  useEffect(() => {
    if (item) {
      setForm({
        type: item.type || 'content',
        title: item.title || '',
        description: item.description || '',
        weight: item.weight || 10,
        duration: item.duration || '5 min',
        mandatory: item.mandatory ?? true,
        status: item.status || 'available',
        contributesTo: item.contributesTo || item.contributes_to || ['participation'],
        dueDate: item.dueDate || item.due_date || '',
        executionMode: item.executionMode || item.execution_mode || 'series',
        predecessorId: item.predecessorId || item.predecessor_id || '',
        phaseId: item.phaseId || item.phase_id || '',
        contentItemId: item.contentItemId || item.content_item_id || '',
      });
      setTab('custom');
      setSelectedContentId(item.content_item_id || null);
    } else {
      setForm({
        type: 'content', title: '', description: '', weight: 10, duration: '5 min',
        mandatory: true, status: 'available', contributesTo: ['participation'], dueDate: '',
        executionMode: 'series', predecessorId: '', phaseId: '', contentItemId: '',
      });
      setTab('custom');
      setSelectedContentId(null);
    }
  }, [item, open]);

  const togglePillar = (p: string) => {
    setForm(prev => ({
      ...prev,
      contributesTo: prev.contributesTo.includes(p)
        ? prev.contributesTo.filter(x => x !== p)
        : [...prev.contributesTo, p],
    }));
  };

  const filteredContent = (contentItems || []).filter(c =>
    c.title.toLowerCase().includes(contentSearch.toLowerCase()) ||
    (c.type || '').toLowerCase().includes(contentSearch.toLowerCase())
  );

  const selectContent = (c: any) => {
    setSelectedContentId(c.id);
    setForm(prev => ({
      ...prev,
      title: c.title,
      description: c.description || '',
      type: 'content',
      contentItemId: c.id,
    }));
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      id: item?.id || `ji-new-${Date.now()}`,
      ...form,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{item ? 'Edit Workflow Item' : 'Add Workflow Item'}</DialogTitle>
        </DialogHeader>

        {!item && (
          <Tabs value={tab} onValueChange={setTab} className="mb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="custom">Create New</TabsTrigger>
              <TabsTrigger value="library">From Content Library</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="mt-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search content library..." value={contentSearch} onChange={e => setContentSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {filteredContent.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No content items found</p>
                ) : filteredContent.map(c => (
                  <button key={c.id} onClick={() => selectContent(c)}
                    className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${selectedContentId === c.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary border border-transparent'}`}>
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.type} · {c.status}</p>
                    </div>
                  </button>
                ))}
              </div>
              {selectedContentId && <p className="text-xs text-amp-success mt-2">✓ Content selected — customise details below</p>}
            </TabsContent>
          </Tabs>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {itemTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Execution Mode</Label>
              <Select value={form.executionMode} onValueChange={v => setForm(prev => ({ ...prev, executionMode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="series">Series (Sequential)</SelectItem>
                  <SelectItem value="parallel">Parallel (Concurrent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Introduction to Copilot" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="What should the user do?" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Weight</Label>
              <Input type="number" min={1} max={100} value={form.weight} onChange={e => setForm(prev => ({ ...prev, weight: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Input value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g. 10 min" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate || ''} onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} />
            </div>
          </div>

          {existingItems.length > 0 && (
            <div className="space-y-1.5">
              <Label>Depends On (Predecessor)</Label>
              <Select value={form.predecessorId || 'none'} onValueChange={v => setForm(prev => ({ ...prev, predecessorId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="No dependency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No dependency</SelectItem>
                  {existingItems.filter(i => i.id !== item?.id).map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {phases.length > 0 && (
            <div className="space-y-1.5">
              <Label>Phase</Label>
              <Select value={form.phaseId || 'none'} onValueChange={v => setForm(prev => ({ ...prev, phaseId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="No phase" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No phase</SelectItem>
                  {phases.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch checked={form.mandatory} onCheckedChange={v => setForm(prev => ({ ...prev, mandatory: v }))} />
              <Label>Mandatory</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contributes to</Label>
            <div className="flex gap-3">
              {pillars.map(p => (
                <label key={p} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                  <Checkbox checked={form.contributesTo.includes(p)} onCheckedChange={() => togglePillar(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title.trim()}>
            {item ? 'Update' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
