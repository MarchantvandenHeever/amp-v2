import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useInsights(initiativeId?: string) {
  return useQuery({
    queryKey: ['insight_records', initiativeId],
    queryFn: async () => {
      let query = supabase.from('insight_records').select('*').order('created_at', { ascending: false });
      if (initiativeId) query = query.eq('initiative_id', initiativeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useInsightsByType(initiativeId?: string) {
  const { data: insights, ...rest } = useInsights(initiativeId);

  const grouped = (insights || []).reduce((acc: Record<string, any[]>, i) => {
    const key = i.insight_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(i);
    return acc;
  }, {});

  return { grouped, insights, ...rest };
}
