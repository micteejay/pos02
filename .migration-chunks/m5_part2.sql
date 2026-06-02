-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_stores_company ON public.stores(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_company ON public.inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_company ON public.sales_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON public.audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id);

-- 4. Now create the helper function (column exists now)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- 5. Drop old RLS policies and create company-scoped ones

-- STORES
DROP POLICY IF EXISTS "admin_all" ON public.stores;
DROP POLICY IF EXISTS "store_access_read" ON public.stores;
CREATE POLICY "company_admin_all" ON public.stores FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));
CREATE POLICY "company_read" ON public.stores FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (
    has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])
    OR id IN (SELECT store_id FROM user_store_assignments WHERE user_id = auth.uid())
  ));

-- WAREHOUSES
DROP POLICY IF EXISTS "admin_all" ON public.warehouses;
DROP POLICY IF EXISTS "warehouse_access_read" ON public.warehouses;
CREATE POLICY "company_admin_all" ON public.warehouses FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));
CREATE POLICY "company_read" ON public.warehouses FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (
    has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])
    OR id IN (SELECT warehouse_id FROM user_warehouse_assignments WHERE user_id = auth.uid())
  ));

-- DEPARTMENTS
DROP POLICY IF EXISTS "admin_all" ON public.departments;
DROP POLICY IF EXISTS "auth_read" ON public.departments;
CREATE POLICY "company_admin_all" ON public.departments FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));
CREATE POLICY "company_read" ON public.departments FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "auth_delete" ON public.inventory_items;
DROP POLICY IF EXISTS "auth_insert" ON public.inventory_items;
DROP POLICY IF EXISTS "auth_read" ON public.inventory_items;
DROP POLICY IF EXISTS "auth_update" ON public.inventory_items;
CREATE POLICY "company_all" ON public.inventory_items FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- INVENTORY_CATEGORIES
DROP POLICY IF EXISTS "auth_insert" ON public.inventory_categories;
DROP POLICY IF EXISTS "auth_read" ON public.inventory_categories;
DROP POLICY IF EXISTS "auth_update" ON public.inventory_categories;
CREATE POLICY "company_all" ON public.inventory_categories FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- SALES_TRANSACTIONS
DROP POLICY IF EXISTS "auth_insert" ON public.sales_transactions;
DROP POLICY IF EXISTS "auth_update" ON public.sales_transactions;
DROP POLICY IF EXISTS "store_scoped_sales_read" ON public.sales_transactions;
CREATE POLICY "company_insert" ON public.sales_transactions FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "company_update" ON public.sales_transactions FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "company_read" ON public.sales_transactions FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (
    has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])
    OR store_id IN (SELECT store_id FROM user_store_assignments WHERE user_id = auth.uid())
    OR cashier_id = auth.uid()
  ));

-- INVOICES
DROP POLICY IF EXISTS "invoice_all" ON public.invoices;
CREATE POLICY "company_all" ON public.invoices FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- PURCHASE_ORDERS
DROP POLICY IF EXISTS "auth_insert" ON public.purchase_orders;
DROP POLICY IF EXISTS "auth_read" ON public.purchase_orders;
DROP POLICY IF EXISTS "auth_update" ON public.purchase_orders;
CREATE POLICY "company_all" ON public.purchase_orders FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- SUPPLIERS
DROP POLICY IF EXISTS "auth_all" ON public.suppliers;
DROP POLICY IF EXISTS "auth_read" ON public.suppliers;
CREATE POLICY "company_all" ON public.suppliers FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- EXPENSES
DROP POLICY IF EXISTS "expense_delete" ON public.expenses;
DROP POLICY IF EXISTS "expense_insert" ON public.expenses;
DROP POLICY IF EXISTS "expense_read" ON public.expenses;
DROP POLICY IF EXISTS "expense_update" ON public.expenses;
CREATE POLICY "company_read" ON public.expenses FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "company_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "company_update" ON public.expenses FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "company_delete" ON public.expenses FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])));

