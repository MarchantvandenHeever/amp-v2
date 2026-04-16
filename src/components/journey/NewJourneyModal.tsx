import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useInitiatives } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';

interface JourneyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  journey?: any | null;
}

const journeyStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export const NewJourneyModal: React.FC<JourneyModalProps> = ({ open, onClose, onCreated, journey }) => {
  const { data: initiatives } = useInitiatives();
  const isEdit = !!journey;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initiativeId, setInitiativeId] = useState('');
  const [weight, setWeight] = useState(10);
  const [status, setStatus] = useState('draft');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (journey) {
      setName(journey.name || '');
      setDescription(journey.description || '');
      setInitiativeId(journey.initiative_id || '');
      setWeight(journey.weight || 10);
      setStatus(journey.status || 'draft');
      setProgress(journey.progress || 0);
    } else {
      setName(''); setDescription(''); setInitiativeId(''); setWeight(10); setStatus('draft'); setProgress(0);
    }
  }, [journey, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      initiative_id: initiativeId || null,
      weight,
      status,
      progress,
    };

    if (isEdit) {
      const { error } = await supabase.from('journeys').update(payload).eq('id', journey.id);
      if (error) { toast.error('Failed to update journey'); setSaving(false); return; }

      await supabase.from('ai_change_log').insert({
        change_type: 'edit_journey',
        journey_id: journey.id,
        before_state: journey,
        after_state: { ...journey, ...payload },
        rationale: 'Manual edit by admin/change manager',
      });

      toast.success('Journey updated');
    } else {
      const { error } = await supabase.from('journeys').insert({ ...payload });
      if (error) { toast.error('Failed to create journey'); setSaving(false); return; }
      toast.success('Journey created');
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Edit Journey' : 'New Journey'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Copilot Onboarding" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="What does this journey cover?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Initiative</label>
              <select value={initiativeId} onChange={e => setInitiativeId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">None</option>
                {(initiatives || []).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Weight</label>
              <input type="number" min={0} max={100} value={weight} onChange={e => setWeight(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          {isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {journeyStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Progress (%)</label>
                <input type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Journey')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
