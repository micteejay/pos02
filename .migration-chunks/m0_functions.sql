-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND r.name = _role::TEXT
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND r.name = ANY(ARRAY(SELECT unnest(_roles)::TEXT))
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND _permission = ANY(r.permissions)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT perm), '{}')
  FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id,
  LATERAL unnest(r.permissions) AS perm
  WHERE ur.user_id = _user_id
$$;

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id FROM public.roles r WHERE r.name = 'Viewer' LIMIT 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INVENTORY STATUS TRIGGER
CREATE OR REPLACE FUNCTION public.update_inventory_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.qty <= 0 THEN NEW.status = 'critical';
  ELSIF NEW.qty <= NEW.reorder_point THEN NEW.status = 'low';
  ELSE NEW.status = 'ok';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_inventory_status BEFORE INSERT OR UPDATE OF qty ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_status();

-- PO TOTAL TRIGGER
CREATE OR REPLACE FUNCTION public.update_po_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.purchase_orders
  SET subtotal = (SELECT COALESCE(SUM(total), 0) FROM public.purchase_order_items WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)),
      total = (SELECT COALESCE(SUM(total), 0) FROM public.purchase_order_items WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id))
             + COALESCE((SELECT tax FROM public.purchase_orders WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)), 0)
             + COALESCE((SELECT shipping FROM public.purchase_orders WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)), 0)
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_po_item_total AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_po_total();

-- PO RECEIVED TRIGGER
CREATE OR REPLACE FUNCTION public.handle_po_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    NEW.received_date = NOW();
    UPDATE public.inventory_items inv SET qty = inv.qty + poi.qty
    FROM public.purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id AND poi.inventory_item_id = inv.id;
    INSERT INTO public.stock_adjustments (inventory_item_id, adjustment_type, qty_before, qty_change, qty_after, reason, reference_id, reference_type, adjusted_by)
    SELECT poi.inventory_item_id, 'po_received', inv.qty - poi.qty, poi.qty, inv.qty,
      'PO ' || NEW.po_number || ' received', NEW.id::TEXT, 'purchase_order', NEW.approved_by
    FROM public.purchase_order_items poi JOIN public.inventory_items inv ON inv.id = poi.inventory_item_id
    WHERE poi.purchase_order_id = NEW.id AND poi.inventory_item_id IS NOT NULL;
    UPDATE public.suppliers SET total_orders = total_orders + 1 WHERE id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_po_received BEFORE UPDATE OF status ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_po_received();

-- SALE COMPLETED TRIGGER
CREATE OR REPLACE FUNCTION public.handle_sale_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.inventory_items inv SET qty = GREATEST(inv.qty - sti.qty, 0)
    FROM public.sales_transaction_items sti
    WHERE sti.transaction_id = NEW.id AND sti.inventory_item_id = inv.id;
    INSERT INTO public.stock_adjustments (inventory_item_id, adjustment_type, qty_before, qty_change, qty_after, reason, reference_id, reference_type, adjusted_by)
    SELECT sti.inventory_item_id, 'sale', inv.qty + sti.qty, -sti.qty, inv.qty,
      'Sale ' || NEW.transaction_number, NEW.id::TEXT, 'sale', NEW.cashier_id
    FROM public.sales_transaction_items sti JOIN public.inventory_items inv ON inv.id = sti.inventory_item_id
    WHERE sti.transaction_id = NEW.id AND sti.inventory_item_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_sale_completed AFTER INSERT ON public.sales_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_completed();

-- TRANSFER DELIVERED TRIGGER
CREATE OR REPLACE FUNCTION public.handle_transfer_delivered()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    INSERT INTO public.stock_adjustments (inventory_item_id, adjustment_type, qty_before, qty_change, qty_after, reason, reference_id, reference_type, adjusted_by)
    SELECT sti.inventory_item_id, 'transfer_in', 0, sti.qty, sti.qty,
      'Transfer ' || NEW.transfer_number || ' delivered', NEW.id::TEXT, 'stock_transfer', NEW.approved_by
    FROM public.stock_transfer_items sti
    WHERE sti.transfer_id = NEW.id AND sti.inventory_item_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_transfer_delivered BEFORE UPDATE OF status ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_transfer_delivered();

