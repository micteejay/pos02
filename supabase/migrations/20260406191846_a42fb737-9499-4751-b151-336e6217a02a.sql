
-- 1. Fix company_profiles: restrict SELECT to own company only
DROP POLICY IF EXISTS "auth_read" ON public.company_profiles;
CREATE POLICY "company_read" ON public.company_profiles FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id = get_user_company_id(auth.uid()));

-- 2. Fix chat_messages: scope to company via channel
DROP POLICY IF EXISTS "auth_all" ON public.chat_messages;
DROP POLICY IF EXISTS "auth_read" ON public.chat_messages;
CREATE POLICY "company_read" ON public.chat_messages FOR SELECT TO authenticated
  USING (channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid())));
CREATE POLICY "company_insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid())));
CREATE POLICY "company_update" ON public.chat_messages FOR UPDATE TO authenticated
  USING (channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid())) AND sender_id = auth.uid());
CREATE POLICY "company_delete" ON public.chat_messages FOR DELETE TO authenticated
  USING (channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid())) AND sender_id = auth.uid());

-- 3. Fix chat_channel_members: scope to company channels
DROP POLICY IF EXISTS "auth_all" ON public.chat_channel_members;
CREATE POLICY "company_all" ON public.chat_channel_members FOR ALL TO authenticated
  USING (channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid())))
  WITH CHECK (channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid())));

-- 4. Fix user_roles: scope admin actions to same company
DROP POLICY IF EXISTS "admin_all" ON public.user_roles;
CREATE POLICY "company_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    AND (user_id IN (SELECT id FROM public.profiles WHERE company_id = get_user_company_id(auth.uid())))
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    AND (user_id IN (SELECT id FROM public.profiles WHERE company_id = get_user_company_id(auth.uid())))
  );
-- Allow users to read their own roles
CREATE POLICY "own_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Fix invoice_items: scope via parent invoice
DROP POLICY IF EXISTS "invoice_items_all" ON public.invoice_items;
CREATE POLICY "company_all" ON public.invoice_items FOR ALL TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE company_id = get_user_company_id(auth.uid())))
  WITH CHECK (invoice_id IN (SELECT id FROM public.invoices WHERE company_id = get_user_company_id(auth.uid())));

-- 6. Fix purchase_order_items: scope via parent PO
DROP POLICY IF EXISTS "auth_delete" ON public.purchase_order_items;
DROP POLICY IF EXISTS "auth_insert" ON public.purchase_order_items;
DROP POLICY IF EXISTS "auth_read" ON public.purchase_order_items;
DROP POLICY IF EXISTS "auth_update" ON public.purchase_order_items;
CREATE POLICY "company_all" ON public.purchase_order_items FOR ALL TO authenticated
  USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id = get_user_company_id(auth.uid())))
  WITH CHECK (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id = get_user_company_id(auth.uid())));

-- 7. Fix stock_adjustments: scope via inventory item
DROP POLICY IF EXISTS "auth_insert" ON public.stock_adjustments;
DROP POLICY IF EXISTS "auth_read" ON public.stock_adjustments;
CREATE POLICY "company_read" ON public.stock_adjustments FOR SELECT TO authenticated
  USING (inventory_item_id IN (SELECT id FROM public.inventory_items WHERE company_id = get_user_company_id(auth.uid())));
CREATE POLICY "company_insert" ON public.stock_adjustments FOR INSERT TO authenticated
  WITH CHECK (inventory_item_id IN (SELECT id FROM public.inventory_items WHERE company_id = get_user_company_id(auth.uid())));

-- 8. Fix sales_returns: scope via transaction
DROP POLICY IF EXISTS "auth_insert" ON public.sales_returns;
DROP POLICY IF EXISTS "auth_read" ON public.sales_returns;
CREATE POLICY "company_read" ON public.sales_returns FOR SELECT TO authenticated
  USING (transaction_id IN (SELECT id FROM public.sales_transactions WHERE company_id = get_user_company_id(auth.uid())));
CREATE POLICY "company_insert" ON public.sales_returns FOR INSERT TO authenticated
  WITH CHECK (transaction_id IN (SELECT id FROM public.sales_transactions WHERE company_id = get_user_company_id(auth.uid())));

-- 9. Fix sales_return_items: scope via return -> transaction
DROP POLICY IF EXISTS "auth_insert" ON public.sales_return_items;
DROP POLICY IF EXISTS "auth_read" ON public.sales_return_items;
CREATE POLICY "company_read" ON public.sales_return_items FOR SELECT TO authenticated
  USING (return_id IN (SELECT id FROM public.sales_returns WHERE transaction_id IN (SELECT id FROM public.sales_transactions WHERE company_id = get_user_company_id(auth.uid()))));
