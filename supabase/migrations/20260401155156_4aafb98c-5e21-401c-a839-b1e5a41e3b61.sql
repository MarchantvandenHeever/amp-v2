CREATE POLICY "Anon can read profiles for login"
ON public.profiles
FOR SELECT
TO anon
USING (true);