-- =====================================================
-- Enterprise Hub — Complete Database Schema
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'sales_rep', 'warehouse_staff', 'viewer');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.inventory_status AS ENUM ('critical', 'low', 'ok');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.transfer_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE public.po_status AS ENUM ('draft', 'submitted', 'approved', 'shipped', 'received', 'cancelled');
CREATE TYPE public.transaction_status AS ENUM ('completed', 'refunded', 'pending');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.workflow_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
CREATE TYPE public.notification_type AS ENUM ('approval', 'inventory', 'workflow', 'chat', 'system', 'sales', 'supply', 'document', 'security');
CREATE TYPE public.document_type AS ENUM ('pdf', 'xlsx', 'docx', 'png', 'jpg', 'folder', 'txt', 'csv', 'zip');
CREATE TYPE public.store_status AS ENUM ('active', 'maintenance', 'closed');
CREATE TYPE public.warehouse_status AS ENUM ('operational', 'maintenance');
CREATE TYPE public.chat_channel_type AS ENUM ('channel', 'dm', 'group');
CREATE TYPE public.supplier_status AS ENUM ('active', 'inactive', 'blacklisted');
CREATE TYPE public.approval_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.audit_severity AS ENUM ('info', 'warning', 'critical');

-- =====================================================
-- 2. ORGANIZATION TABLES
-- =====================================================

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Retail',
  address TEXT,
  phone TEXT,
  email TEXT,
  status store_status NOT NULL DEFAULT 'active',
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER DEFAULT 0,
  sqft TEXT,
  manager_id UUID,
  zones INTEGER DEFAULT 1,
  status warehouse_status NOT NULL DEFAULT 'operational',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  head_id UUID,
  budget NUMERIC(14,2) DEFAULT 0,
  teams TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2b. COMPANY PROFILES TABLE
-- =====================================================

CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  industry TEXT DEFAULT 'Retail',
  currency TEXT DEFAULT 'NGN',
  tax_rate NUMERIC(5,2) DEFAULT 7.5,
  business_type TEXT DEFAULT 'Limited Company',
  logo_url TEXT,
  rc_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company profile"
  ON public.company_profiles FOR ALL TO authenticated
  USING (owner_id = auth.uid());

-- =====================================================
-- 3. USER & ROLES TABLES
-- =====================================================

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  color TEXT DEFAULT 'bg-muted text-muted-foreground',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar TEXT,
  status user_status NOT NULL DEFAULT 'active',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, role_id)
);

