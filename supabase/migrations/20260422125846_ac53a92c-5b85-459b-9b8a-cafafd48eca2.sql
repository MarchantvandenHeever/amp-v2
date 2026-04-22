ALTER TABLE public.scores REPLICA IDENTITY FULL;
ALTER TABLE public.score_history REPLICA IDENTITY FULL;
ALTER TABLE public.trait_observations REPLICA IDENTITY FULL;
ALTER TABLE public.behavioural_flags REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.score_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trait_observations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.behavioural_flags;