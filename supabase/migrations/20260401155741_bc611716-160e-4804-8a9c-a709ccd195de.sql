CREATE POLICY "Anon can read initiatives" ON public.initiatives FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read milestones" ON public.milestones FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read journeys" ON public.journeys FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read journey_items" ON public.journey_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read scores" ON public.scores FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read score_history" ON public.score_history FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read risk_flags" ON public.risk_flags FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read content_items" ON public.content_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read badges" ON public.badges FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read user_badges" ON public.user_badges FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read assignments" ON public.assignments FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read announcements" ON public.announcements FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read points_ledger" ON public.points_ledger FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read activity_events" ON public.activity_events FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read customers" ON public.customers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read reminders" ON public.reminders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read user_roles" ON public.user_roles FOR SELECT TO anon USING (true);

-- Also allow anon to insert/update/delete for demo CRUD operations
CREATE POLICY "Anon can insert initiatives" ON public.initiatives FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update initiatives" ON public.initiatives FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert journey_items" ON public.journey_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update journey_items" ON public.journey_items FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete journey_items" ON public.journey_items FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert assignments" ON public.assignments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can insert milestones" ON public.milestones FOR INSERT TO anon WITH CHECK (true);