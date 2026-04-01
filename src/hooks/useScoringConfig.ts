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

      // Build config object from rows
      const config: Record<string, any> = {};
      for (const row of data || []) {
        config[row.config_key] = row.config_value;
      }

      return {
        phase_weights: config.phase_weights || DEFAULT_SCORING_CONFIG.phase_weights,
        decay_settings: config.decay_settings || DEFAULT_SCORING_CONFIG.decay_settings,
        participation_traits: config.participation_traits || DEFAULT_SCORING_CONFIG.participation_traits,
        ownership_traits: config.ownership_traits || DEFAULT_SCORING_CONFIG.ownership_traits,
        confidence_traits: config.confidence_traits || DEFAULT_SCORING_CONFIG.confidence_traits,
        negative_signals: config.negative_signals || DEFAULT_SCORING_CONFIG.negative_signals,
        score_bands: config.score_bands || DEFAULT_SCORING_CONFIG.score_bands,
      } as ScoringConfig;
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
