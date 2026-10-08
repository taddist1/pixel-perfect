ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS quality smallint CHECK (quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS commitment smallint CHECK (commitment BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS communication smallint CHECK (communication BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS professionalism smallint CHECK (professionalism BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_author ON public.reviews(seeker_id, author_id);

DROP POLICY IF EXISTS "authenticated insert own review" ON public.reviews;
CREATE POLICY "verified owner review" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND author_type = 'owner'
    AND (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'owner'
    AND EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.seeker_id = reviews.seeker_id AND jr.owner_id = auth.uid() AND jr.status = 'accepted')
  );
CREATE POLICY "seeker replies once" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = seeker_id AND reply IS NULL) WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "admins delete reviews" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT UPDATE, DELETE ON public.reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.reviews_reply_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.reply IS NOT NULL THEN RAISE EXCEPTION 'reply already set'; END IF;
  IF NEW.rating <> OLD.rating OR NEW.comment <> OLD.comment OR NEW.author_id <> OLD.author_id OR NEW.seeker_id <> OLD.seeker_id
     OR NEW.quality IS DISTINCT FROM OLD.quality OR NEW.commitment IS DISTINCT FROM OLD.commitment
     OR NEW.communication IS DISTINCT FROM OLD.communication OR NEW.professionalism IS DISTINCT FROM OLD.professionalism
     OR NEW.author_name <> OLD.author_name OR NEW.author_type <> OLD.author_type THEN
    RAISE EXCEPTION 'only reply can change';
  END IF;
  IF NEW.reply IS NULL OR length(trim(NEW.reply)) = 0 OR length(NEW.reply) > 500 THEN RAISE EXCEPTION 'invalid reply'; END IF;
  NEW.replied_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER reviews_reply_guard BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.reviews_reply_guard();

CREATE OR REPLACE FUNCTION public.seeker_trust_stats()
RETURNS TABLE(seeker_id uuid, total int, answered int, accepted int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT seeker_id, count(*)::int, count(*) FILTER (WHERE status <> 'pending')::int, count(*) FILTER (WHERE status = 'accepted')::int
  FROM public.job_requests GROUP BY seeker_id
$$;
GRANT EXECUTE ON FUNCTION public.seeker_trust_stats() TO anon, authenticated;

CREATE TABLE public.service_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_name text NOT NULL DEFAULT '',
  city text NOT NULL,
  phone text NOT NULL,
  description text NOT NULL CHECK (length(description) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','taken','closed')),
  taker_id uuid,
  taker_name text,
  taker_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  taken_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.service_calls TO authenticated;
GRANT ALL ON public.service_calls TO service_role;
ALTER TABLE public.service_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read calls" ON public.service_calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "owners create calls" ON public.service_calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND status = 'open' AND taker_id IS NULL
    AND (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'owner');
CREATE POLICY "owner closes call" ON public.service_calls FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id AND status = 'closed');

CREATE OR REPLACE FUNCTION public.accept_service_call(_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; n int;
BEGIN
  SELECT full_name, phone, account_type INTO p FROM public.profiles WHERE id = auth.uid();
  IF p IS NULL OR p.account_type <> 'seeker' THEN RAISE EXCEPTION 'not a professional'; END IF;
  UPDATE public.service_calls SET status = 'taken', taker_id = auth.uid(), taker_name = coalesce(p.full_name,''), taker_phone = p.phone, taken_at = now()
  WHERE id = _id AND status = 'open' AND owner_id <> auth.uid();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_service_call(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_service_call(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_service_call() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, title, body, url)
    SELECT p.id, '🚨 آلة قهوة معطلة فـ ' || NEW.city, NEW.description, '/emergency'
    FROM public.profiles p
    WHERE p.account_type = 'seeker' AND p.city = NEW.city AND p.is_available AND p.id <> NEW.owner_id
      AND (p.profession ILIKE '%تقني%' OR 'صيانة الآلات' = ANY(p.skills));
  ELSIF NEW.status = 'taken' AND OLD.status = 'open' THEN
    INSERT INTO public.notifications(user_id, title, body, url)
    VALUES (NEW.owner_id, '✅ تقني قبل الطلب ديالك', coalesce(NEW.taker_name,'') || ' — ' || coalesce(NEW.taker_phone,''), '/emergency');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_service_call() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER service_calls_notify AFTER INSERT OR UPDATE ON public.service_calls FOR EACH ROW EXECUTE FUNCTION public.notify_service_call();