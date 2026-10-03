CREATE OR REPLACE VIEW public.public_seekers AS
SELECT id, full_name, city, profession, experience_years, avatar_url, created_at, phone
FROM public.profiles
WHERE account_type = 'seeker';

GRANT SELECT ON public.public_seekers TO anon, authenticated;