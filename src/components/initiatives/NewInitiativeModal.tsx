import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InitiativeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initiative?: any | null;
}

const phases = [
  { value: 'design_build', label: 'Design & Build' },
  { value: 'training_testing', label: 'Training & Testing' },
  { value: 'post_go_live', label: 'Post Go-Live' },
];

const statuses = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export const NewInitiativeModal: React.FC<InitiativeModalProps> = ({ open, onClose, onCreated, initiative }) => {
  const isEdit = !!initiative;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState('design_build');
  const [status, setStatus] = useState('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initiative) {
      setName(initiative.name || '');
      setDescription(initiative.description || '');
      setPhase(initiative.phase || 'design_build');
      setStatus(initiative.status || 'planning');
      setStartDate(initiative.start_date || '');
      setEndDate(initiative.end_date || '');
      setProgress(initiative.progress || 0);
    } else {
      setName(''); setDescription(''); setPhase('design_build'); setStatus('planning');
      setStartDate(''); setEndDate(''); setProgress(0);
    }
  }, [initiative, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      phase,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      progress,
    };

    if (isEdit) {
      // Log change to ai_change_log for audit
      const { error } = await supabase.from('initiatives').update(payload).eq('id', initiative.id);
      if (error) { toast.error('Failed to update initiative'); setSaving(false); return; }
      
      await supabase.from('ai_change_log').insert({
        change_type: 'edit_initiative',
        journey_id: null,
        journey_item_id: null,
        before_state: initiative,
        after_state: { ...initiative, ...payload },
        rationale: 'Manual edit by admin/change manager',
      });

      toast.success('Initiative updated');
    } else {
      const { error } = await supabase.from('initiatives').insert({
        ...payload,
        user_count: 0,
      });
      if (error) { toast.error('Failed to create initiative'); setSaving(false); return; }
      toast.success('Initiative created');
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Edit Initiative' : 'New Initiative'}</DialogTitle>
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
              {isEdit ? (
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : (
                <input disabled value="Planning" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground" />
              )}
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Progress (%)</label>
              <input type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          )}
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
              {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Initiative')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
