CREATE TABLE public.job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_name text NOT NULL DEFAULT '',
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.job_requests TO authenticated;
GRANT ALL ON public.job_requests TO service_role;
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties read requests" ON public.job_requests FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = seeker_id);
CREATE POLICY "owners send requests" ON public.job_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND status = 'pending' AND reply IS NULL
    AND (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'owner');
CREATE POLICY "seeker replies" ON public.job_requests FOR UPDATE TO authenticated
  USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '/',
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_unpushed_idx ON public.notifications(created_at) WHERE pushed_at IS NULL;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs all" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- seeker may only change status/reply
CREATE OR REPLACE FUNCTION public.job_requests_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.seeker_id <> OLD.seeker_id OR NEW.owner_id <> OLD.owner_id OR NEW.message <> OLD.message OR NEW.owner_name <> OLD.owner_name OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF NEW.status <> OLD.status OR NEW.reply IS DISTINCT FROM OLD.reply THEN NEW.replied_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER job_requests_guard BEFORE UPDATE ON public.job_requests FOR EACH ROW EXECUTE FUNCTION public.job_requests_guard();

CREATE OR REPLACE FUNCTION public.notify_job_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications(user_id, title, body, url)
    VALUES (NEW.seeker_id, 'طلب عمل جديد من ' || COALESCE(NULLIF(NEW.owner_name,''),'صاحب مشروع'), left(NEW.message, 140), '/account');
  ELSIF NEW.status <> OLD.status OR NEW.reply IS DISTINCT FROM OLD.reply THEN
    INSERT INTO notifications(user_id, title, body, url)
    VALUES (NEW.owner_id,
      CASE NEW.status WHEN 'accepted' THEN 'تم قبول طلبك ✅' WHEN 'declined' THEN 'تم رفض طلبك' ELSE 'رد جديد على طلبك' END,
      COALESCE(left(NEW.reply,140),''), '/account');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER job_requests_notify AFTER INSERT OR UPDATE ON public.job_requests FOR EACH ROW EXECUTE FUNCTION public.notify_job_request();

CREATE OR REPLACE FUNCTION public.notify_new_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, title, body, url)
  SELECT p.id, 'وظيفة جديدة فـ ' || NEW.city, NEW.title || ' — ' || NEW.business_name, '/jobs'
  FROM profiles p
  WHERE p.account_type = 'seeker' AND p.city = NEW.city AND p.id <> NEW.owner_id;
  RETURN NEW;
END $$;
CREATE TRIGGER jobs_notify_city AFTER INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.notify_new_job();

REVOKE EXECUTE ON FUNCTION public.notify_job_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_job() FROM PUBLIC, anon, authenticated;