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
