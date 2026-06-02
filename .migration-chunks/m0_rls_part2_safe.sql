-- =====================================================

-- Read policies
DROP POLICY IF EXISTS "auth_read" ON public.profiles;
CREATE POLICY "auth_read" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.roles;
CREATE POLICY "auth_read" ON public.roles FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.departments;
CREATE POLICY "auth_read" ON public.departments FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.inventory_categories;
CREATE POLICY "auth_read" ON public.inventory_categories FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.inventory_items;
CREATE POLICY "auth_read" ON public.inventory_items FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.stock_adjustments;
CREATE POLICY "auth_read" ON public.stock_adjustments FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.stock_transfers;
CREATE POLICY "auth_read" ON public.stock_transfers FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.stock_transfer_items;
CREATE POLICY "auth_read" ON public.stock_transfer_items FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.suppliers;
CREATE POLICY "auth_read" ON public.suppliers FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.purchase_orders;
CREATE POLICY "auth_read" ON public.purchase_orders FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.purchase_order_items;
CREATE POLICY "auth_read" ON public.purchase_order_items FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.sales_transaction_items;
CREATE POLICY "auth_read" ON public.sales_transaction_items FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.sales_returns;
CREATE POLICY "auth_read" ON public.sales_returns FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.sales_return_items;
CREATE POLICY "auth_read" ON public.sales_return_items FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.workflow_templates;
CREATE POLICY "auth_read" ON public.workflow_templates FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.workflows;
CREATE POLICY "auth_read" ON public.workflows FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.workflow_step_history;
CREATE POLICY "auth_read" ON public.workflow_step_history FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.approvals;
CREATE POLICY "auth_read" ON public.approvals FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.document_folders;
CREATE POLICY "auth_read" ON public.document_folders FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.documents;
CREATE POLICY "auth_read" ON public.documents FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.chat_channels;
CREATE POLICY "auth_read" ON public.chat_channels FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.chat_messages;
CREATE POLICY "auth_read" ON public.chat_messages FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.app_settings;
CREATE POLICY "auth_read" ON public.app_settings FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.saved_reports;
CREATE POLICY "auth_read" ON public.saved_reports FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_read" ON public.receipt_templates;
CREATE POLICY "auth_read" ON public.receipt_templates FOR SELECT TO authenticated USING (TRUE);

-- Store-scoped
DROP POLICY IF EXISTS "store_access_read" ON public.stores;
CREATE POLICY "store_access_read" ON public.stores FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]) OR id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "warehouse_access_read" ON public.warehouses;
CREATE POLICY "warehouse_access_read" ON public.warehouses FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]) OR id IN (SELECT warehouse_id FROM public.user_warehouse_assignments WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "store_scoped_sales_read" ON public.sales_transactions;
CREATE POLICY "store_scoped_sales_read" ON public.sales_transactions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]) OR store_id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()) OR cashier_id = auth.uid());

-- Own data
DROP POLICY IF EXISTS "role_based_read" ON public.notifications;
CREATE POLICY "role_based_read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR target_roles = '{}' OR (SELECT r.name FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() LIMIT 1) = ANY(target_roles));
DROP POLICY IF EXISTS "own_read" ON public.user_sessions;
CREATE POLICY "own_read" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own_read" ON public.chat_channel_members;
CREATE POLICY "own_read" ON public.chat_channel_members FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own_read" ON public.document_shares;
CREATE POLICY "own_read" ON public.document_shares FOR SELECT TO authenticated USING (shared_with = auth.uid());
DROP POLICY IF EXISTS "admin_read" ON public.audit_log;
CREATE POLICY "admin_read" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "own_read" ON public.user_store_assignments;
CREATE POLICY "own_read" ON public.user_store_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own_read" ON public.user_warehouse_assignments;
CREATE POLICY "own_read" ON public.user_warehouse_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Broad access
DROP POLICY IF EXISTS "auth_all" ON public.generated_reports;
CREATE POLICY "auth_all" ON public.generated_reports FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.chat_document_links;
CREATE POLICY "auth_all" ON public.chat_document_links FOR ALL TO authenticated USING (TRUE);

-- Categories
DROP POLICY IF EXISTS "category_read" ON public.categories;
CREATE POLICY "category_read" ON public.categories FOR SELECT TO authenticated
  USING (status = 'approved' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "category_insert" ON public.categories;
CREATE POLICY "category_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "category_update" ON public.categories;
CREATE POLICY "category_update" ON public.categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "category_delete" ON public.categories;
CREATE POLICY "category_delete" ON public.categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Expenses
DROP POLICY IF EXISTS "expense_read" ON public.expenses;
CREATE POLICY "expense_read" ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR store_id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "expense_insert" ON public.expenses;
CREATE POLICY "expense_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "expense_update" ON public.expenses;
CREATE POLICY "expense_update" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "expense_delete" ON public.expenses;
CREATE POLICY "expense_delete" ON public.expenses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