CREATE POLICY "company_insert" ON public.sales_return_items FOR INSERT TO authenticated
  WITH CHECK (return_id IN (SELECT id FROM public.sales_returns WHERE transaction_id IN (SELECT id FROM public.sales_transactions WHERE company_id = get_user_company_id(auth.uid()))));

-- 10. Fix sales_transaction_items: scope via transaction
DROP POLICY IF EXISTS "auth_insert" ON public.sales_transaction_items;
DROP POLICY IF EXISTS "auth_read" ON public.sales_transaction_items;
CREATE POLICY "company_read" ON public.sales_transaction_items FOR SELECT TO authenticated
  USING (transaction_id IN (SELECT id FROM public.sales_transactions WHERE company_id = get_user_company_id(auth.uid())));
CREATE POLICY "company_insert" ON public.sales_transaction_items FOR INSERT TO authenticated
  WITH CHECK (transaction_id IN (SELECT id FROM public.sales_transactions WHERE company_id = get_user_company_id(auth.uid())));

-- 11. Fix stock_transfers: add company_id column and scope
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
DROP POLICY IF EXISTS "auth_insert" ON public.stock_transfers;
DROP POLICY IF EXISTS "auth_read" ON public.stock_transfers;
DROP POLICY IF EXISTS "auth_update" ON public.stock_transfers;
CREATE POLICY "company_all" ON public.stock_transfers FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- 12. Fix stock_transfer_items: scope via transfer
DROP POLICY IF EXISTS "auth_insert" ON public.stock_transfer_items;
DROP POLICY IF EXISTS "auth_read" ON public.stock_transfer_items;
CREATE POLICY "company_all" ON public.stock_transfer_items FOR ALL TO authenticated
  USING (transfer_id IN (SELECT id FROM public.stock_transfers WHERE company_id = get_user_company_id(auth.uid())))
  WITH CHECK (transfer_id IN (SELECT id FROM public.stock_transfers WHERE company_id = get_user_company_id(auth.uid())));

-- 13. Fix chat_document_links: scope via message channel
DROP POLICY IF EXISTS "auth_all" ON public.chat_document_links;
CREATE POLICY "company_all" ON public.chat_document_links FOR ALL TO authenticated
  USING (message_id IN (SELECT id FROM public.chat_messages WHERE channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid()))))
  WITH CHECK (message_id IN (SELECT id FROM public.chat_messages WHERE channel_id IN (SELECT id FROM public.chat_channels WHERE company_id = get_user_company_id(auth.uid()))));

-- 14. Fix workflows: remove overly permissive auth_read
DROP POLICY IF EXISTS "auth_read" ON public.workflows;

-- 15. Fix workflow_templates: remove overly permissive auth_read
DROP POLICY IF EXISTS "auth_read" ON public.workflow_templates;

-- 16. Fix workflow_step_history: scope via workflow
DROP POLICY IF EXISTS "auth_insert" ON public.workflow_step_history;
DROP POLICY IF EXISTS "auth_read" ON public.workflow_step_history;
CREATE POLICY "company_read" ON public.workflow_step_history FOR SELECT TO authenticated
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE company_id = get_user_company_id(auth.uid())));
CREATE POLICY "company_insert" ON public.workflow_step_history FOR INSERT TO authenticated
  WITH CHECK (workflow_id IN (SELECT id FROM public.workflows WHERE company_id = get_user_company_id(auth.uid())));

-- 17. Fix mutable search_path functions
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_inventory_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.qty <= 0 THEN NEW.status = 'critical';
  ELSIF NEW.qty <= NEW.reorder_point THEN NEW.status = 'low';
  ELSE NEW.status = 'ok';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_po_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.purchase_orders
  SET subtotal = (SELECT COALESCE(SUM(total), 0) FROM public.purchase_order_items WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)),
      total = (SELECT COALESCE(SUM(total), 0) FROM public.purchase_order_items WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id))
             + COALESCE((SELECT tax FROM public.purchase_orders WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)), 0)
             + COALESCE((SELECT shipping FROM public.purchase_orders WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)), 0)
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_txn_number()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'TXN-' || nextval('txn_number_seq')::TEXT
$$;

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'PO-' || nextval('po_number_seq')::TEXT
$$;

CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'RCP-' || nextval('receipt_number_seq')::TEXT
$$;

CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'TRF-' || nextval('transfer_number_seq')::TEXT
$$;
