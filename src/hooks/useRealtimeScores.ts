import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Subscribes to Postgres changes on AMP scoring tables and invalidates the
 * relevant React Query caches so every dashboard, drilldown and trend
 * re-renders the moment score-recalc writes new rows.
 *
 * Mounted once at the app root.
 */
export function useRealtimeScores() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    const channel = supabase
      .channel('amp-scores-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['scores'] });
          const row: any = payload.new ?? payload.old;
          if (user && row?.user_id === user.id) {
            refreshUser();
          }
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user, refreshUser]);
}
