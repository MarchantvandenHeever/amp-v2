import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useChangeLog } from '@/hooks/useRecommendations';
import { Loader2, History, RotateCcw, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const AIChangeLog: React.FC = () => {
  const { data: changes, isLoading, refetch } = useChangeLog();
  const queryClient = useQueryClient();

  const handleRollback = async (change: any) => {
    try {
      // Restore before_state if it was an add_item
      if (change.change_type === 'add_item' && change.journey_item_id) {
        await supabase.from('journey_items').delete().eq('id', change.journey_item_id);
      }
      await supabase.from('ai_change_log').update({ rolled_back_at: new Date().toISOString() }).eq('id', change.id);
      toast.success('Change rolled back');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['journey_items'] });
    } catch {
      toast.error('Rollback failed');
    }
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">AI Change Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Version history of AI-applied journey changes</p>
        </div>

        <div className="space-y-3">
          {(changes || []).map((change, i) => {
            const rec = (change as any).recommendation_records;
            const rolledBack = !!change.rolled_back_at;
            return (
              <motion.div key={change.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`bg-card border rounded-xl p-4 amp-shadow-card ${rolledBack ? 'opacity-60 border-border' : 'border-border'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-primary">{change.change_type}</span>
                      {rec?.title && <span className="text-xs text-muted-foreground">— {rec.title}</span>}
                      {rolledBack && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amp-warning/10 text-amp-confidence">Rolled Back</span>}
                    </div>
                    <p className="text-sm">{change.rationale || 'No rationale provided'}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(change.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!rolledBack && (
                    <button onClick={() => handleRollback(change)}
                      className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground">
                      <RotateCcw className="w-3 h-3" /> Rollback
                    </button>
                  )}
                </div>
                {/* Diff view */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Before</span>
                    <pre className="mt-1 p-2 bg-amp-risk/5 rounded-lg text-[10px] overflow-x-auto max-h-24">
                      {JSON.stringify(change.before_state, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">After</span>
                    <pre className="mt-1 p-2 bg-amp-success/5 rounded-lg text-[10px] overflow-x-auto max-h-24">
                      {JSON.stringify(change.after_state, null, 2)}
                    </pre>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {(changes || []).length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No AI changes applied yet</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AIChangeLog;