-- AUDIT LOG HELPER
CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT, _module TEXT, _target TEXT DEFAULT NULL, _detail TEXT DEFAULT NULL,
  _severity audit_severity DEFAULT 'info', _metadata JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID; _user_name TEXT; _user_role TEXT;
BEGIN
  SELECT p.name INTO _user_name FROM public.profiles p WHERE p.id = auth.uid();
  SELECT r.name INTO _user_role FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_log (user_id, user_name, user_role, action, module, target, detail, severity, metadata)
  VALUES (auth.uid(), _user_name, _user_role, _action, _module, _target, _detail, _severity, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- NOTIFICATION HELPERS
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id UUID, _type notification_type, _title TEXT, _message TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL, _metadata JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (_user_id, _type, _title, _message, _link, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_role_notification(
  _target_roles TEXT[], _type notification_type, _title TEXT,
  _message TEXT DEFAULT NULL, _link TEXT DEFAULT NULL, _created_by TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, target_roles, created_by_name)
  SELECT DISTINCT ur.user_id, _type, _title, _message, _link, _target_roles, _created_by
  FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
  WHERE r.name = ANY(_target_roles);
END;
$$;

-- SEQUENCES
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS txn_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START WITH 1000;

CREATE OR REPLACE FUNCTION public.generate_po_number() RETURNS TEXT LANGUAGE sql AS $$ SELECT 'PO-' || nextval('po_number_seq')::TEXT $$;
CREATE OR REPLACE FUNCTION public.generate_txn_number() RETURNS TEXT LANGUAGE sql AS $$ SELECT 'TXN-' || nextval('txn_number_seq')::TEXT $$;
CREATE OR REPLACE FUNCTION public.generate_transfer_number() RETURNS TEXT LANGUAGE sql AS $$ SELECT 'TRF-' || nextval('transfer_number_seq')::TEXT $$;
CREATE OR REPLACE FUNCTION public.generate_receipt_number() RETURNS TEXT LANGUAGE sql AS $$ SELECT 'RCP-' || nextval('receipt_number_seq')::TEXT $$;

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_warehouses_updated BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_transfers_updated BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_workflows_updated BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_wf_templates_updated BEFORE UPDATE ON public.workflow_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_approvals_updated BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_messages_updated BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_channels_updated BEFORE UPDATE ON public.chat_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_reports_updated BEFORE UPDATE ON public.saved_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_receipts_updated BEFORE UPDATE ON public.receipt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- AUDIT TRIGGERS
CREATE OR REPLACE FUNCTION public.audit_store_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.log_audit('store.create', 'Organization', NEW.name, 'Store created: ' || NEW.name);
  ELSIF TG_OP = 'UPDATE' THEN PERFORM public.log_audit('store.update', 'Organization', NEW.name, 'Store updated: ' || NEW.name);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.log_audit('store.delete', 'Organization', OLD.name, 'Store deleted: ' || OLD.name, 'warning');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER tr_audit_stores AFTER INSERT OR UPDATE OR DELETE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.audit_store_changes();

CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_name TEXT; _role_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO _user_name FROM public.profiles WHERE id = NEW.user_id;
    SELECT name INTO _role_name FROM public.roles WHERE id = NEW.role_id;
    PERFORM public.log_audit('role.assign', 'Users', _user_name, 'Role ' || _role_name || ' assigned to ' || _user_name);
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO _user_name FROM public.profiles WHERE id = OLD.user_id;
    SELECT name INTO _role_name FROM public.roles WHERE id = OLD.role_id;
    PERFORM public.log_audit('role.revoke', 'Users', _user_name, 'Role ' || _role_name || ' revoked from ' || _user_name, 'warning');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER tr_audit_user_roles AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();

CREATE OR REPLACE FUNCTION public.audit_sale_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_audit('sale.create', 'Sales', NEW.transaction_number,
    'Sale ' || NEW.transaction_number || ' for ' || NEW.total || ' by ' || COALESCE(
      (SELECT name FROM public.profiles WHERE id = NEW.cashier_id), 'Unknown'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER tr_audit_sales AFTER INSERT ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_sale_created();

CREATE OR REPLACE FUNCTION public.audit_inventory_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit('inventory.create', 'Inventory', NEW.name, 'Item created: ' || NEW.name || ' (SKU: ' || NEW.sku || ')');
  ELSIF TG_OP = 'UPDATE' AND NEW.qty != OLD.qty THEN
    PERFORM public.log_audit('inventory.adjust', 'Inventory', NEW.name,
      'Stock changed from ' || OLD.qty || ' to ' || NEW.qty || ' for ' || NEW.name,
      CASE WHEN NEW.qty <= NEW.reorder_point THEN 'warning'::audit_severity ELSE 'info'::audit_severity END);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit('inventory.delete', 'Inventory', OLD.name, 'Item deleted: ' || OLD.name, 'warning');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER tr_audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.audit_inventory_changes();

CREATE OR REPLACE FUNCTION public.audit_category_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, user_name, user_role, action, module, target, detail, severity)
  VALUES (
    COALESCE(NEW.created_by, OLD.created_by),
    COALESCE((SELECT name FROM public.profiles WHERE id = COALESCE(NEW.created_by, OLD.created_by)), 'System'),
    COALESCE((SELECT r.name FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = COALESCE(NEW.created_by, OLD.created_by) LIMIT 1), 'System'),
    'category.' || LOWER(TG_OP), 'Categories', COALESCE(NEW.name, OLD.name),
    TG_OP || ': ' || COALESCE(NEW.name, OLD.name) || ' (' || COALESCE(NEW.type, OLD.type)::TEXT || ')',
    CASE WHEN TG_OP = 'DELETE' THEN 'warning'::audit_severity ELSE 'info'::audit_severity END);
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER tr_audit_category AFTER INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.audit_category_change();

CREATE OR REPLACE FUNCTION public.audit_expense_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, user_name, user_role, action, module, target, detail, severity)
  VALUES (
    COALESCE(NEW.created_by, OLD.created_by),
    COALESCE((SELECT name FROM public.profiles WHERE id = COALESCE(NEW.created_by, OLD.created_by)), 'System'),
    COALESCE((SELECT r.name FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = COALESCE(NEW.created_by, OLD.created_by) LIMIT 1), 'System'),
    'expense.' || LOWER(TG_OP), 'Expenses', COALESCE(NEW.category, OLD.category),
    TG_OP || ': ' || COALESCE(NEW.description, OLD.description) || ' — ' || COALESCE(NEW.amount, OLD.amount)::TEXT,
    'info'::audit_severity);
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER tr_audit_expense AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.audit_expense_change();

-- CHAT ATTACHMENT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_chat_attachment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _doc_id UUID; _attachments JSONB;
BEGIN
  _attachments := COALESCE(NEW.attachments, '[]'::JSONB);
  IF jsonb_array_length(_attachments) > 0 THEN
    FOR i IN 0..jsonb_array_length(_attachments) - 1 LOOP
      INSERT INTO public.documents (name, type, size_display, folder_path, author, source)
      VALUES (_attachments->i->>'name', COALESCE((_attachments->i->>'type')::document_type, 'txt'),
        _attachments->i->>'size', '/Chat Attachments', NEW.sender_id,
        'Chat: ' || (SELECT name FROM public.chat_channels WHERE id = NEW.channel_id))
      RETURNING id INTO _doc_id;
      INSERT INTO public.chat_document_links (message_id, document_id) VALUES (NEW.id, _doc_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tr_chat_attachment_to_doc AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.handle_chat_attachment();

-- USER STORE FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_stores(_user_id UUID)
RETURNS SETOF public.stores LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.* FROM public.stores s WHERE public.has_any_role(_user_id, ARRAY['super_admin', 'admin']::app_role[])
  UNION
  SELECT s.* FROM public.stores s JOIN public.user_store_assignments usa ON usa.store_id = s.id
  WHERE usa.user_id = _user_id AND NOT public.has_any_role(_user_id, ARRAY['super_admin', 'admin']::app_role[])
$$;

CREATE OR REPLACE FUNCTION public.get_user_warehouses(_user_id UUID)
RETURNS SETOF public.warehouses LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.* FROM public.warehouses w WHERE public.has_any_role(_user_id, ARRAY['super_admin', 'admin']::app_role[])
  UNION
  SELECT w.* FROM public.warehouses w JOIN public.user_warehouse_assignments uwa ON uwa.warehouse_id = w.id
  WHERE uwa.user_id = _user_id AND NOT public.has_any_role(_user_id, ARRAY['super_admin', 'admin']::app_role[])
$$;
