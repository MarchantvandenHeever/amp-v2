CREATE POLICY "Anon can update profiles" ON public.profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage journeys" ON public.journeys FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage journey_phases" ON public.journey_phases FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage initiatives" ON public.initiatives FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage milestones" ON public.milestones FOR ALL TO anon USING (true) WITH CHECK (true);