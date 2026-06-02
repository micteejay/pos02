-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_store_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warehouse_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Read policies
CREATE POLICY "auth_read" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.inventory_categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.inventory_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.stock_adjustments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.stock_transfers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.stock_transfer_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.suppliers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.purchase_orders FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.purchase_order_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.sales_transaction_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.sales_returns FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.sales_return_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.workflow_templates FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.workflows FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.workflow_step_history FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.approvals FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.document_folders FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.documents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.chat_channels FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.chat_messages FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.app_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.saved_reports FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.receipt_templates FOR SELECT TO authenticated USING (TRUE);

-- Store-scoped
CREATE POLICY "store_access_read" ON public.stores FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]) OR id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()));
CREATE POLICY "warehouse_access_read" ON public.warehouses FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]) OR id IN (SELECT warehouse_id FROM public.user_warehouse_assignments WHERE user_id = auth.uid()));
CREATE POLICY "store_scoped_sales_read" ON public.sales_transactions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]) OR store_id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()) OR cashier_id = auth.uid());

-- Own data
CREATE POLICY "role_based_read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR target_roles = '{}' OR (SELECT r.name FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() LIMIT 1) = ANY(target_roles));
CREATE POLICY "own_read" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_read" ON public.chat_channel_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_read" ON public.document_shares FOR SELECT TO authenticated USING (shared_with = auth.uid());
CREATE POLICY "admin_read" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "own_read" ON public.user_store_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_read" ON public.user_warehouse_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Broad access
CREATE POLICY "auth_all" ON public.generated_reports FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.chat_document_links FOR ALL TO authenticated USING (TRUE);

-- Categories
CREATE POLICY "category_read" ON public.categories FOR SELECT TO authenticated
  USING (status = 'approved' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "category_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "category_update" ON public.categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "category_delete" ON public.categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Expenses
CREATE POLICY "expense_read" ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR store_id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()));
CREATE POLICY "expense_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "expense_update" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "expense_delete" ON public.expenses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Integration configs
CREATE POLICY "integration_all" ON public.integration_configs FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()));

-- Invoices
CREATE POLICY "invoice_all" ON public.invoices FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "invoice_items_all" ON public.invoice_items FOR ALL TO authenticated USING (TRUE);

-- Self write
CREATE POLICY "own_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Admin management
CREATE POLICY "admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.warehouses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.receipt_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.user_store_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_all" ON public.user_warehouse_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "manager_insert" ON public.user_store_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager') AND store_id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()));

-- Operational write
CREATE POLICY "auth_insert" ON public.inventory_categories FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.inventory_categories FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.inventory_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON public.inventory_items FOR DELETE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_insert" ON public.stock_transfers FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.stock_transfers FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.stock_transfer_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_all" ON public.suppliers FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.purchase_orders FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.purchase_order_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON public.purchase_order_items FOR DELETE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.sales_transactions FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.sales_transactions FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.sales_transaction_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_insert" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_insert" ON public.sales_return_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_all" ON public.workflow_templates FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.workflows FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.workflow_step_history FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_all" ON public.approvals FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.document_folders FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.documents FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.document_shares FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_delete" ON public.document_shares FOR DELETE TO authenticated USING (shared_with = auth.uid());
CREATE POLICY "auth_all" ON public.chat_channels FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.chat_channel_members FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.chat_messages FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.saved_reports FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_insert" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "auth_update" ON public.user_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
