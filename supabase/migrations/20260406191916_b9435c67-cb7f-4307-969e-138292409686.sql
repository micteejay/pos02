
-- Fix document_shares: scope insert via document company
DROP POLICY IF EXISTS "auth_insert" ON public.document_shares;
CREATE POLICY "company_insert" ON public.document_shares FOR INSERT TO authenticated
  WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE company_id = get_user_company_id(auth.uid())));
