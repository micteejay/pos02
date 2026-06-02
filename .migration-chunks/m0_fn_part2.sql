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
