import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Subscribes to Postgres changes on AMP scoring tables and invalidates the
 * relevant React Query caches so every dashboard, drilldown and trend
 * re-renders the moment score-recalc writes new rows.
 *
 * We hold the latest user + refreshUser in refs so the subscription is
 * created once and never torn down/rebuilt while the user navigates.
 */
export function useRealtimeScores() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  const userIdRef = useRef<string | null>(null);
  const refreshRef = useRef(refreshUser);

  userIdRef.current = user?.id ?? null;
  refreshRef.current = refreshUser;

  useEffect(() => {
    const channel = supabase
      .channel('amp-scores-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['scores'] });
          const row: any = payload.new ?? payload.old;
          if (userIdRef.current && row?.user_id === userIdRef.current) {
            refreshRef.current?.();
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
