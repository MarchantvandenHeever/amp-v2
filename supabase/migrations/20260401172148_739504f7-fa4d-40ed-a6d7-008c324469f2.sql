
INSERT INTO storage.buckets (id, name, public) VALUES ('content-assets', 'content-assets', true);

CREATE POLICY "Anyone can read content assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'content-assets');

CREATE POLICY "Anon can upload content assets"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'content-assets');

CREATE POLICY "Anon can update content assets"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'content-assets');

CREATE POLICY "Anon can delete content assets"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'content-assets');
