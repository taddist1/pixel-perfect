CREATE OR REPLACE FUNCTION public.notify_admins_new_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, title, body, url)
  SELECT r.user_id, 'تسجيل جديد 👤', COALESCE(NULLIF(NEW.full_name,''),'زائر جديد') || ' انضم إلى المنصة', '/admin/moderation'
  FROM user_roles r WHERE r.role = 'admin' AND r.user_id <> NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
CREATE TRIGGER profiles_notify_admins AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_profile();

CREATE OR REPLACE FUNCTION public.notify_admins_new_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(user_id, title, body, url)
  SELECT r.user_id, 'تقييم جديد ⭐ ' || NEW.rating || '/5', COALESCE(NULLIF(NEW.author_name,''),'مستخدم') || ': ' || left(COALESCE(NEW.comment,''),120), '/admin/moderation'
  FROM user_roles r WHERE r.role = 'admin' AND r.user_id <> NEW.author_id;
  RETURN NEW;
END $$;
CREATE TRIGGER reviews_notify_admins AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_review();

REVOKE EXECUTE ON FUNCTION public.notify_admins_new_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_review() FROM PUBLIC, anon, authenticated;