CREATE TABLE IF NOT EXISTS public.permission_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  change_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  requested_by_name text,
  reviewed_by uuid,
  reviewed_by_name text,
  review_notes text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.permission_change_requests TO authenticated;
GRANT ALL ON public.permission_change_requests TO service_role;

ALTER TABLE public.permission_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcr_insert_company"
  ON public.permission_change_requests FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND requested_by = auth.uid());

CREATE POLICY "pcr_select_company_admin_or_own"
  ON public.permission_change_requests FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])
      OR requested_by = auth.uid()
    )
  );

CREATE POLICY "pcr_update_company_admin"
  ON public.permission_change_requests FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])
  );

CREATE TRIGGER tr_pcr_updated
  BEFORE UPDATE ON public.permission_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.permission_change_requests;