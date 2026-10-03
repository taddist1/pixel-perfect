CREATE TABLE public.educational_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url text NOT NULL,
  youtube_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'عام',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  CONSTRAINT educational_videos_youtube_id_format CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  CONSTRAINT educational_videos_title_length CHECK (char_length(title) BETWEEN 3 AND 140),
  CONSTRAINT educational_videos_description_length CHECK (char_length(description) <= 1000),
  CONSTRAINT educational_videos_category_length CHECK (char_length(category) BETWEEN 2 AND 50)
);

GRANT SELECT ON public.educational_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.educational_videos TO authenticated;
GRANT ALL ON public.educational_videos TO service_role;

ALTER TABLE public.educational_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "published videos public read"
ON public.educational_videos
FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "admins read all videos"
ON public.educational_videos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert videos"
ON public.educational_videos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update videos"
ON public.educational_videos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete videos"
ON public.educational_videos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX educational_videos_published_created_idx
ON public.educational_videos (is_published, created_at DESC);

CREATE INDEX educational_videos_category_idx
ON public.educational_videos (category);