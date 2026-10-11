CREATE TABLE public.cities (
  name text PRIMARY KEY,
  sort_order integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities public read" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage cities" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.cities(name, sort_order)
SELECT n, o FROM unnest(ARRAY['الدار البيضاء','الرباط','سلا','القنيطرة','مراكش','فاس','طنجة','أكادير','مكناس','وجدة','تطوان','الحسيمة','الناظور','بركان','العرائش','القصر الكبير','آسفي','الجديدة','سطات','المحمدية','برشيد','بني ملال','خريبكة','قصبة تادلة','اليوسفية','قلعة السراغنة','الصويرة','شيشاوة','تارودانت','تيزنيت','إنزكان','الرشيدية','ميدلت','أزيلال','خنيفرة','تازة','ورزازات','زاكورة','تنغير','جرادة','شفشاون','وزان','سيدي بنور','سيدي قاسم','الفقيه بن صالح','كلميم','طانطان','سمارة','الداخلة','بوجدور','العيون']) WITH ORDINALITY AS t(n, o);

CREATE TABLE public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notify_new_profile boolean NOT NULL DEFAULT true,
  notify_new_review boolean NOT NULL DEFAULT true,
  notify_new_job boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read settings" ON public.site_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.site_settings(id) VALUES (1);

CREATE OR REPLACE FUNCTION public.notify_admins_new_profile()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT COALESCE((SELECT notify_new_profile FROM site_settings WHERE id = 1), true) THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, title, body, url)
  SELECT r.user_id, 'تسجيل جديد 👤', COALESCE(NULLIF(NEW.full_name,''),'زائر جديد') || ' انضم إلى المنصة', '/admin/moderation'
  FROM user_roles r WHERE r.role = 'admin' AND r.user_id <> NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.notify_admins_new_review()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT COALESCE((SELECT notify_new_review FROM site_settings WHERE id = 1), true) THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, title, body, url)
  SELECT r.user_id, 'تقييم جديد ⭐ ' || NEW.rating || '/5', COALESCE(NULLIF(NEW.author_name,''),'مستخدم') || ': ' || left(COALESCE(NEW.comment,''),120), '/admin/moderation'
  FROM user_roles r WHERE r.role = 'admin' AND r.user_id <> NEW.author_id;
  RETURN NEW;
END $function$;