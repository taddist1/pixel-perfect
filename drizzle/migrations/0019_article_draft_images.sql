ALTER TABLE public.article_drafts ADD COLUMN IF NOT EXISTS image_path text;

CREATE POLICY "admins read article images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins upload article images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update article images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete article images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));