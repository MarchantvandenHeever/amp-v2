import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SCORING_CONFIG, ScoringConfig } from '@/lib/scoringEngine';

export function useScoringConfig() {
  return useQuery({
    queryKey: ['scoring_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scoring_config')
        .select('*')
        .order('category');
      if (error) throw error;

      const config: Record<string, any> = {};
      for (const row of data || []) {
        config[row.config_key] = row.config_value;
      }

      const adoption_target = config.adoption_target || {
        A_target: 85,
        weighting_mode: 'baseline' as const,
        epsilon: 0.01,
      };

      const merged: ScoringConfig & { desired_adoption_target: number } = {
        phase_weights: config.phase_weights || DEFAULT_SCORING_CONFIG.phase_weights,
        decay_settings: config.decay_settings || DEFAULT_SCORING_CONFIG.decay_settings,
        participation_traits: config.participation_traits || DEFAULT_SCORING_CONFIG.participation_traits,
        ownership_traits: config.ownership_traits || DEFAULT_SCORING_CONFIG.ownership_traits,
        confidence_traits: config.confidence_traits || DEFAULT_SCORING_CONFIG.confidence_traits,
        adoption_target,
        participation_safeguards: config.participation_safeguards,
        confidence_flags: config.confidence_flags || DEFAULT_SCORING_CONFIG.confidence_flags,
        // Back-compat surface used by older UI code:
        desired_adoption_target: Number(adoption_target.A_target) || 85,
      };

      return merged;
    },
  });
}

export function useUpdateScoringConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('scoring_config')
        .update({ config_value: value, updated_at: new Date().toISOString() })
        .eq('config_key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring_config'] });
    },
  });
}
