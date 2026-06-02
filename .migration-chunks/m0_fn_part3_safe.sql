DROP TRIGGER IF EXISTS tr_profiles_updated ON public.profiles;
DROP TRIGGER IF EXISTS tr_roles_updated ON public.roles;
DROP TRIGGER IF EXISTS tr_stores_updated ON public.stores;
DROP TRIGGER IF EXISTS tr_warehouses_updated ON public.warehouses;
DROP TRIGGER IF EXISTS tr_departments_updated ON public.departments;
DROP TRIGGER IF EXISTS tr_inventory_updated ON public.inventory_items;
DROP TRIGGER IF EXISTS tr_transfers_updated ON public.stock_transfers;
DROP TRIGGER IF EXISTS tr_suppliers_updated ON public.suppliers;
DROP TRIGGER IF EXISTS tr_po_updated ON public.purchase_orders;
DROP TRIGGER IF EXISTS tr_workflows_updated ON public.workflows;
DROP TRIGGER IF EXISTS tr_wf_templates_updated ON public.workflow_templates;
DROP TRIGGER IF EXISTS tr_approvals_updated ON public.approvals;
DROP TRIGGER IF EXISTS tr_documents_updated ON public.documents;
DROP TRIGGER IF EXISTS tr_messages_updated ON public.chat_messages;
DROP TRIGGER IF EXISTS tr_channels_updated ON public.chat_channels;
DROP TRIGGER IF EXISTS tr_reports_updated ON public.saved_reports;
DROP TRIGGER IF EXISTS tr_receipts_updated ON public.receipt_templates;
DROP TRIGGER IF EXISTS tr_invoices_updated ON public.invoices;
DROP TRIGGER IF EXISTS tr_audit_stores ON public.stores;
DROP TRIGGER IF EXISTS tr_audit_user_roles ON public.user_roles;
DROP TRIGGER IF EXISTS tr_audit_sales ON public.sales_transactions;
DROP TRIGGER IF EXISTS tr_audit_inventory ON public.inventory_items;
DROP TRIGGER IF EXISTS tr_audit_category ON public.categories;
DROP TRIGGER IF EXISTS tr_audit_expense ON public.expenses;
DROP TRIGGER IF EXISTS tr_chat_attachment_to_doc ON public.chat_messages;

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
