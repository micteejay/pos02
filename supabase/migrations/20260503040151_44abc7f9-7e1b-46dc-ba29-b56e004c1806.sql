-- Fix app_settings to be properly multi-tenant
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;
-- Allow same key per company. Use COALESCE-style by making company_id NOT NULL would break existing — keep nullable but unique pair.
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_company_unique
  ON public.app_settings (key, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));
