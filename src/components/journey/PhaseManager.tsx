import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhaseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (phase: any) => void;
  phase?: any | null;
}

export const PhaseModal: React.FC<PhaseModalProps> = ({ open, onClose, onSave, phase }) => {
  const [form, setForm] = useState({
    name: phase?.name || '',
    description: phase?.description || '',
    status: phase?.status || 'inactive',
    start_date: phase?.start_date || '',
    end_date: phase?.end_date || '',
  });

  React.useEffect(() => {
    if (phase) {
      setForm({
        name: phase.name || '',
        description: phase.description || '',
        status: phase.status || 'inactive',
        start_date: phase.start_date || '',
        end_date: phase.end_date || '',
      });
    } else {
      setForm({ name: '', description: '', status: 'inactive', start_date: '', end_date: '' });
    }
  }, [phase, open]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ id: phase?.id, ...form });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{phase ? 'Edit Phase' : 'Add Phase'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Phase Name</Label>
            <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Onboarding" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date || ''} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date || ''} onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>
            {phase ? 'Update' : 'Add Phase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
