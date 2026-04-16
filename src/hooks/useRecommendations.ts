import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRecommendations(initiativeId?: string) {
  return useQuery({
    queryKey: ['recommendation_records', initiativeId],
    queryFn: async () => {
      let query = supabase.from('recommendation_records').select('*').order('created_at', { ascending: false });
      if (initiativeId) query = query.eq('initiative_id', initiativeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useApplyRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recommendation, approvedBy }: { recommendation: any; approvedBy: string }) => {
      const change = recommendation.proposed_change_json || {};

      // Record the change in ai_change_log
      await supabase.from('ai_change_log').insert({
        recommendation_id: recommendation.id,
        journey_id: recommendation.journey_id,
        change_type: recommendation.recommendation_type,
        before_state: {},
        after_state: change,
        rationale: recommendation.rationale,
        approved_by: approvedBy,
      });

      // Apply the change based on type
      if (recommendation.recommendation_type === 'add_item' && change.title) {
        await supabase.from('journey_items').insert({
          journey_id: recommendation.journey_id,
          title: change.title,
          description: change.description || '',
          type: change.type || 'activity',
          contributes_to: change.contributes_to || [],
          weight: change.weight || 10,
          duration: change.duration || '5 min',
          mandatory: change.mandatory ?? true,
          order_index: 999,
          status: 'available',
        });
      }

      // Mark recommendation as approved
      await supabase.from('recommendation_records').update({
        review_status: 'approved',
        approved_by: approvedBy,
        applied_at: new Date().toISOString(),
      }).eq('id', recommendation.id);
    },
    onSuccess: () => {
      toast.success('Recommendation applied');
      queryClient.invalidateQueries({ queryKey: ['recommendation_records'] });
      queryClient.invalidateQueries({ queryKey: ['journey_items'] });
      queryClient.invalidateQueries({ queryKey: ['ai_change_log'] });
    },
    onError: () => {
      toast.error('Failed to apply recommendation');
    },
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('recommendation_records').update({ review_status: 'dismissed' }).eq('id', id);
    },
    onSuccess: () => {
      toast.success('Recommendation dismissed');
      queryClient.invalidateQueries({ queryKey: ['recommendation_records'] });
    },
  });
}

export function useSaveRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('recommendation_records').update({ review_status: 'saved' }).eq('id', id);
    },
    onSuccess: () => {
      toast.success('Recommendation saved for later');
      queryClient.invalidateQueries({ queryKey: ['recommendation_records'] });
    },
  });
}

export function useChangeLog(journeyId?: string) {
  return useQuery({
    queryKey: ['ai_change_log', journeyId],
    queryFn: async () => {
      let query = supabase.from('ai_change_log').select('*, recommendation_records(title, recommendation_type)').order('created_at', { ascending: false });
      if (journeyId) query = query.eq('journey_id', journeyId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
