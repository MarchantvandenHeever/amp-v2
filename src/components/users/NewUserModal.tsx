import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const roles = [
  { value: 'end_user', label: 'End User' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'change_manager', label: 'Change Manager' },
];

const personas = ['Power User', 'Standard User', 'Reluctant User', 'Manager'];
const teams = ['Sales', 'Marketing', 'Engineering', 'Operations'];

export const NewUserModal: React.FC<NewUserModalProps> = ({ open, onClose, onCreated }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('end_user');
  const [team, setTeam] = useState('Sales');
  const [persona, setPersona] = useState('Standard User');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim() || !email.trim()) { toast.error('Name and email are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').insert({
      display_name: displayName.trim(),
      email: email.trim(),
      role: role as any,
      team,
      persona,
    });
    setSaving(false);
    if (error) { toast.error('Failed to create user'); return; }
    toast.success('User created');
    setDisplayName(''); setEmail(''); setRole('end_user'); setTeam('Sales'); setPersona('Standard User');
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Add User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Full Name *</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="jane@acmecorp.com" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Team</label>
              <select value={team} onChange={e => setTeam(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Persona</label>
              <select value={persona} onChange={e => setPersona(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {personas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Creating...' : 'Add User'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
