ALTER TABLE public.article_drafts
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS article_drafts_slug_key ON public.article_drafts (slug) WHERE slug IS NOT NULL;

GRANT SELECT ON public.article_drafts TO anon;

CREATE POLICY "public read published drafts"
ON public.article_drafts
FOR SELECT
TO anon, authenticated
USING (is_published = true);