-- CATEGORIES
DROP POLICY IF EXISTS "category_delete" ON public.categories;
DROP POLICY IF EXISTS "category_insert" ON public.categories;
DROP POLICY IF EXISTS "category_read" ON public.categories;
DROP POLICY IF EXISTS "category_update" ON public.categories;
CREATE POLICY "company_all" ON public.categories FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- DOCUMENTS
DROP POLICY IF EXISTS "auth_all" ON public.documents;
DROP POLICY IF EXISTS "auth_read" ON public.documents;
CREATE POLICY "company_all" ON public.documents FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- DOCUMENT_FOLDERS
DROP POLICY IF EXISTS "auth_all" ON public.document_folders;
DROP POLICY IF EXISTS "auth_read" ON public.document_folders;
CREATE POLICY "company_all" ON public.document_folders FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- CHAT_CHANNELS
DROP POLICY IF EXISTS "auth_all" ON public.chat_channels;
DROP POLICY IF EXISTS "auth_read" ON public.chat_channels;
CREATE POLICY "company_all" ON public.chat_channels FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- APPROVALS
DROP POLICY IF EXISTS "auth_all" ON public.approvals;
DROP POLICY IF EXISTS "auth_read" ON public.approvals;
CREATE POLICY "company_all" ON public.approvals FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- WORKFLOWS
DROP POLICY IF EXISTS "auth_all" ON public.workflows;
CREATE POLICY "company_all" ON public.workflows FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- WORKFLOW_TEMPLATES
DROP POLICY IF EXISTS "auth_all" ON public.workflow_templates;
CREATE POLICY "company_all" ON public.workflow_templates FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- RECEIPT_TEMPLATES
DROP POLICY IF EXISTS "admin_all" ON public.receipt_templates;
DROP POLICY IF EXISTS "auth_read" ON public.receipt_templates;
CREATE POLICY "company_admin_all" ON public.receipt_templates FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])));
CREATE POLICY "company_read" ON public.receipt_templates FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- SAVED_REPORTS
DROP POLICY IF EXISTS "auth_all" ON public.saved_reports;
DROP POLICY IF EXISTS "auth_read" ON public.saved_reports;
CREATE POLICY "company_all" ON public.saved_reports FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- GENERATED_REPORTS
DROP POLICY IF EXISTS "auth_all" ON public.generated_reports;
CREATE POLICY "company_all" ON public.generated_reports FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- APP_SETTINGS
DROP POLICY IF EXISTS "admin_all" ON public.app_settings;
DROP POLICY IF EXISTS "auth_read" ON public.app_settings;
CREATE POLICY "company_admin_all" ON public.app_settings FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])));
CREATE POLICY "company_read" ON public.app_settings FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "own_delete" ON public.notifications;
DROP POLICY IF EXISTS "own_insert" ON public.notifications;
DROP POLICY IF EXISTS "own_update" ON public.notifications;
DROP POLICY IF EXISTS "role_based_read" ON public.notifications;
CREATE POLICY "company_own_read" ON public.notifications FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "company_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "company_own_update" ON public.notifications FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "company_own_delete" ON public.notifications FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());

-- AUDIT_LOG
DROP POLICY IF EXISTS "admin_read" ON public.audit_log;
DROP POLICY IF EXISTS "auth_insert" ON public.audit_log;
CREATE POLICY "company_admin_read" ON public.audit_log FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])));
CREATE POLICY "company_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- PROFILES
DROP POLICY IF EXISTS "auth_read" ON public.profiles;
CREATE POLICY "company_read" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR id = auth.uid());

-- 6. Update promote_to_super_admin to set company_id on profile
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _role_id UUID; _company_id UUID;
BEGIN
  IF (SELECT COUNT(*) FROM public.company_profiles WHERE owner_id = _user_id) != 1 THEN
    RETURN;
  END IF;
  SELECT id INTO _company_id FROM public.company_profiles WHERE owner_id = _user_id LIMIT 1;
  SELECT id INTO _role_id FROM public.roles WHERE name = 'Super Admin' LIMIT 1;
  IF _role_id IS NULL THEN RETURN; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (_user_id, _role_id);
  UPDATE public.profiles SET company_id = _company_id WHERE id = _user_id;
END;
$$;

-- 7. Update log_audit to include company_id
CREATE OR REPLACE FUNCTION public.log_audit(_action text, _module text, _target text DEFAULT NULL, _detail text DEFAULT NULL, _severity audit_severity DEFAULT 'info', _metadata jsonb DEFAULT '{}')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id UUID; _user_name TEXT; _user_role TEXT; _company_id UUID;
BEGIN
  SELECT p.name, p.company_id INTO _user_name, _company_id FROM public.profiles p WHERE p.id = auth.uid();
  SELECT r.name INTO _user_role FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_log (user_id, user_name, user_role, action, module, target, detail, severity, metadata, company_id)
  VALUES (auth.uid(), _user_name, _user_role, _action, _module, _target, _detail, _severity, _metadata, _company_id)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 8. Update send_notification to include company_id
CREATE OR REPLACE FUNCTION public.send_notification(_user_id uuid, _type notification_type, _title text, _message text DEFAULT NULL, _link text DEFAULT NULL, _metadata jsonb DEFAULT '{}')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id UUID; _company_id UUID;
BEGIN
  SELECT company_id INTO _company_id FROM public.profiles WHERE id = _user_id;
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata, company_id)
  VALUES (_user_id, _type, _title, _message, _link, _metadata, _company_id)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 9. Update send_role_notification to scope to caller's company
CREATE OR REPLACE FUNCTION public.send_role_notification(_target_roles text[], _type notification_type, _title text, _message text DEFAULT NULL, _link text DEFAULT NULL, _created_by text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _company_id UUID;
BEGIN
  SELECT company_id INTO _company_id FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.notifications (user_id, type, title, message, link, target_roles, created_by_name, company_id)
  SELECT DISTINCT ur.user_id, _type, _title, _message, _link, _target_roles, _created_by, _company_id
  FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE r.name = ANY(_target_roles) AND p.company_id = _company_id;
END;
$$;
