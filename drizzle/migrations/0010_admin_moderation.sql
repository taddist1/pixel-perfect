ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
DROP POLICY IF EXISTS "public read reviews" ON public.reviews;
CREATE POLICY "public read visible reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_hidden = false);
CREATE POLICY "admins read all reviews" ON public.reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.reviews_reply_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    IF NEW.reply IS DISTINCT FROM OLD.reply THEN NEW.replied_at := CASE WHEN NEW.reply IS NULL THEN NULL ELSE now() END; END IF;
    RETURN NEW;
  END IF;
  IF OLD.reply IS NOT NULL THEN RAISE EXCEPTION 'reply already set'; END IF;
  IF NEW.rating <> OLD.rating OR NEW.comment <> OLD.comment OR NEW.author_id <> OLD.author_id OR NEW.seeker_id <> OLD.seeker_id
     OR NEW.quality IS DISTINCT FROM OLD.quality OR NEW.commitment IS DISTINCT FROM OLD.commitment
     OR NEW.communication IS DISTINCT FROM OLD.communication OR NEW.professionalism IS DISTINCT FROM OLD.professionalism
     OR NEW.author_name <> OLD.author_name OR NEW.author_type <> OLD.author_type OR NEW.is_hidden <> OLD.is_hidden THEN
    RAISE EXCEPTION 'only reply can change';
  END IF;
  IF NEW.reply IS NULL OR length(trim(NEW.reply)) = 0 OR length(NEW.reply) > 500 THEN RAISE EXCEPTION 'invalid reply'; END IF;
  NEW.replied_at := now();
  RETURN NEW;
END $$;

CREATE TABLE public.trust_adjustments (
  seeker_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  adjustment integer NOT NULL DEFAULT 0 CHECK (adjustment BETWEEN -50 AND 50),
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trust_adjustments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trust_adjustments TO authenticated;
GRANT ALL ON public.trust_adjustments TO service_role;
ALTER TABLE public.trust_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read adjustments" ON public.trust_adjustments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage adjustments" ON public.trust_adjustments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));