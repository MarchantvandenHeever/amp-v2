import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useProfiles } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AssignJourneyModalProps {
  open: boolean;
  onClose: () => void;
  journeyName: string;
  journeyId?: string;
}

export const AssignJourneyModal: React.FC<AssignJourneyModalProps> = ({ open, onClose, journeyName, journeyId }) => {
  const { data: profiles, isLoading } = useProfiles();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const assignable = (profiles || []).filter(p => p.role !== 'super_admin');
  const teams = [...new Set(assignable.map(u => u.team).filter(Boolean))] as string[];

  const filtered = assignable.filter(u => {
    const matchSearch = u.display_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchTeam = !filterTeam || u.team === filterTeam;
    return matchSearch && matchTeam;
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(u => u.id)));
    }
  };

  const handleAssign = async () => {
    if (!journeyId || selected.size === 0) {
      toast.success(`Assigned "${journeyName}" to ${selected.size} user${selected.size !== 1 ? 's' : ''}`);
      setSelected(new Set());
      onClose();
      return;
    }

    setAssigning(true);
    const rows = [...selected].map(userId => ({
      journey_id: journeyId,
      user_id: userId,
      status: 'assigned',
    }));

    const { error } = await supabase.from('assignments').insert(rows);
    setAssigning(false);

    if (error) {
      toast.error('Failed to assign users');
      return;
    }

    toast.success(`Assigned "${journeyName}" to ${selected.size} user${selected.size !== 1 ? 's' : ''}`);
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">Assign Journey</DialogTitle>
          <p className="text-sm text-muted-foreground">Select users to assign <strong>{journeyName}</strong></p>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterTeam(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filterTeam ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary'}`}
            >All</button>
            {teams.map(t => (
              <button key={t} onClick={() => setFilterTeam(filterTeam === t ? null : t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterTeam === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary'}`}
              >{t}</button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button onClick={selectAll} className="hover:text-foreground transition-colors">
              {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
            <span>{selected.size} selected</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 border rounded-lg p-2">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.map(u => (
              <label key={u.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selected.has(u.id) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-secondary border border-transparent'}`}>
                <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.team || '—'} · {u.persona || u.role}</p>
                  </div>
                </div>
              </label>
            ))}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No users match your search</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || assigning}>
            {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Users className="w-4 h-4 mr-1.5" />}
            Assign ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
