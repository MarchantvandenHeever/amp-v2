import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SubJourneyModalProps {
  open: boolean;
  onClose: () => void;
  onLink: (journeyId: string, phaseId: string) => void;
  availableJourneys: any[];
  phases: any[];
  currentJourneyId: string;
}

export const SubJourneyModal: React.FC<SubJourneyModalProps> = ({ open, onClose, onLink, availableJourneys, phases, currentJourneyId }) => {
  const [selectedJourney, setSelectedJourney] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');

  useEffect(() => {
    setSelectedJourney('');
    setSelectedPhase('');
  }, [open]);

  const linkable = availableJourneys.filter(j => j.id !== currentJourneyId && !j.parent_journey_id);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Link Sub-Journey to Phase</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Select Journey</Label>
            <Select value={selectedJourney} onValueChange={setSelectedJourney}>
              <SelectTrigger><SelectValue placeholder="Choose a journey" /></SelectTrigger>
              <SelectContent>
                {linkable.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Link to Phase</Label>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger><SelectValue placeholder="Choose a phase" /></SelectTrigger>
              <SelectContent>
                {phases.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onLink(selectedJourney, selectedPhase); onClose(); }} disabled={!selectedJourney || !selectedPhase}>
            Link Journey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
