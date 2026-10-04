ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_type account_type NOT NULL DEFAULT 'seeker'::account_type;

DROP POLICY IF EXISTS "authenticated insert own review" ON public.reviews;

CREATE POLICY "authenticated insert own review"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND author_type = (SELECT account_type FROM public.profiles WHERE id = auth.uid())
  );

COMMENT ON COLUMN public.reviews.author_type IS 'Type of reviewer, enforced against profiles.account_type by RLS: owner reviews carry more weight';