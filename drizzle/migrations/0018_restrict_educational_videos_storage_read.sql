DROP POLICY IF EXISTS "educational videos public read" ON storage.objects;
CREATE POLICY "admins read educational videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'educational-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));