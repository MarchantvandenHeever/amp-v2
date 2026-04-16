import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MilestoneModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  milestone?: any | null;
  initiativeId: string;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({ open, onClose, onSaved, milestone, initiativeId }) => {
  const isEdit = !!milestone;
  const [form, setForm] = useState({
    name: '',
    status: 'upcoming',
    weight: 10,
    progress: 0,
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (milestone) {
      setForm({
        name: milestone.name || '',
        status: milestone.status || 'upcoming',
        weight: milestone.weight || 10,
        progress: milestone.progress || 0,
        start_date: milestone.start_date || '',
        end_date: milestone.end_date || '',
      });
    } else {
      setForm({ name: '', status: 'upcoming', weight: 10, progress: 0, start_date: '', end_date: '' });
    }
  }, [milestone, open]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      status: form.status,
      weight: form.weight,
      progress: form.progress,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    if (isEdit) {
      const { error } = await supabase.from('milestones').update(payload).eq('id', milestone.id);
      if (error) { toast.error('Failed to update milestone'); setSaving(false); return; }

      await supabase.from('ai_change_log').insert({
        change_type: 'edit_milestone',
        before_state: milestone,
        after_state: { ...milestone, ...payload },
        rationale: 'Manual edit by admin/change manager',
      });

      toast.success('Milestone updated');
    } else {
      const { error } = await supabase.from('milestones').insert({
        ...payload,
        initiative_id: initiativeId,
      });
      if (error) { toast.error('Failed to create milestone'); setSaving(false); return; }
      toast.success('Milestone created');
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Go-Live Readiness" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Weight</Label>
              <Input type="number" min={0} max={100} value={form.weight} onChange={e => setForm(prev => ({ ...prev, weight: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Progress (%)</Label>
            <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(prev => ({ ...prev, progress: Number(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Milestone')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
