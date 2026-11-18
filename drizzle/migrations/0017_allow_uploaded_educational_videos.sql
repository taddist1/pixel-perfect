ALTER TABLE public.educational_videos ALTER COLUMN youtube_url DROP NOT NULL;
ALTER TABLE public.educational_videos ALTER COLUMN youtube_id DROP NOT NULL;
ALTER TABLE public.educational_videos ADD COLUMN video_path text;
ALTER TABLE public.educational_videos DROP CONSTRAINT educational_videos_youtube_id_format;
ALTER TABLE public.educational_videos ADD CONSTRAINT educational_videos_youtube_id_format CHECK (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{11}$');
ALTER TABLE public.educational_videos ADD CONSTRAINT educational_videos_source_required CHECK (youtube_id IS NOT NULL OR video_path IS NOT NULL);

CREATE POLICY "educational videos public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'educational-videos');

CREATE POLICY "admins upload educational videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'educational-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update educational videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'educational-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'educational-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete educational videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'educational-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));