import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewInitiativeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const phases = [
  { value: 'design_build', label: 'Design & Build' },
  { value: 'training_testing', label: 'Training & Testing' },
  { value: 'post_go_live', label: 'Post Go-Live' },
];

export const NewInitiativeModal: React.FC<NewInitiativeModalProps> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState('design_build');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('initiatives').insert({
      name: name.trim(),
      description: description.trim() || null,
      phase,
      start_date: startDate || null,
      end_date: endDate || null,
      status: 'planning',
      progress: 0,
      user_count: 0,
    });
    setSaving(false);
    if (error) { toast.error('Failed to create initiative'); return; }
    toast.success('Initiative created');
    setName(''); setDescription(''); setPhase('design_build'); setStartDate(''); setEndDate('');
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">New Initiative</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Microsoft Copilot Rollout" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="What is this initiative about?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Phase</label>
              <select value={phase} onChange={e => setPhase(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {phases.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
              <input disabled value="Planning" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Initiative'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
