import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to Postgres changes on AMP scoring tables and invalidates the
 * relevant React Query caches so every dashboard, drilldown and trend
 * re-renders the moment score-recalc writes new rows.
 */
export function useRealtimeScores() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('amp-scores-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['scores'] });
          queryClient.invalidateQueries({ queryKey: ['user-score'] });
          queryClient.invalidateQueries({ queryKey: ['ideal-adoption'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_history' },
        () => queryClient.invalidateQueries({ queryKey: ['score_history'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trait_observations' },
        () => queryClient.invalidateQueries({ queryKey: ['trait_observations'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'behavioural_flags' },
        () => queryClient.invalidateQueries({ queryKey: ['behavioural_flags'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journey_items' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['journey_items'] });
          queryClient.invalidateQueries({ queryKey: ['journeys'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
