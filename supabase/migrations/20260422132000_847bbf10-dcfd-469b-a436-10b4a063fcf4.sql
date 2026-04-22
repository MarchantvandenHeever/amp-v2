CREATE POLICY "Anon can insert behavioural_events" ON public.behavioural_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can manage trait_observations" ON public.trait_observations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage scores" ON public.scores FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage score_history" ON public.score_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage journey_items" ON public.journey_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage activity_events" ON public.activity_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage points_ledger" ON public.points_ledger FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage behavioural_flags" ON public.behavioural_flags FOR ALL TO anon USING (true) WITH CHECK (true);