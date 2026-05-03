DROP INDEX IF EXISTS public.app_settings_key_company_unique;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_key_company_unique UNIQUE (key, company_id);
