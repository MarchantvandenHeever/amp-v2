import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInsightsByType } from '@/hooks/useInsights';
import { useInitiatives } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Brain, AlertTriangle, HelpCircle, Users, Filter, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHero, KpiTile, StatusChip, type ChipTone } from '@/components/cl';

const insightTypeLabels: Record<string, string> = {
  confusion: 'Confusion',
  hesitation: 'Hesitation',
  low_confidence: 'Low Confidence',
  weak_ownership: 'Weak Ownership',
  sequencing_issue: 'Sequencing Issue',
  role_irrelevance: 'Role Irrelevance',
  learning_gap: 'Learning Gap',
  milestone_friction: 'Milestone Friction',
  reminder_dependency: 'Reminder Dependency',
  workload_friction: 'Workload Friction',
  sentiment_drop: 'Sentiment Drop',
  alignment_concern: 'Alignment Concern',
  risk_flag: 'Risk Flag',
  champion_candidate: 'Champion Candidate',
};

const severityTone: Record<string, ChipTone> = {
  critical: 'risk',
  high: 'risk',
  medium: 'warning',
  low: 'neutral',
};

const dimensionColors: Record<string, string> = {
  participation: 'bg-amp-participation/10 text-amp-participation',
  ownership: 'bg-amp-ownership/10 text-amp-ownership',
  confidence: 'bg-amp-confidence/10 text-amp-confidence',
};

const InsightConsole: React.FC = () => {
  const { data: initiatives } = useInitiatives();
  const [selectedInitiative, setSelectedInitiative] = useState<string>('');
  const { grouped, insights, isLoading, refetch } = useInsightsByType(selectedInitiative || undefined);
  const [mining, setMining] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');

  const handleMineInsights = async () => {
    setMining(true);
    try {
      const { error } = await supabase.functions.invoke('ai-insight-miner', {
        body: { initiative_id: selectedInitiative || null },
      });
      if (error) throw error;
      toast.success('Insight mining complete');
      refetch();
    } catch {
      toast.error('Failed to mine insights');
    } finally {
      setMining(false);
    }
  };

  const filteredInsights = (insights || []).filter(i => {
    if (filterType && i.insight_type !== filterType) return false;
    if (filterSeverity && i.severity !== filterSeverity) return false;
    return true;
  });

  const typeStats = Object.entries(grouped).map(([type, items]) => ({
    type,
    label: insightTypeLabels[type] || type,
    count: (items as any[]).length,
    critical: (items as any[]).filter((i: any) => i.severity === 'critical' || i.severity === 'high').length,
  })).sort((a, b) => b.count - a.count);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="-m-6 mb-6">
        <PageHero
          title="Insight Console"
          subtitle="AI-mined behavioural signals from user interactions and platform data"
          size="sm"
        >
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)}
              className="text-sm rounded-full px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white border border-white/20">
              <option value="" className="text-foreground">All Initiatives</option>
              {(initiatives || []).map(i => (
                <option key={i.id} value={i.id} className="text-foreground">{i.name}</option>
              ))}
            </select>
            <button onClick={handleMineInsights} disabled={mining}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-primary text-sm font-semibold disabled:opacity-50 hover:bg-white/90 transition-colors">
              {mining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Mine Insights
            </button>
          </div>
        </PageHero>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiTile label="Total Insights" value={(insights || []).length} iconTone="info" icon={<Brain className="w-4 h-4" />} />
          <KpiTile label="Critical/High" value={(insights || []).filter(i => i.severity === 'critical' || i.severity === 'high').length} iconTone="risk" icon={<AlertTriangle className="w-4 h-4" />} />
          <KpiTile label="Confusion" value={grouped['confusion']?.length || 0} iconTone="warning" icon={<HelpCircle className="w-4 h-4" />} />
          <KpiTile label="Champions" value={grouped['champion_candidate']?.length || 0} iconTone="success" icon={<Users className="w-4 h-4" />} />
        </div>

        <div className="cl-card p-6">
          <h3 className="font-heading font-semibold mb-4">Insight Types</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {typeStats.map(({ type, label, count, critical }) => (
              <button key={type} onClick={() => setFilterType(filterType === type ? '' : type)}
                className={cn("text-left p-3 rounded-lg border transition-colors",
                  filterType === type ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50')}>
                <p className="text-sm font-medium">{label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold">{count}</span>
                  {critical > 0 && <StatusChip tone="risk">{critical} high</StatusChip>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1 bg-card">
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {(filterType || filterSeverity) && (
            <button onClick={() => { setFilterType(''); setFilterSeverity(''); }}
              className="text-xs text-primary hover:underline">Clear filters</button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filteredInsights.length} insights</span>
        </div>

        <div className="space-y-2">
          {filteredInsights.map((insight, i) => (
            <motion.div key={insight.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="cl-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusChip tone={severityTone[insight.severity] || 'neutral'}>{insight.severity}</StatusChip>
                    <span className="text-xs font-medium text-muted-foreground">{insightTypeLabels[insight.insight_type] || insight.insight_type}</span>
                    {insight.inferred_dimension && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${dimensionColors[insight.inferred_dimension]}`}>{insight.inferred_dimension}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{insight.source_type}</span>
                  </div>
                  <p className="text-sm">{insight.summary}</p>
                  {insight.supporting_evidence_summary && (
                    <p className="text-xs text-muted-foreground mt-1">{insight.supporting_evidence_summary}</p>
                  )}
                  {insight.suggested_intervention && (
                    <p className="text-xs text-primary mt-1">💡 {insight.suggested_intervention}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-3">
                  {insight.persona && <p className="text-[10px] text-muted-foreground">{insight.persona}</p>}
                  {insight.team && <p className="text-[10px] text-muted-foreground">{insight.team}</p>}
                </div>
              </div>
            </motion.div>
          ))}
          {filteredInsights.length === 0 && (
            <div className="cl-card border-dashed p-8 text-center">
              <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No insights yet. Click "Mine Insights" to analyse platform data.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default InsightConsole;
