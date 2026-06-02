-- Integration configs
DROP POLICY IF EXISTS "integration_all" ON public.integration_configs;
CREATE POLICY "integration_all" ON public.integration_configs FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()));

-- Invoices
DROP POLICY IF EXISTS "invoice_all" ON public.invoices;
CREATE POLICY "invoice_all" ON public.invoices FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "invoice_items_all" ON public.invoice_items;
CREATE POLICY "invoice_items_all" ON public.invoice_items FOR ALL TO authenticated USING (TRUE);

-- Self write
DROP POLICY IF EXISTS "own_update" ON public.profiles;
CREATE POLICY "own_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "own_insert" ON public.notifications;
CREATE POLICY "own_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own_delete" ON public.notifications;
CREATE POLICY "own_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own_update" ON public.notifications;
CREATE POLICY "own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Admin management
DROP POLICY IF EXISTS "admin_all" ON public.user_roles;
CREATE POLICY "admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.roles;
CREATE POLICY "admin_all" ON public.roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.stores;
CREATE POLICY "admin_all" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.warehouses;
CREATE POLICY "admin_all" ON public.warehouses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.departments;
CREATE POLICY "admin_all" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.app_settings;
CREATE POLICY "admin_all" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.receipt_templates;
CREATE POLICY "admin_all" ON public.receipt_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.user_store_assignments;
CREATE POLICY "admin_all" ON public.user_store_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin_all" ON public.user_warehouse_assignments;
CREATE POLICY "admin_all" ON public.user_warehouse_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "manager_insert" ON public.user_store_assignments;
CREATE POLICY "manager_insert" ON public.user_store_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager') AND store_id IN (SELECT store_id FROM public.user_store_assignments WHERE user_id = auth.uid()));

-- Operational write
DROP POLICY IF EXISTS "auth_insert" ON public.inventory_categories;
CREATE POLICY "auth_insert" ON public.inventory_categories FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_update" ON public.inventory_categories;
CREATE POLICY "auth_update" ON public.inventory_categories FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.inventory_items;
CREATE POLICY "auth_insert" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_update" ON public.inventory_items;
CREATE POLICY "auth_update" ON public.inventory_items FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_delete" ON public.inventory_items;
CREATE POLICY "auth_delete" ON public.inventory_items FOR DELETE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.stock_adjustments;
CREATE POLICY "auth_insert" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.stock_transfers;
CREATE POLICY "auth_insert" ON public.stock_transfers FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_update" ON public.stock_transfers;
CREATE POLICY "auth_update" ON public.stock_transfers FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.stock_transfer_items;
CREATE POLICY "auth_insert" ON public.stock_transfer_items FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.suppliers;
CREATE POLICY "auth_all" ON public.suppliers FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.purchase_orders;
CREATE POLICY "auth_insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_update" ON public.purchase_orders;
CREATE POLICY "auth_update" ON public.purchase_orders FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.purchase_order_items;
CREATE POLICY "auth_insert" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_update" ON public.purchase_order_items;
CREATE POLICY "auth_update" ON public.purchase_order_items FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_delete" ON public.purchase_order_items;
CREATE POLICY "auth_delete" ON public.purchase_order_items FOR DELETE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.sales_transactions;
CREATE POLICY "auth_insert" ON public.sales_transactions FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_update" ON public.sales_transactions;
CREATE POLICY "auth_update" ON public.sales_transactions FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.sales_transaction_items;
CREATE POLICY "auth_insert" ON public.sales_transaction_items FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.sales_returns;
CREATE POLICY "auth_insert" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.sales_return_items;
CREATE POLICY "auth_insert" ON public.sales_return_items FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.workflow_templates;
CREATE POLICY "auth_all" ON public.workflow_templates FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.workflows;
CREATE POLICY "auth_all" ON public.workflows FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.workflow_step_history;
CREATE POLICY "auth_insert" ON public.workflow_step_history FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.approvals;
CREATE POLICY "auth_all" ON public.approvals FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.document_folders;
CREATE POLICY "auth_all" ON public.document_folders FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.documents;
CREATE POLICY "auth_all" ON public.documents FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.document_shares;
CREATE POLICY "auth_insert" ON public.document_shares FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_delete" ON public.document_shares;
CREATE POLICY "auth_delete" ON public.document_shares FOR DELETE TO authenticated USING (shared_with = auth.uid());
DROP POLICY IF EXISTS "auth_all" ON public.chat_channels;
CREATE POLICY "auth_all" ON public.chat_channels FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.chat_channel_members;
CREATE POLICY "auth_all" ON public.chat_channel_members FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.chat_messages;
CREATE POLICY "auth_all" ON public.chat_messages FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_all" ON public.saved_reports;
CREATE POLICY "auth_all" ON public.saved_reports FOR ALL TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.audit_log;
CREATE POLICY "auth_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "auth_insert" ON public.user_sessions;
CREATE POLICY "auth_insert" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "auth_update" ON public.user_sessions;
CREATE POLICY "auth_update" ON public.user_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