-- Add FK now that profiles exists
ALTER TABLE public.stores ADD CONSTRAINT fk_store_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.warehouses ADD CONSTRAINT fk_warehouse_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.departments ADD CONSTRAINT fk_department_head FOREIGN KEY (head_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- =====================================================
-- 4. INVENTORY TABLES
-- =====================================================

CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'Uncategorized',
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 50,
  cost_price NUMERIC(12,2) DEFAULT 0,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  barcode TEXT,
  image_url TEXT,
  status inventory_status NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  adjustment_type TEXT NOT NULL, -- 'manual', 'po_received', 'sale', 'transfer_in', 'transfer_out', 'return', 'damage'
  qty_before INTEGER NOT NULL,
  qty_change INTEGER NOT NULL,
  qty_after INTEGER NOT NULL,
  reason TEXT,
  reference_id TEXT, -- PO ID, Sale ID, Transfer ID
  reference_type TEXT, -- 'purchase_order', 'sale', 'stock_transfer', 'manual'
  adjusted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number TEXT NOT NULL UNIQUE,
  from_warehouse_id UUID REFERENCES public.warehouses(id),
  to_warehouse_id UUID REFERENCES public.warehouses(id),
  status transfer_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  requester UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  eta DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID REFERENCES public.stock_transfers(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  qty INTEGER NOT NULL DEFAULT 1
);

-- =====================================================
-- 5. SUPPLY CHAIN TABLES
-- =====================================================

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  categories TEXT[] DEFAULT '{}',
  status supplier_status NOT NULL DEFAULT 'active',
  rating NUMERIC(2,1) DEFAULT 0,
  on_time_rate INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status po_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  shipping NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  expected_date DATE,
  received_date DATE,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  received_qty INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- =====================================================
-- 6. SALES & POS TABLES
-- =====================================================

CREATE TABLE public.sales_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number TEXT NOT NULL UNIQUE,
  customer_name TEXT DEFAULT 'Walk-in',
  customer_email TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  amount_tendered NUMERIC(12,2) DEFAULT 0,
  change_given NUMERIC(12,2) DEFAULT 0,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES auth.users(id),
  status transaction_status NOT NULL DEFAULT 'completed',
  notes TEXT,
  receipt_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sales_transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.sales_transactions(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.sales_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.sales_transactions(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_method TEXT DEFAULT 'original',
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  restock BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 7. WORKFLOWS & APPROVALS
-- =====================================================

CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'purchase_order', 'stock_transfer', 'expense', 'discount', 'general'
  steps JSONB NOT NULL DEFAULT '[]', -- [{ "name": "...", "role": "...", "action": "approve|review" }]
  auto_trigger BOOLEAN DEFAULT FALSE,
  trigger_conditions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.workflow_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'general',
  trigger_type TEXT DEFAULT 'manual',
  status workflow_status NOT NULL DEFAULT 'active',
  steps JSONB DEFAULT '[]',
  current_step INTEGER DEFAULT 0,
  source_id TEXT, -- reference to PO, transfer, etc.
  source_type TEXT, -- 'purchase_order', 'stock_transfer', 'expense', etc.
  created_by UUID REFERENCES auth.users(id),
  assigned_role UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.workflow_step_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'reviewed'
  acted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'purchase_order', 'stock_transfer', 'expense', 'discount', 'workflow', 'document'
  source_id TEXT,
  source_type TEXT,
  requester UUID REFERENCES auth.users(id),
  department TEXT,
  amount NUMERIC(12,2),
  description TEXT,
  priority approval_priority NOT NULL DEFAULT 'medium',
  status approval_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 8. DOCUMENTS & FILE STORAGE
-- =====================================================

CREATE TABLE public.document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL DEFAULT '/',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type document_type NOT NULL DEFAULT 'txt',
  size_bytes BIGINT DEFAULT 0,
  size_display TEXT,
  folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
  folder_path TEXT DEFAULT '/',
  mime_type TEXT,
  author UUID REFERENCES auth.users(id),
  source TEXT, -- 'upload', 'chat', 'report', 'system'
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'documents',
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view', -- 'view', 'edit', 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 9. CHAT & MESSAGING
-- =====================================================

CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type chat_channel_type NOT NULL DEFAULT 'channel',
  description TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.chat_channel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  muted BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reactions JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT FALSE,
  edited BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 10. NOTIFICATIONS
-- =====================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 11. AUDIT LOG
-- =====================================================

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  severity audit_severity NOT NULL DEFAULT 'info',
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 12. APP SETTINGS
-- =====================================================

CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 13. REPORTS
-- =====================================================

CREATE TABLE public.saved_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'sales', 'inventory', 'operations', 'financial', 'custom'
  filters JSONB DEFAULT '{}',
  columns TEXT[] DEFAULT '{}',
  schedule TEXT, -- 'daily', 'weekly', 'monthly', null for manual
  last_generated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 14. RECEIPT & INVOICE TEMPLATES
-- =====================================================

CREATE TABLE public.receipt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'receipt', -- 'receipt', 'invoice', 'quote'
  layout JSONB NOT NULL DEFAULT '{}',
  header_text TEXT,
  footer_text TEXT,
  show_logo BOOLEAN DEFAULT TRUE,
  show_tax BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 15. USER SESSIONS & ACTIVITY
-- =====================================================

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 16. SECURITY DEFINER FUNCTIONS (RBAC)
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name = _role::TEXT
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name = ANY(ARRAY(SELECT unnest(_roles)::TEXT))
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND _permission = ANY(r.permissions)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT perm), '{}')
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id,
  LATERAL unnest(r.permissions) AS perm
  WHERE ur.user_id = _user_id
$$;

-- =====================================================
-- 17. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- Assign default 'Viewer' role
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id FROM public.roles r WHERE r.name = 'Viewer' LIMIT 1;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 18. AUTO-UPDATE inventory_status TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_inventory_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qty <= 0 THEN
    NEW.status = 'critical';
  ELSIF NEW.qty <= NEW.reorder_point THEN
    NEW.status = 'low';
  ELSE
    NEW.status = 'ok';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_inventory_status
  BEFORE INSERT OR UPDATE OF qty ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_status();

-- =====================================================
-- 19. AUTO-UPDATE PO total TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_po_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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

CREATE TRIGGER tr_po_item_total
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_po_total();

-- =====================================================
-- 20. PO RECEIVED → ADD STOCK TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_po_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    NEW.received_date = NOW();

    -- Add stock for each PO item
    UPDATE public.inventory_items inv
    SET qty = inv.qty + poi.qty
    FROM public.purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id
      AND poi.inventory_item_id = inv.id;

    -- Log stock adjustments
    INSERT INTO public.stock_adjustments (inventory_item_id, adjustment_type, qty_before, qty_change, qty_after, reason, reference_id, reference_type, adjusted_by)
    SELECT
      poi.inventory_item_id,
      'po_received',
      inv.qty - poi.qty,
      poi.qty,
      inv.qty,
      'PO ' || NEW.po_number || ' received',
      NEW.id::TEXT,
      'purchase_order',
      NEW.approved_by
    FROM public.purchase_order_items poi
    JOIN public.inventory_items inv ON inv.id = poi.inventory_item_id
    WHERE poi.purchase_order_id = NEW.id
      AND poi.inventory_item_id IS NOT NULL;

    -- Update supplier stats
    UPDATE public.suppliers
    SET total_orders = total_orders + 1
    WHERE id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_po_received
  BEFORE UPDATE OF status ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_po_received();

-- =====================================================
-- 21. SALE → DEDUCT STOCK TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_sale_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Deduct stock for each sale item
    UPDATE public.inventory_items inv
    SET qty = GREATEST(inv.qty - sti.qty, 0)
    FROM public.sales_transaction_items sti
    WHERE sti.transaction_id = NEW.id
      AND sti.inventory_item_id = inv.id;

    -- Log stock adjustments
    INSERT INTO public.stock_adjustments (inventory_item_id, adjustment_type, qty_before, qty_change, qty_after, reason, reference_id, reference_type, adjusted_by)
    SELECT
      sti.inventory_item_id,
      'sale',
      inv.qty + sti.qty,
      -sti.qty,
      inv.qty,
      'Sale ' || NEW.transaction_number,
      NEW.id::TEXT,
      'sale',
      NEW.cashier_id
    FROM public.sales_transaction_items sti
    JOIN public.inventory_items inv ON inv.id = sti.inventory_item_id
    WHERE sti.transaction_id = NEW.id
      AND sti.inventory_item_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_sale_completed
  AFTER INSERT ON public.sales_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_completed();

-- =====================================================
-- 22. STOCK TRANSFER DELIVERED → MOVE STOCK
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_transfer_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- For each transfer item, deduct from source and add to destination
    -- This assumes items get a new row per warehouse or qty is adjusted
    -- Simplified: just log the adjustment
    INSERT INTO public.stock_adjustments (inventory_item_id, adjustment_type, qty_before, qty_change, qty_after, reason, reference_id, reference_type, adjusted_by)
    SELECT
      sti.inventory_item_id,
      'transfer_in',
      0, sti.qty, sti.qty,
      'Transfer ' || NEW.transfer_number || ' delivered',
      NEW.id::TEXT,
      'stock_transfer',
      NEW.approved_by
    FROM public.stock_transfer_items sti
    WHERE sti.transfer_id = NEW.id
      AND sti.inventory_item_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_transfer_delivered
  BEFORE UPDATE OF status ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_transfer_delivered();

-- =====================================================
-- 23. AUDIT LOG HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT,
  _module TEXT,
  _target TEXT DEFAULT NULL,
  _detail TEXT DEFAULT NULL,
  _severity audit_severity DEFAULT 'info',
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
  _user_name TEXT;
  _user_role TEXT;
BEGIN
  SELECT p.name INTO _user_name FROM public.profiles p WHERE p.id = auth.uid();
  SELECT r.name INTO _user_role FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() LIMIT 1;

  INSERT INTO public.audit_log (user_id, user_name, user_role, action, module, target, detail, severity, metadata)
  VALUES (auth.uid(), _user_name, _user_role, _action, _module, _target, _detail, _severity, _metadata)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- =====================================================
-- 24. NOTIFICATION HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id UUID,
  _type notification_type,
  _title TEXT,
  _message TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (_user_id, _type, _title, _message, _link, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- =====================================================
-- 25. GENERATE SEQUENTIAL NUMBERS
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS txn_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT LANGUAGE sql AS $$ SELECT 'PO-' || nextval('po_number_seq')::TEXT $$;

CREATE OR REPLACE FUNCTION public.generate_txn_number()
RETURNS TEXT LANGUAGE sql AS $$ SELECT 'TXN-' || nextval('txn_number_seq')::TEXT $$;

CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS TEXT LANGUAGE sql AS $$ SELECT 'TRF-' || nextval('transfer_number_seq')::TEXT $$;

CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT LANGUAGE sql AS $$ SELECT 'RCP-' || nextval('receipt_number_seq')::TEXT $$;

-- =====================================================
-- 26. ROW LEVEL SECURITY
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

-- =====================================================
-- 27. RLS POLICIES — READ ACCESS
-- =====================================================

-- Authenticated users can read organizational & operational data
CREATE POLICY "auth_read" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.stores FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.warehouses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.inventory_categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.inventory_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.stock_adjustments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.stock_transfers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.stock_transfer_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.suppliers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.purchase_orders FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.purchase_order_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read" ON public.sales_transactions FOR SELECT TO authenticated USING (TRUE);
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

-- Users see only their own
CREATE POLICY "own_read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_read" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_read" ON public.chat_channel_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_read" ON public.document_shares FOR SELECT TO authenticated USING (shared_with = auth.uid());

-- Audit log: admin only
CREATE POLICY "admin_read" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 28. RLS POLICIES — WRITE ACCESS (SELF)
-- =====================================================

CREATE POLICY "own_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 29. RLS POLICIES — ADMIN MANAGEMENT
-- =====================================================

CREATE POLICY "admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_all" ON public.roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_all" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_all" ON public.warehouses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_all" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_all" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_all" ON public.receipt_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 30. RLS POLICIES — OPERATIONAL WRITE ACCESS
-- =====================================================

-- Inventory
CREATE POLICY "auth_insert" ON public.inventory_categories FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.inventory_categories FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.inventory_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON public.inventory_items FOR DELETE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Transfers
CREATE POLICY "auth_insert" ON public.stock_transfers FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.stock_transfers FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.stock_transfer_items FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Supply chain
CREATE POLICY "auth_all" ON public.suppliers FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.purchase_orders FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.purchase_order_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON public.purchase_order_items FOR DELETE TO authenticated USING (TRUE);

-- Sales
CREATE POLICY "auth_insert" ON public.sales_transactions FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON public.sales_transactions FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.sales_transaction_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_insert" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_insert" ON public.sales_return_items FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Workflows & approvals
CREATE POLICY "auth_all" ON public.workflow_templates FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.workflows FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.workflow_step_history FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_all" ON public.approvals FOR ALL TO authenticated USING (TRUE);

-- Documents
CREATE POLICY "auth_all" ON public.document_folders FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.documents FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON public.document_shares FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_delete" ON public.document_shares FOR DELETE TO authenticated USING (shared_with = auth.uid());

-- Chat
CREATE POLICY "auth_all" ON public.chat_channels FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.chat_channel_members FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "auth_all" ON public.chat_messages FOR ALL TO authenticated USING (TRUE);

-- Reports
CREATE POLICY "auth_all" ON public.saved_reports FOR ALL TO authenticated USING (TRUE);

-- Audit (insert only for non-admins)
CREATE POLICY "auth_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Sessions
CREATE POLICY "auth_insert" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "auth_update" ON public.user_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 31. INDEXES
-- =====================================================

CREATE INDEX idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX idx_inventory_warehouse ON public.inventory_items(warehouse_id);
CREATE INDEX idx_inventory_status ON public.inventory_items(status);
CREATE INDEX idx_inventory_category ON public.inventory_items(category_id);
CREATE INDEX idx_inventory_barcode ON public.inventory_items(barcode);
CREATE INDEX idx_stock_adj_item ON public.stock_adjustments(inventory_item_id);
CREATE INDEX idx_stock_adj_type ON public.stock_adjustments(adjustment_type);
CREATE INDEX idx_stock_adj_ref ON public.stock_adjustments(reference_id, reference_type);
CREATE INDEX idx_transfers_status ON public.stock_transfers(status);
CREATE INDEX idx_transfer_items_transfer ON public.stock_transfer_items(transfer_id);
CREATE INDEX idx_suppliers_status ON public.suppliers(status);
CREATE INDEX idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE INDEX idx_po_warehouse ON public.purchase_orders(warehouse_id);
CREATE INDEX idx_po_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_sales_store ON public.sales_transactions(store_id);
CREATE INDEX idx_sales_created ON public.sales_transactions(created_at);
CREATE INDEX idx_sales_status ON public.sales_transactions(status);
CREATE INDEX idx_sale_items_txn ON public.sales_transaction_items(transaction_id);
CREATE INDEX idx_returns_txn ON public.sales_returns(transaction_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_source ON public.workflows(source_id, source_type);
CREATE INDEX idx_wf_history_wf ON public.workflow_step_history(workflow_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_approvals_type ON public.approvals(type);
CREATE INDEX idx_approvals_source ON public.approvals(source_id, source_type);
CREATE INDEX idx_documents_folder ON public.documents(folder_id);
CREATE INDEX idx_documents_author ON public.documents(author);
CREATE INDEX idx_doc_shares ON public.document_shares(document_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);
CREATE INDEX idx_chat_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at);
CREATE INDEX idx_audit_module ON public.audit_log(module);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role_id);
CREATE INDEX idx_sessions_user ON public.user_sessions(user_id, is_active);
CREATE INDEX idx_saved_reports_user ON public.saved_reports(created_by);
CREATE INDEX idx_integrations_category ON public.integration_configs(category);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- =====================================================
-- 32. INTEGRATION CONFIGS TABLE
-- =====================================================

CREATE TYPE public.integration_category AS ENUM ('payment', 'communication', 'accounting', 'other');

CREATE TABLE public.integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category integration_category NOT NULL DEFAULT 'other',
  icon TEXT,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  config_fields TEXT[] DEFAULT '{}',
  config_values JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company integrations"
  ON public.integration_configs FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()));

