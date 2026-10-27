CREATE TABLE public.ai_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  category text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  duration_seconds int NOT NULL CHECK (duration_seconds BETWEEN 10 AND 180),
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'scripting',
  error text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_videos TO authenticated;
GRANT ALL ON public.ai_videos TO service_role;
ALTER TABLE public.ai_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published ai videos" ON public.ai_videos FOR SELECT TO anon, authenticated USING (is_published = true AND status = 'ready');
CREATE POLICY "Admins manage ai videos" ON public.ai_videos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));