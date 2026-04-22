import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRiskFlags } from '@/hooks/useSupabaseData';
import { useRecommendations } from '@/hooks/useRecommendations';
import { AlertTriangle, TrendingDown, Eye, Lightbulb, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ImplementRecommendationModal } from '@/components/risk/ImplementRecommendationModal';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageHero, KpiTile, StatusChip, type ChipTone } from '@/components/cl';

const severityTone: Record<string, ChipTone> = {
  critical: 'risk',
  high: 'risk',
  medium: 'warning',
  low: 'neutral',
};

const RiskInsights: React.FC = () => {
  const { data: riskFlags, isLoading, refetch } = useRiskFlags();
  const { data: recommendations, isLoading: loadingRecs, refetch: refetchRecs } = useRecommendations();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);

  const handleImplementRisk = (flag: any) => {
    setSelectedRisk(flag);
    setSelectedIntervention(null);
    setModalOpen(true);
  };

  const handleImplementIntervention = (rec: any) => {
    setSelectedRisk(null);
    setSelectedIntervention({ action: rec.title, target: rec.description || rec.rationale, impact: rec.severity, _id: rec.id });
    setModalOpen(true);
  };

  const handleDismissRecommendation = async (id: string) => {
    await supabase.from('recommendation_records').update({ review_status: 'dismissed' }).eq('id', id);
    toast.success('Recommendation dismissed');
    refetchRecs();
  };

  const handleImplemented = () => {
    refetch();
    refetchRecs();
    queryClient.invalidateQueries({ queryKey: ['content_items'] });
    queryClient.invalidateQueries({ queryKey: ['journey_items'] });
    queryClient.invalidateQueries({ queryKey: ['journeys'] });
  };

  if (isLoading || loadingRecs) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const flags = riskFlags || [];
  const highRisk = flags.filter(r => r.severity === 'high');
  const medRisk = flags.filter(r => r.severity === 'medium');

  const pendingRecs = (recommendations || []).filter(r => r.review_status === 'pending' || r.review_status === 'saved');
  const appliedRecs = (recommendations || []).filter(r => r.review_status === 'approved');

  return (
    <AppLayout>
      <div className="-m-6 mb-6">
        <PageHero
          title="Risk & Insights"
          subtitle="Where behaviour is fragile and where reinforcement is working"
          size="sm"
        />
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiTile label="High Risk" value={highRisk.length} tone="risk" icon={<AlertTriangle className="w-4 h-4" />} />
          <KpiTile label="Medium Risk" value={medRisk.length} tone="warning" icon={<TrendingDown className="w-4 h-4" />} />
          <KpiTile label="Total Flags" value={flags.length} icon={<Eye className="w-4 h-4" />} />
        </div>

        <div className="cl-card p-6">
          <h3 className="font-heading font-semibold mb-4">Active Risk Flags</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 cl-section-label">User</th>
                  <th className="text-left py-2 px-3 cl-section-label">Team</th>
                  <th className="text-left py-2 px-3 cl-section-label">Risk Type</th>
                  <th className="text-left py-2 px-3 cl-section-label">Severity</th>
                  <th className="text-left py-2 px-3 cl-section-label">Recommendation</th>
                  <th className="text-right py-2 px-3 cl-section-label">Action</th>
                </tr>
              </thead>
              <tbody>
                {flags.map(flag => {
                  const profile = (flag as any).profiles;
                  return (
                    <tr key={flag.id} className="border-b border-border/50 hover:bg-secondary/50">
                      <td className="py-2.5 px-3 font-medium">{profile?.display_name || '—'}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{profile?.team || '—'}</td>
                      <td className="py-2.5 px-3">{flag.type}</td>
                      <td className="py-2.5 px-3">
                        <StatusChip tone={severityTone[flag.severity] || 'neutral'}>{flag.severity}</StatusChip>
                      </td>
                      <td className="py-2.5 px-3 text-primary text-xs font-medium max-w-xs">{flag.recommendation}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleImplementRisk(flag)}>
                          <Sparkles className="w-3.5 h-3.5" /> Implement
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {flags.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No active risk flags</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cl-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amp-confidence" />
            <h3 className="font-heading font-semibold">Recommended Interventions</h3>
          </div>
          <div className="space-y-2">
            {pendingRecs.length === 0 && appliedRecs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No recommendations yet. Run the AI insight miner to generate recommendations.</p>
            )}
            {pendingRecs.map((rec, i) => (
              <motion.div key={rec.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">{rec.rationale || rec.description}</p>
                </div>
                <StatusChip tone={severityTone[rec.severity] || 'neutral'}>{rec.severity}</StatusChip>
                <span className="text-xs text-muted-foreground capitalize">{rec.recommendation_type.replace(/_/g, ' ')}</span>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleImplementIntervention(rec)}>
                  <Sparkles className="w-3.5 h-3.5" /> Implement
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => handleDismissRecommendation(rec.id)}>
                  Dismiss
                </Button>
              </motion.div>
            ))}
            {appliedRecs.map((rec) => (
              <div key={rec.id} className="flex items-center gap-4 p-3 rounded-lg border border-amp-success/20 bg-amp-success/5">
                <div className="flex-1">
                  <p className="text-sm font-medium line-through text-muted-foreground">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">{rec.rationale || rec.description}</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-amp-success font-medium px-3 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ImplementRecommendationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedRisk(null); setSelectedIntervention(null); }}
        riskFlag={selectedRisk}
        intervention={selectedIntervention}
        onImplemented={handleImplemented}
      />
    </AppLayout>
  );
};

export default RiskInsights;
