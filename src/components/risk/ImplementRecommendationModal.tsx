import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Route, Loader2, AlertTriangle, User, Sparkles } from 'lucide-react';

interface RiskFlag {
  id: string;
  type: string;
  severity: string;
  description: string | null;
  recommendation: string | null;
  user_id: string;
  profiles?: { display_name: string; team: string | null } | null;
}

interface Intervention {
  action: string;
  target: string;
  impact: string;
  users: number;
}

interface Journey {
  id: string;
  name: string;
}

interface ImplementRecommendationModalProps {
  open: boolean;
  onClose: () => void;
  riskFlag?: RiskFlag | null;
  intervention?: Intervention | null;
  onImplemented: () => void;
}

export const ImplementRecommendationModal: React.FC<ImplementRecommendationModalProps> = ({
  open, onClose, riskFlag, intervention, onImplemented
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'journey'>('content');
  const [saving, setSaving] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);

  // Content form
  const [contentTitle, setContentTitle] = useState('');
  const [contentDesc, setContentDesc] = useState('');
  const [contentType, setContentType] = useState('document');

  // Journey form
  const [selectedJourney, setSelectedJourney] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemType, setItemType] = useState('activity');
  const [itemWeight, setItemWeight] = useState(15);
  const [contributesTo, setContributesTo] = useState<string[]>(['participation']);

  const source = riskFlag || intervention;
  const sourceLabel = riskFlag
    ? `${riskFlag.type} — ${riskFlag.profiles?.display_name || 'Unknown'}`
    : intervention
    ? `${intervention.action} — ${intervention.target}`
    : '';
  const recommendation = riskFlag?.recommendation || intervention?.action || '';

  useEffect(() => {
    if (open) {
      // Pre-fill from recommendation
      const prefix = riskFlag ? `[Risk Intervention] ` : `[Intervention] `;
      setContentTitle(prefix + recommendation);
      setContentDesc(riskFlag?.description || `Targeted intervention: ${recommendation}`);
      setItemTitle(prefix + recommendation);
      setItemDesc(riskFlag?.description || `Targeted action for: ${intervention?.target || 'affected users'}`);

      // Infer contributes_to from risk type
      if (riskFlag?.type) {
        const t = riskFlag.type.toLowerCase();
        if (t.includes('participation') || t.includes('disengage')) setContributesTo(['participation']);
        else if (t.includes('ownership') || t.includes('evidence')) setContributesTo(['ownership']);
        else if (t.includes('confidence')) setContributesTo(['confidence']);
        else setContributesTo(['participation', 'ownership']);
      }

      // Fetch journeys
      supabase.from('journeys').select('id, name').order('name').then(({ data }) => {
        if (data) setJourneys(data);
      });
    }
  }, [open, riskFlag, intervention, recommendation]);

  const togglePillar = (p: string) => {
    setContributesTo(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleCreateContent = async () => {
    if (!contentTitle.trim()) { toast.error('Title is required'); return; }
    setSaving(true);

    const { error } = await supabase.from('content_items').insert({
      title: contentTitle.trim(),
      description: contentDesc.trim() || null,
      type: contentType,
      status: 'draft',
      content_body: JSON.stringify({
        source: 'risk_recommendation',
        risk_flag_id: riskFlag?.id || null,
        intervention: intervention?.action || null,
        auto_generated: true,
      }),
    });

    if (error) {
      toast.error('Failed to create content');
      setSaving(false);
      return;
    }

    // Mark risk flag as resolved if from a risk flag
    if (riskFlag) {
      await supabase.from('risk_flags').update({ resolved: true }).eq('id', riskFlag.id);
    }

    toast.success('Content created in Content Library');
    setSaving(false);
    onImplemented();
    onClose();
  };

  const handleAddToJourney = async () => {
    if (!itemTitle.trim()) { toast.error('Title is required'); return; }
    if (!selectedJourney) { toast.error('Select a journey'); return; }
    setSaving(true);

    // Get max order_index for this journey
    const { data: existing } = await supabase
      .from('journey_items')
      .select('order_index')
      .eq('journey_id', selectedJourney)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.order_index || 0) + 1;

    const { error } = await supabase.from('journey_items').insert({
      journey_id: selectedJourney,
      title: itemTitle.trim(),
      description: itemDesc.trim() || null,
      type: itemType,
      weight: itemWeight,
      mandatory: true,
      order_index: nextOrder,
      status: 'available',
      contributes_to: contributesTo,
    });

    if (error) {
      toast.error('Failed to add journey item');
      setSaving(false);
      return;
    }

    // Mark risk flag as resolved
    if (riskFlag) {
      await supabase.from('risk_flags').update({ resolved: true }).eq('id', riskFlag.id);
    }

    toast.success('Item added to journey');
    setSaving(false);
    onImplemented();
    onClose();
  };

  const handleDismiss = async () => {
    if (riskFlag) {
      await supabase.from('risk_flags').update({ resolved: true }).eq('id', riskFlag.id);
      toast.info('Risk flag dismissed');
      onImplemented();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Implement Recommendation
          </DialogTitle>
        </DialogHeader>

        {/* Source info card */}
        <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="uppercase font-medium tracking-wider">Source</span>
            {riskFlag && (
              <Badge variant="outline" className={
                riskFlag.severity === 'high' ? 'border-amp-risk/30 text-amp-risk' : 'border-amp-warning/30 text-amp-confidence'
              }>{riskFlag.severity}</Badge>
            )}
            {intervention && (
              <Badge variant="outline" className={
                intervention.impact === 'High' ? 'border-amp-risk/30 text-amp-risk' : 'border-amp-warning/30 text-amp-confidence'
              }>{intervention.impact} impact</Badge>
            )}
          </div>
          <p className="text-sm font-medium">{sourceLabel}</p>
          <p className="text-sm text-primary font-medium">{recommendation}</p>
          {riskFlag?.profiles && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <User className="w-3 h-3" />
              {riskFlag.profiles.display_name} · {riskFlag.profiles.team || 'No team'}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'content' | 'journey')}>
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1 gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Create Content
            </TabsTrigger>
            <TabsTrigger value="journey" className="flex-1 gap-1.5">
              <Route className="w-3.5 h-3.5" /> Add to Journey
            </TabsTrigger>
          </TabsList>

          {/* Create Content Tab */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={contentTitle} onChange={e => setContentTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={contentDesc} onChange={e => setContentDesc(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="standard_form">Form / Checklist</SelectItem>
                  <SelectItem value="confidence_form">Confidence Check</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              This will create a draft content item in the Content Library. You can edit and add assets from there.
            </p>
          </TabsContent>

          {/* Add to Journey Tab */}
          <TabsContent value="journey" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Target Journey</Label>
              <Select value={selectedJourney} onValueChange={setSelectedJourney}>
                <SelectTrigger><SelectValue placeholder="Select a journey..." /></SelectTrigger>
                <SelectContent>
                  {journeys.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Item Title</Label>
              <Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Item Type</Label>
                <Select value={itemType} onValueChange={setItemType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Activity / Task</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="confidence_check">Confidence Check</SelectItem>
                    <SelectItem value="evidence_upload">Evidence Upload</SelectItem>
                    <SelectItem value="reflection">Reflection</SelectItem>
                    <SelectItem value="scenario">Scenario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Weight</Label>
                <Input type="number" min={1} max={100} value={itemWeight} onChange={e => setItemWeight(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contributes to</Label>
              <div className="flex gap-3">
                {['participation', 'ownership', 'confidence'].map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                    <Checkbox checked={contributesTo.includes(p)} onCheckedChange={() => togglePillar(p)} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This will append a new step to the selected journey as an available item.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleDismiss} className="text-muted-foreground">
            Dismiss
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={activeTab === 'content' ? handleCreateContent : handleAddToJourney}
            disabled={saving}
            className="gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {activeTab === 'content' ? 'Create Content' : 'Add to Journey'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
