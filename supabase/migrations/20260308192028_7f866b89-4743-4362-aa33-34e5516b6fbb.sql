
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _role_id UUID;
BEGIN
  -- Only allow if user is creating their first company profile (onboarding)
  IF (SELECT COUNT(*) FROM public.company_profiles WHERE owner_id = _user_id) != 1 THEN
    RETURN;
  END IF;

  SELECT id INTO _role_id FROM public.roles WHERE name = 'Super Admin' LIMIT 1;
  IF _role_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (_user_id, _role_id);
END;
$$;
