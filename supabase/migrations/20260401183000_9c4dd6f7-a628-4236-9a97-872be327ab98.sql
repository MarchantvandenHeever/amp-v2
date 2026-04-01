
CREATE POLICY "Anon can update risk_flags"
ON public.risk_flags FOR UPDATE
TO anon
USING (true);

CREATE POLICY "Anon can insert content_items"
ON public.content_items FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can update content_items"
ON public.content_items FOR UPDATE
TO anon
USING (true);
