CREATE POLICY "seekers public read" ON public.profiles FOR SELECT TO anon, authenticated USING (account_type = 'seeker');

CREATE OR REPLACE VIEW public.public_seekers
WITH (security_invoker = on) AS
  SELECT id, full_name, city, profession, experience_years, avatar_url, created_at
  FROM public.profiles
  WHERE account_type = 'seeker';

GRANT SELECT ON public.public_seekers TO anon, authenticated;
GRANT ALL ON public.public_seekers TO service_role;