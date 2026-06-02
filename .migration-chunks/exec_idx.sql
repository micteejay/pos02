-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON public.inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON public.inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_adj_item ON public.stock_adjustments(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_type ON public.stock_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_stock_adj_ref ON public.stock_adjustments(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON public.stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_warehouse ON public.purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_store ON public.sales_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_txn ON public.sales_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_returns_txn ON public.sales_returns(transaction_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_source ON public.workflows(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_wf_history_wf ON public.workflow_step_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON public.approvals(type);
CREATE INDEX IF NOT EXISTS idx_approvals_source ON public.approvals(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_author ON public.documents(author);
CREATE INDEX IF NOT EXISTS idx_doc_shares ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_module ON public.audit_log(module);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_saved_reports_user ON public.saved_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_integrations_category ON public.integration_configs(category);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_user_store_assignments_user ON public.user_store_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_store_assignments_store ON public.user_store_assignments(store_id);
CREATE INDEX IF NOT EXISTS idx_user_warehouse_assignments_user ON public.user_warehouse_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warehouse_assignments_warehouse ON public.user_warehouse_assignments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.generated_reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON public.generated_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_chat_doc_links_msg ON public.chat_document_links(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_doc_links_doc ON public.chat_document_links(document_id);

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', FALSE);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', FALSE);

CREATE POLICY "auth_read" ON storage.objects FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON storage.objects FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON storage.objects FOR DELETE TO authenticated USING (TRUE);


INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', FALSE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', FALSE) ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_read" ON storage.objects FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_update" ON storage.objects FOR UPDATE TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "auth_delete" ON storage.objects FOR DELETE TO authenticated USING (TRUE);
  END IF;
END $$;