import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { JourneyItem } from '@/data/mockData';

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
  onSave: (item: JourneyItem) => void;
  item?: JourneyItem | null;
}

const defaultItem: Omit<JourneyItem, 'id'> = {
  type: 'content',
  title: '',
  description: '',
  weight: 10,
  duration: '5 min',
  mandatory: true,
  status: 'available',
  contributesTo: ['participation'],
  dueDate: '',
};

export const JourneyItemModal: React.FC<JourneyItemModalProps> = ({ open, onClose, onSave, item }) => {
  const [form, setForm] = useState<Omit<JourneyItem, 'id'>>(defaultItem);

  useEffect(() => {
    if (item) {
      const { id, ...rest } = item;
      setForm(rest);
    } else {
      setForm({ ...defaultItem });
    }
  }, [item, open]);

  const togglePillar = (p: typeof pillars[number]) => {
    setForm(prev => ({
      ...prev,
      contributesTo: prev.contributesTo.includes(p)
        ? prev.contributesTo.filter(x => x !== p)
        : [...prev.contributesTo, p],
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{item ? 'Edit Workflow Item' : 'Add Workflow Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(prev => ({ ...prev, type: v as JourneyItem['type'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {itemTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Introduction to Copilot" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="What should the user do?" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Weight</Label>
              <Input type="number" min={1} max={100} value={form.weight} onChange={e => setForm(prev => ({ ...prev, weight: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Input value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g. 10 min" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate || ''} onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v as JourneyItem['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.mandatory} onCheckedChange={v => setForm(prev => ({ ...prev, mandatory: v }))} />
            <Label>Mandatory</Label>
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
