ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS suspended_reason text;