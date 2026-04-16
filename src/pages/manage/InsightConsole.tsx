import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInsightsByType } from '@/hooks/useInsights';
import { useInitiatives } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Brain, AlertTriangle, TrendingDown, HelpCircle, Users, Filter, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const severityColors: Record<string, string> = {
  critical: 'bg-amp-risk/10 text-amp-risk',
  high: 'bg-amp-risk/10 text-amp-risk',
  medium: 'bg-amp-warning/10 text-amp-confidence',
  low: 'bg-secondary text-muted-foreground',
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Insight Console</h1>
            <p className="text-sm text-muted-foreground mt-1">AI-mined behavioural signals from user interactions and platform data</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedInitiative}
              onChange={e => setSelectedInitiative(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card"
            >
              <option value="">All Initiatives</option>
              {(initiatives || []).map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <button onClick={handleMineInsights} disabled={mining}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {mining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Mine Insights
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Total Insights</span>
            </div>
            <p className="font-heading text-2xl font-bold">{(insights || []).length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amp-risk" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Critical/High</span>
            </div>
            <p className="font-heading text-2xl font-bold text-amp-risk">
              {(insights || []).filter(i => i.severity === 'critical' || i.severity === 'high').length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-4 h-4 text-amp-confidence" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Confusion</span>
            </div>
            <p className="font-heading text-2xl font-bold">{grouped['confusion']?.length || 0}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-amp-ownership" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Champions</span>
            </div>
            <p className="font-heading text-2xl font-bold text-amp-success">{grouped['champion_candidate']?.length || 0}</p>
          </div>
        </div>

        {/* Type breakdown */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Insight Types</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {typeStats.map(({ type, label, count, critical }) => (
              <button key={type} onClick={() => setFilterType(filterType === type ? '' : type)}
                className={cn("text-left p-3 rounded-lg border transition-colors",
                  filterType === type ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50')}>
                <p className="text-sm font-medium">{label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold">{count}</span>
                  {critical > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amp-risk/10 text-amp-risk">{critical} high</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
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

        {/* Insights list */}
        <div className="space-y-2">
          {filteredInsights.map((insight, i) => (
            <motion.div key={insight.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${severityColors[insight.severity]}`}>{insight.severity}</span>
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
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
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
