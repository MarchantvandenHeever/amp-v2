import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Trigger a verbatim recalculation of all scores from behavioural_events
 * via the score-recalc edge function. The function reads admin-configurable
 * weights, baselines, decay, and adoption target from the scoring_config table.
 */
export function useRecalcScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { user_id?: string; initiative_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('score-recalc', {
        body: input ?? {},
      });
      if (error) throw error;
      return data as {
        ok: boolean;
        recalced: number;
        config_source: string;
        sample: unknown[];
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scores'] });
      qc.invalidateQueries({ queryKey: ['score_history'] });
      qc.invalidateQueries({ queryKey: ['trait_observations'] });
      qc.invalidateQueries({ queryKey: ['behavioural_flags'] });
    },
  });
}

/** Read the per-trait audit trail produced by the last recalc. */
export function useTraitObservations(userId?: string, initiativeId?: string) {
  return useQuery({
    queryKey: ['trait_observations', userId, initiativeId],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase.from('trait_observations').select('*').order('pillar').order('trait_key');
      if (userId) q = q.eq('user_id', userId);
      if (initiativeId) q = q.eq('initiative_id', initiativeId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

/** Read operational behavioural flags (overload, calibration). */
export function useBehaviouralFlags(userId?: string, initiativeId?: string) {
  return useQuery({
    queryKey: ['behavioural_flags', userId, initiativeId],
    queryFn: async () => {
      let q = supabase.from('behavioural_flags').select('*').eq('active', true);
      if (userId) q = q.eq('user_id', userId);
      if (initiativeId) q = q.eq('initiative_id', initiativeId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
