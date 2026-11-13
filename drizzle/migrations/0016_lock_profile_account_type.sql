CREATE OR REPLACE FUNCTION public.profiles_account_type_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.account_type IS NOT NULL
     AND NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    RAISE EXCEPTION 'account_type can only be changed by an admin';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_account_type_guard ON public.profiles;
CREATE TRIGGER profiles_account_type_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_account_type_guard();