-- =====================================================
-- 33. TRIGGERS FOR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- =====================================================
-- 33. SEED DEFAULT ROLES
-- =====================================================

INSERT INTO public.roles (name, description, permissions, is_system, color) VALUES
  ('Super Admin', 'Full system access with all permissions', ARRAY[
    'users.view','users.create','users.edit','users.delete',
    'roles.view','roles.create','roles.edit','roles.delete',
    'inventory.view','inventory.create','inventory.edit','inventory.delete',
    'sales.view','sales.create','sales.edit','sales.delete',
    'pos.view','pos.create',
    'supply.view','supply.create','supply.edit','supply.approve',
    'workflows.view','workflows.create','workflows.approve','workflows.delete',
    'approvals.view','approvals.approve','approvals.reject',
    'reports.view','reports.export',
    'organization.view','organization.create','organization.edit','organization.delete',
    'documents.view','documents.create','documents.edit','documents.delete',
    'settings.view','settings.edit',
    'audit.view','chat.view','chat.create','notifications.view','dashboard.view',
    'pages.dashboard','pages.inventory','pages.sales','pages.pos','pages.supply',
    'pages.workflows','pages.approvals','pages.reports','pages.organization',
    'pages.documents','pages.chat','pages.users','pages.settings','pages.audit','pages.notifications'
  ], TRUE, 'bg-destructive/10 text-destructive'),
  ('Admin', 'Administrative access', ARRAY[
    'users.view','users.create','users.edit','users.delete',
    'inventory.view','inventory.create','inventory.edit','inventory.delete',
    'sales.view','sales.create','sales.edit','sales.delete',
    'pos.view','pos.create',
    'supply.view','supply.create','supply.edit','supply.approve',
    'workflows.view','workflows.create','workflows.approve','workflows.delete',
    'approvals.view','approvals.approve','approvals.reject',
    'reports.view','reports.export',
    'organization.view','organization.create','organization.edit','organization.delete',
    'documents.view','documents.create','documents.edit','documents.delete',
    'settings.view','settings.edit',
    'audit.view','chat.view','chat.create','notifications.view','dashboard.view',
    'pages.dashboard','pages.inventory','pages.sales','pages.pos','pages.supply',
    'pages.workflows','pages.approvals','pages.reports','pages.organization',
    'pages.documents','pages.chat','pages.users','pages.settings','pages.audit','pages.notifications'
  ], TRUE, 'bg-primary/10 text-primary'),
  ('Manager', 'Manage operations and sales', ARRAY[
    'users.view','inventory.view','inventory.create','inventory.edit',
    'sales.view','sales.create','sales.edit','pos.view','pos.create',
    'supply.view','supply.create','supply.edit','supply.approve',
    'workflows.view','workflows.create','workflows.approve',
    'approvals.view','approvals.approve','approvals.reject',
    'reports.view','reports.export','organization.view',
    'documents.view','documents.create','documents.edit',
    'chat.view','chat.create','audit.view','notifications.view','dashboard.view',
    'pages.dashboard','pages.inventory','pages.sales','pages.pos','pages.supply',
    'pages.workflows','pages.approvals','pages.reports','pages.organization',
    'pages.documents','pages.chat','pages.audit','pages.notifications'
  ], FALSE, 'bg-info/10 text-info'),
  ('Sales Rep', 'Point of sale and sales', ARRAY[
    'sales.view','sales.create','pos.view','pos.create',
    'inventory.view','reports.view','chat.view','chat.create','documents.view',
    'notifications.view','dashboard.view',
    'pages.dashboard','pages.sales','pages.pos','pages.chat','pages.notifications'
  ], FALSE, 'bg-success/10 text-success'),
  ('Warehouse Staff', 'Inventory and supply chain', ARRAY[
    'inventory.view','inventory.create','inventory.edit',
    'supply.view','supply.create','workflows.view',
    'documents.view','chat.view','chat.create','notifications.view','dashboard.view',
    'pages.dashboard','pages.inventory','pages.supply','pages.workflows','pages.documents','pages.chat','pages.notifications'
  ], FALSE, 'bg-warning/10 text-warning'),
  ('Viewer', 'Read-only access', ARRAY[
    'users.view','inventory.view','sales.view','pos.view','supply.view',
    'workflows.view','approvals.view','reports.view','organization.view',
    'documents.view','settings.view','audit.view','chat.view',
    'notifications.view','dashboard.view',
    'pages.dashboard','pages.inventory','pages.sales','pages.pos','pages.supply',
    'pages.workflows','pages.approvals','pages.reports','pages.organization',
    'pages.documents','pages.chat','pages.settings','pages.audit','pages.notifications'
  ], FALSE, 'bg-muted text-muted-foreground');

