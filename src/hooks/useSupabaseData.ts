import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('display_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useProfilesByRole(role: 'super_admin' | 'change_manager' | 'team_lead' | 'end_user') {
  return useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', role).order('display_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useEndUsers() {
  return useQuery({
    queryKey: ['profiles', 'end_user'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'end_user').order('display_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useInitiatives() {
  return useQuery({
    queryKey: ['initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('initiatives').select('*').order('start_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useMilestones(initiativeId?: string) {
  return useQuery({
    queryKey: ['milestones', initiativeId],
    queryFn: async () => {
      let query = supabase.from('milestones').select('*').order('start_date');
      if (initiativeId) query = query.eq('initiative_id', initiativeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useJourneys(initiativeId?: string) {
  return useQuery({
    queryKey: ['journeys', initiativeId],
    queryFn: async () => {
      let query = supabase.from('journeys').select('*').order('created_at');
      if (initiativeId) query = query.eq('initiative_id', initiativeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useJourneyItems(journeyId?: string) {
  return useQuery({
    queryKey: ['journey_items', journeyId],
    queryFn: async () => {
      let query = supabase.from('journey_items').select('*').order('order_index');
      if (journeyId) query = query.eq('journey_id', journeyId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!journeyId,
  });
}

export function useAllJourneyItems() {
  return useQuery({
    queryKey: ['journey_items', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('journey_items').select('*').order('order_index');
      if (error) throw error;
      return data;
    },
  });
}

export function useScores(initiativeId?: string) {
  return useQuery({
    queryKey: ['scores', initiativeId],
    queryFn: async () => {
      let query = supabase.from('scores').select('*');
      if (initiativeId) query = query.eq('initiative_id', initiativeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useScoreHistory(initiativeId?: string) {
  return useQuery({
    queryKey: ['score_history', initiativeId],
    queryFn: async () => {
      let query = supabase.from('score_history').select('*').order('recorded_at');
      if (initiativeId) query = query.eq('initiative_id', initiativeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useRiskFlags() {
  return useQuery({
    queryKey: ['risk_flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('risk_flags').select('*, profiles(display_name, team)').eq('resolved', false).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('badges').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useUserBadges(userId?: string) {
  return useQuery({
    queryKey: ['user_badges', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_badges').select('*, badges(*)').eq('user_id', userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useAssignments(journeyId?: string) {
  return useQuery({
    queryKey: ['assignments', journeyId],
    queryFn: async () => {
      let query = supabase.from('assignments').select('*, profiles(display_name, team, persona)');
      if (journeyId) query = query.eq('journey_id', journeyId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useContentItems() {
  return useQuery({
    queryKey: ['content_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('content_items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Helper functions (kept client-side for scoring)
export type AppRole = 'super_admin' | 'change_manager' | 'team_lead' | 'end_user';

export function getAdoptionScore(p: number, o: number, c: number, phase: string = 'training_testing'): number {
  const weights: Record<string, { p: number; o: number; c: number }> = {
    design_build: { p: 0.35, o: 0.35, c: 0.30 },
    training_testing: { p: 0.20, o: 0.40, c: 0.40 },
    post_go_live: { p: 0.10, o: 0.45, c: 0.45 },
  };
  const w = weights[phase] || weights.training_testing;
  return Math.round(p * w.p + o * w.o + c * w.c);
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Developing';
  if (score >= 40) return 'Emerging';
  return 'At Risk';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-amp-success';
  if (score >= 60) return 'text-amp-info';
  if (score >= 40) return 'text-amp-warning';
  return 'text-amp-risk';
}

export function getTierFromPoints(points: number): string {
  if (points >= 2000) return 'Leader';
  if (points >= 1000) return 'Owner';
  if (points >= 500) return 'Contributor';
  return 'Starter';
}