-- =====================================================
-- 34. SEED DEFAULT APP SETTINGS
-- =====================================================

INSERT INTO public.app_settings (key, value) VALUES
  ('general', '{"appName": "Enterprise Hub", "currency": "USD", "timezone": "America/New_York", "dateFormat": "MM/DD/YYYY", "language": "en"}'),
  ('receipt', '{"defaultTemplate": "standard", "showLogo": true, "showTax": true, "footerText": "Thank you for your business!"}'),
  ('notifications', '{"emailEnabled": false, "lowStockAlerts": true, "approvalAlerts": true, "chatAlerts": true}'),
  ('security', '{"sessionTimeout": 30, "maxLoginAttempts": 5, "requirePasswordChange": 90, "minPasswordLength": 8}');

-- =====================================================
-- 35. SEED DEFAULT CHAT CHANNEL
-- =====================================================

INSERT INTO public.chat_channels (name, type, description)
VALUES ('general', 'channel', 'Company-wide announcements and discussions');

-- =====================================================
-- 36. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents', 'documents', FALSE),
  ('avatars', 'avatars', TRUE),
  ('logos', 'logos', TRUE),
  ('chat-attachments', 'chat-attachments', FALSE);

-- Storage policies
CREATE POLICY "auth_read" ON storage.objects FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON storage.objects FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON storage.objects FOR DELETE TO authenticated USING (TRUE);
