-- =====================================================================
-- VITE POS — FULL SUPABASE SCHEMA (CONSOLIDATED)
-- Generated: $(date -u +"%Y-%m-%d %H:%M UTC")
-- 
-- Contents:
--   • 16 migrations (chronological order)
--   • All tables, enums, functions, triggers, RLS policies, indexes
--   • Edge Function source code (as SQL comments)
--
-- Usage: Run in Supabase SQL Editor on a fresh project, or use as
--        reference. Do NOT run on an existing project with live data.
-- =====================================================================


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260308182854_10c45cb6-098c-4b42-92c5-80b16b629806.sql
-- ╚══════════════════════════════════════════════════════════════════╝


-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
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
CREATE TYPE public.integration_category AS ENUM ('payment', 'communication', 'accounting', 'other');
CREATE TYPE public.invoice_type AS ENUM ('quote', 'invoice');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');
CREATE TYPE public.report_type AS ENUM ('overview', 'sales', 'inventory', 'gainloss', 'eod', 'operations');
CREATE TYPE public.category_type AS ENUM ('inventory', 'expense', 'general');
CREATE TYPE public.category_status AS ENUM ('approved', 'pending', 'rejected');

-- ORGANIZATION TABLES
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Retail',
  address TEXT, phone TEXT, email TEXT,
  status store_status NOT NULL DEFAULT 'active',
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, location TEXT,
  capacity INTEGER DEFAULT 0, sqft TEXT, manager_id UUID,
  zones INTEGER DEFAULT 1,
  status warehouse_status NOT NULL DEFAULT 'operational',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, head_id UUID,
  budget NUMERIC(14,2) DEFAULT 0,
  teams TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, address TEXT, city TEXT, state TEXT,
  country TEXT DEFAULT 'Nigeria', phone TEXT, email TEXT, website TEXT,
  tax_id TEXT, industry TEXT DEFAULT 'Retail',
  currency TEXT DEFAULT 'NGN', tax_rate NUMERIC(5,2) DEFAULT 7.5,
  business_type TEXT DEFAULT 'Limited Company',
  logo_url TEXT, rc_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROLES & PROFILES
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  color TEXT DEFAULT 'bg-muted text-muted-foreground',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, email TEXT, avatar TEXT,
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

ALTER TABLE public.stores ADD CONSTRAINT fk_store_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.warehouses ADD CONSTRAINT fk_warehouse_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.departments ADD CONSTRAINT fk_department_head FOREIGN KEY (head_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- INVENTORY
CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, description TEXT,
  parent_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'Uncategorized',
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 0, reorder_point INTEGER NOT NULL DEFAULT 50,
  cost_price NUMERIC(12,2) DEFAULT 0, price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs', barcode TEXT, image_url TEXT,
  status inventory_status NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  adjustment_type TEXT NOT NULL,
  qty_before INTEGER NOT NULL, qty_change INTEGER NOT NULL, qty_after INTEGER NOT NULL,
  reason TEXT, reference_id TEXT, reference_type TEXT,
  adjusted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number TEXT NOT NULL UNIQUE,
  from_warehouse_id UUID REFERENCES public.warehouses(id),
  to_warehouse_id UUID REFERENCES public.warehouses(id),
  status transfer_status NOT NULL DEFAULT 'pending',
  notes TEXT, requester UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id), eta DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID REFERENCES public.stock_transfers(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL, sku TEXT, qty INTEGER NOT NULL DEFAULT 1
);

-- SUPPLY CHAIN
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, contact_name TEXT, email TEXT, phone TEXT, address TEXT,
  categories TEXT[] DEFAULT '{}',
  status supplier_status NOT NULL DEFAULT 'active',
  rating NUMERIC(2,1) DEFAULT 0, on_time_rate INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status po_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, tax NUMERIC(12,2) DEFAULT 0,
  shipping NUMERIC(12,2) DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT, expected_date DATE, received_date DATE,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL, sku TEXT, qty INTEGER NOT NULL DEFAULT 1,
  received_qty INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- SALES
CREATE TABLE public.sales_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number TEXT NOT NULL UNIQUE,
  customer_name TEXT DEFAULT 'Walk-in', customer_email TEXT, customer_phone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0, discount_percent NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  amount_tendered NUMERIC(12,2) DEFAULT 0, change_given NUMERIC(12,2) DEFAULT 0,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES auth.users(id),
  status transaction_status NOT NULL DEFAULT 'completed',
  notes TEXT, receipt_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sales_transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.sales_transactions(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL, sku TEXT, qty INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0, discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.sales_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.sales_transactions(id) ON DELETE CASCADE NOT NULL,
  reason TEXT, refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_method TEXT DEFAULT 'original',
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0, restock BOOLEAN DEFAULT TRUE
);

-- WORKFLOWS & APPROVALS
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, description TEXT, type TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]', auto_trigger BOOLEAN DEFAULT FALSE,
  trigger_conditions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.workflow_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT,
  type TEXT DEFAULT 'general', trigger_type TEXT DEFAULT 'manual',
  status workflow_status NOT NULL DEFAULT 'active',
  steps JSONB DEFAULT '[]', current_step INTEGER DEFAULT 0,
  source_id TEXT, source_type TEXT,
  created_by UUID REFERENCES auth.users(id),
  assigned_role UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.workflow_step_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  step_index INTEGER NOT NULL, step_name TEXT NOT NULL, action TEXT NOT NULL,
  acted_by UUID REFERENCES auth.users(id), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL, type TEXT NOT NULL,
  source_id TEXT, source_type TEXT,
  requester UUID REFERENCES auth.users(id), department TEXT,
  amount NUMERIC(12,2), description TEXT,
  priority approval_priority NOT NULL DEFAULT 'medium',
  status approval_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id), review_notes TEXT, due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DOCUMENTS
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
  name TEXT NOT NULL, type document_type NOT NULL DEFAULT 'txt',
  size_bytes BIGINT DEFAULT 0, size_display TEXT,
  folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
  folder_path TEXT DEFAULT '/', mime_type TEXT,
  author UUID REFERENCES auth.users(id), source TEXT,
  storage_path TEXT, storage_bucket TEXT DEFAULT 'documents',
  tags TEXT[] DEFAULT '{}', version INTEGER DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CHAT
CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, type chat_channel_type NOT NULL DEFAULT 'channel',
  description TEXT, is_private BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.chat_channel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', muted BOOLEAN DEFAULT FALSE,
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
  reactions JSONB DEFAULT '{}', attachments JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT FALSE, edited BOOLEAN DEFAULT FALSE, deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL, message TEXT, link TEXT,
  metadata JSONB DEFAULT '{}', read BOOLEAN DEFAULT FALSE,
  target_roles TEXT[] DEFAULT '{}', created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT, user_role TEXT, action TEXT NOT NULL, module TEXT NOT NULL,
  target TEXT, detail TEXT,
  severity audit_severity NOT NULL DEFAULT 'info',
  metadata JSONB DEFAULT '{}', ip_address TEXT, user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- APP SETTINGS
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE, value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SAVED REPORTS
CREATE TABLE public.saved_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, type TEXT NOT NULL,
  filters JSONB DEFAULT '{}', columns TEXT[] DEFAULT '{}',
  schedule TEXT, last_generated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RECEIPT TEMPLATES
CREATE TABLE public.receipt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'receipt',
  layout JSONB NOT NULL DEFAULT '{}',
  header_text TEXT, footer_text TEXT,
  show_logo BOOLEAN DEFAULT TRUE, show_tax BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USER SESSIONS
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT, user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE
);

-- INTEGRATION CONFIGS
CREATE TABLE public.integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  category integration_category NOT NULL DEFAULT 'other',
  icon TEXT, connected BOOLEAN NOT NULL DEFAULT FALSE,
  config_fields TEXT[] DEFAULT '{}', config_values JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- INVOICES
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  type invoice_type NOT NULL DEFAULT 'quote',
  number TEXT NOT NULL, date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL, customer_address TEXT,
  service_charge_percent NUMERIC(5,2) DEFAULT 0, notes TEXT,
  status invoice_status NOT NULL DEFAULT 'draft',
  sale_id UUID REFERENCES public.sales_transactions(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL, qty NUMERIC(10,2) NOT NULL DEFAULT 1,
  rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USER STORE/WAREHOUSE ASSIGNMENTS
CREATE TABLE public.user_store_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

CREATE TABLE public.user_warehouse_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, warehouse_id)
);

-- GENERATED REPORTS
CREATE TABLE public.generated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, type report_type NOT NULL,
  filters JSONB DEFAULT '{}', data_snapshot JSONB DEFAULT '{}',
  generated_by UUID REFERENCES auth.users(id), generated_by_name TEXT,
  approval_status approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CHAT-DOCUMENT LINKS
CREATE TABLE public.chat_document_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, document_id)
);

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, type category_type NOT NULL,
  description TEXT, status category_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, type)
);

-- EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_due_date TIMESTAMPTZ,
  parent_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- =====================================================
-- INDEXES
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
CREATE INDEX idx_user_store_assignments_user ON public.user_store_assignments(user_id);
CREATE INDEX idx_user_store_assignments_store ON public.user_store_assignments(store_id);
CREATE INDEX idx_user_warehouse_assignments_user ON public.user_warehouse_assignments(user_id);
CREATE INDEX idx_user_warehouse_assignments_warehouse ON public.user_warehouse_assignments(warehouse_id);
CREATE INDEX idx_reports_type ON public.generated_reports(type);
CREATE INDEX idx_reports_generated_by ON public.generated_reports(generated_by);
CREATE INDEX idx_chat_doc_links_msg ON public.chat_document_links(message_id);
CREATE INDEX idx_chat_doc_links_doc ON public.chat_document_links(document_id);

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', FALSE);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', FALSE);

CREATE POLICY "auth_read" ON storage.objects FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON storage.objects FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON storage.objects FOR DELETE TO authenticated USING (TRUE);


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260308192028_7f866b89-4743-4362-aa33-34e5516b6fbb.sql
-- ╚══════════════════════════════════════════════════════════════════╝


CREATE OR REPLACE FUNCTION public.promote_to_super_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _role_id UUID;
BEGIN
  -- Only allow if user is creating their first company profile (onboarding)
  IF (SELECT COUNT(*) FROM public.company_profiles WHERE owner_id = _user_id) != 1 THEN
    RETURN;
  END IF;

  SELECT id INTO _role_id FROM public.roles WHERE name = 'Super Admin' LIMIT 1;
  IF _role_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (_user_id, _role_id);
END;
$$;


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260308194123_a263eba8-3a8f-451b-b510-ecf55d0bfeae.sql
-- ╚══════════════════════════════════════════════════════════════════╝


-- Add RLS policies to company_profiles
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON public.company_profiles
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "auth_read" ON public.company_profiles
  FOR SELECT TO authenticated
  USING (true);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260308202258_e882b1d4-90ca-47ee-a130-32899d79de4f.sql
-- ╚══════════════════════════════════════════════════════════════════╝

-- Fix role checks to work with display role names like "Super Admin" and enum values like "super_admin"
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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
      AND lower(replace(r.name, ' ', '_')) = _role::text
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
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
      AND lower(replace(r.name, ' ', '_')) = ANY(ARRAY(SELECT unnest(_roles)::text))
  )
$$;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260308222136_101ea108-e6b4-4393-9d27-f41b5e6d3c1c.sql
-- ╚══════════════════════════════════════════════════════════════════╝


CREATE OR REPLACE FUNCTION public.handle_chat_attachment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _doc_id UUID; _attachments JSONB;
BEGIN
  _attachments := COALESCE(NEW.attachments, '[]'::JSONB);
  IF jsonb_array_length(_attachments) > 0 THEN
    FOR i IN 0..jsonb_array_length(_attachments) - 1 LOOP
      INSERT INTO public.documents (name, type, size_display, folder_path, author, source, storage_path, storage_bucket)
      VALUES (
        _attachments->i->>'name',
        COALESCE((_attachments->i->>'type')::document_type, 'txt'),
        _attachments->i->>'size',
        '/Chat Attachments',
        NEW.sender_id,
        'Chat: ' || (SELECT name FROM public.chat_channels WHERE id = NEW.channel_id),
        _attachments->i->>'storagePath',
        COALESCE(_attachments->i->>'storageBucket', 'chat-attachments')
      )
      RETURNING id INTO _doc_id;
      INSERT INTO public.chat_document_links (message_id, document_id) VALUES (NEW.id, _doc_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_chat_message_attachments ON public.chat_messages;
CREATE TRIGGER on_chat_message_attachments
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  WHEN (jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb)) > 0)
  EXECUTE FUNCTION public.handle_chat_attachment();


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260405091616_acdda2f5-915a-47a8-a1a2-ec1ba21fef34.sql
-- ╚══════════════════════════════════════════════════════════════════╝


-- 1. Add company_id to all tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.sales_transactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.document_folders ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.receipt_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.saved_reports ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.generated_reports ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_profiles(id);

-- 2. Migrate existing data to first company
UPDATE public.profiles SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.stores SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.warehouses SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.departments SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.inventory_items SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.inventory_categories SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.sales_transactions SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.invoices SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.purchase_orders SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.suppliers SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.expenses SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.categories SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.documents SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.document_folders SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.chat_channels SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.approvals SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.workflows SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.workflow_templates SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.receipt_templates SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.saved_reports SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.generated_reports SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.app_settings SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.notifications SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;
UPDATE public.audit_log SET company_id = '3684e57e-306b-4303-b3c0-0ad5f2725877' WHERE company_id IS NULL;

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

-- CATEGORIES
DROP POLICY IF EXISTS "category_delete" ON public.categories;
DROP POLICY IF EXISTS "category_insert" ON public.categories;
DROP POLICY IF EXISTS "category_read" ON public.categories;
DROP POLICY IF EXISTS "category_update" ON public.categories;
CREATE POLICY "company_all" ON public.categories FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- DOCUMENTS
DROP POLICY IF EXISTS "auth_all" ON public.documents;
DROP POLICY IF EXISTS "auth_read" ON public.documents;
CREATE POLICY "company_all" ON public.documents FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- DOCUMENT_FOLDERS
DROP POLICY IF EXISTS "auth_all" ON public.document_folders;
DROP POLICY IF EXISTS "auth_read" ON public.document_folders;
CREATE POLICY "company_all" ON public.document_folders FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- CHAT_CHANNELS
DROP POLICY IF EXISTS "auth_all" ON public.chat_channels;
DROP POLICY IF EXISTS "auth_read" ON public.chat_channels;
CREATE POLICY "company_all" ON public.chat_channels FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- APPROVALS
DROP POLICY IF EXISTS "auth_all" ON public.approvals;
DROP POLICY IF EXISTS "auth_read" ON public.approvals;
CREATE POLICY "company_all" ON public.approvals FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- WORKFLOWS
DROP POLICY IF EXISTS "auth_all" ON public.workflows;
CREATE POLICY "company_all" ON public.workflows FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- WORKFLOW_TEMPLATES
DROP POLICY IF EXISTS "auth_all" ON public.workflow_templates;
CREATE POLICY "company_all" ON public.workflow_templates FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- RECEIPT_TEMPLATES
DROP POLICY IF EXISTS "admin_all" ON public.receipt_templates;
DROP POLICY IF EXISTS "auth_read" ON public.receipt_templates;
CREATE POLICY "company_admin_all" ON public.receipt_templates FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])));
CREATE POLICY "company_read" ON public.receipt_templates FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- SAVED_REPORTS
DROP POLICY IF EXISTS "auth_all" ON public.saved_reports;
DROP POLICY IF EXISTS "auth_read" ON public.saved_reports;
CREATE POLICY "company_all" ON public.saved_reports FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- GENERATED_REPORTS
DROP POLICY IF EXISTS "auth_all" ON public.generated_reports;
CREATE POLICY "company_all" ON public.generated_reports FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- APP_SETTINGS
DROP POLICY IF EXISTS "admin_all" ON public.app_settings;
DROP POLICY IF EXISTS "auth_read" ON public.app_settings;
CREATE POLICY "company_admin_all" ON public.app_settings FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])));
CREATE POLICY "company_read" ON public.app_settings FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "own_delete" ON public.notifications;
DROP POLICY IF EXISTS "own_insert" ON public.notifications;
DROP POLICY IF EXISTS "own_update" ON public.notifications;
DROP POLICY IF EXISTS "role_based_read" ON public.notifications;
CREATE POLICY "company_own_read" ON public.notifications FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "company_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "company_own_update" ON public.notifications FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "company_own_delete" ON public.notifications FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND user_id = auth.uid());

-- AUDIT_LOG
DROP POLICY IF EXISTS "admin_read" ON public.audit_log;
DROP POLICY IF EXISTS "auth_insert" ON public.audit_log;
CREATE POLICY "company_admin_read" ON public.audit_log FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])));
CREATE POLICY "company_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- PROFILES
DROP POLICY IF EXISTS "auth_read" ON public.profiles;
CREATE POLICY "company_read" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR id = auth.uid());

-- 6. Update promote_to_super_admin to set company_id on profile
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _role_id UUID; _company_id UUID;
BEGIN
  IF (SELECT COUNT(*) FROM public.company_profiles WHERE owner_id = _user_id) != 1 THEN
    RETURN;
  END IF;
  SELECT id INTO _company_id FROM public.company_profiles WHERE owner_id = _user_id LIMIT 1;
  SELECT id INTO _role_id FROM public.roles WHERE name = 'Super Admin' LIMIT 1;
  IF _role_id IS NULL THEN RETURN; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (_user_id, _role_id);
  UPDATE public.profiles SET company_id = _company_id WHERE id = _user_id;
END;
$$;

-- 7. Update log_audit to include company_id
CREATE OR REPLACE FUNCTION public.log_audit(_action text, _module text, _target text DEFAULT NULL, _detail text DEFAULT NULL, _severity audit_severity DEFAULT 'info', _metadata jsonb DEFAULT '{}')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id UUID; _user_name TEXT; _user_role TEXT; _company_id UUID;
BEGIN
  SELECT p.name, p.company_id INTO _user_name, _company_id FROM public.profiles p WHERE p.id = auth.uid();
  SELECT r.name INTO _user_role FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_log (user_id, user_name, user_role, action, module, target, detail, severity, metadata, company_id)
  VALUES (auth.uid(), _user_name, _user_role, _action, _module, _target, _detail, _severity, _metadata, _company_id)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 8. Update send_notification to include company_id
CREATE OR REPLACE FUNCTION public.send_notification(_user_id uuid, _type notification_type, _title text, _message text DEFAULT NULL, _link text DEFAULT NULL, _metadata jsonb DEFAULT '{}')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id UUID; _company_id UUID;
BEGIN
  SELECT company_id INTO _company_id FROM public.profiles WHERE id = _user_id;
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata, company_id)
  VALUES (_user_id, _type, _title, _message, _link, _metadata, _company_id)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 9. Update send_role_notification to scope to caller's company
CREATE OR REPLACE FUNCTION public.send_role_notification(_target_roles text[], _type notification_type, _title text, _message text DEFAULT NULL, _link text DEFAULT NULL, _created_by text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _company_id UUID;
BEGIN
  SELECT company_id INTO _company_id FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.notifications (user_id, type, title, message, link, target_roles, created_by_name, company_id)
  SELECT DISTINCT ur.user_id, _type, _title, _message, _link, _target_roles, _created_by, _company_id
  FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE r.name = ANY(_target_roles) AND p.company_id = _company_id;
END;
$$;


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260406191846_a42fb737-9499-4751-b151-336e6217a02a.sql
-- ╚══════════════════════════════════════════════════════════════════╝


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


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260406191916_b9435c67-cb7f-4307-969e-138292409686.sql
-- ╚══════════════════════════════════════════════════════════════════╝


-- Fix document_shares: scope insert via document company
DROP POLICY IF EXISTS "auth_insert" ON public.document_shares;
CREATE POLICY "company_insert" ON public.document_shares FOR INSERT TO authenticated
  WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE company_id = get_user_company_id(auth.uid())));


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260422090310_a09c2bce-e11e-4003-8e50-5fd51f878ca4.sql
-- ╚══════════════════════════════════════════════════════════════════╝


-- Inventory items: multi-unit definition
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS units JSONB DEFAULT '[]'::jsonb;

-- Sales transaction items: which unit was sold
ALTER TABLE public.sales_transaction_items
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS unit_factor NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_qty NUMERIC;

-- Purchase order items: which unit was ordered
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS unit_factor NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_qty NUMERIC;

-- Invoice items: which unit was billed
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS unit_factor NUMERIC DEFAULT 1;


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260501070313_a6a56bea-8a2c-4861-a139-416e449a749f.sql
-- ╚══════════════════════════════════════════════════════════════════╝


-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  total_spend NUMERIC NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_company ON public.customers(company_id);
CREATE INDEX idx_customers_phone ON public.customers(company_id, phone);
CREATE INDEX idx_customers_email ON public.customers(company_id, email);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_all" ON public.customers
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Link customers to sales + invoices
ALTER TABLE public.sales_transactions ADD COLUMN customer_id UUID;
ALTER TABLE public.invoices ADD COLUMN customer_id UUID;
CREATE INDEX idx_sales_customer ON public.sales_transactions(customer_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);

-- Trigger: maintain customer aggregates on sale completed
CREATE OR REPLACE FUNCTION public.update_customer_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE public.customers
       SET total_spend = total_spend + COALESCE(NEW.total, 0),
           total_orders = total_orders + 1,
           last_purchase_at = NEW.created_at
     WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_customer_aggregates
AFTER INSERT ON public.sales_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_customer_aggregates();

-- Enable Realtime on PO + workflows tables for live status sync
ALTER TABLE public.purchase_orders REPLICA IDENTITY FULL;
ALTER TABLE public.workflows REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflows;


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260503040151_44abc7f9-7e1b-46dc-ba29-b56e004c1806.sql
-- ╚══════════════════════════════════════════════════════════════════╝

-- Fix app_settings to be properly multi-tenant
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;
-- Allow same key per company. Use COALESCE-style by making company_id NOT NULL would break existing — keep nullable but unique pair.
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_company_unique
  ON public.app_settings (key, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260503040234_5a6f0bc0-8ad2-4f39-9bbc-ce5f74bcd53d.sql
-- ╚══════════════════════════════════════════════════════════════════╝

DROP INDEX IF EXISTS public.app_settings_key_company_unique;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_key_company_unique UNIQUE (key, company_id);


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260507085330_bbb21d47-5ac3-4f42-8b58-ae3628b8672c.sql
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales_transactions ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260602104336_8f2310c1-fca6-4076-96b6-9637913d31eb.sql
-- ╚══════════════════════════════════════════════════════════════════╝


-- 1. Extend customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

-- 2. Extend sales_transactions
ALTER TABLE public.sales_transactions
  ADD COLUMN IF NOT EXISTS payments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0;

-- 3. customer_payments
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  customer_id uuid NOT NULL,
  sale_id uuid,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'cash',
  reference text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payments TO authenticated;
GRANT ALL ON public.customer_payments TO service_role;

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_all ON public.customer_payments
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON public.customer_payments(customer_id, created_at DESC);

-- 4. loyalty_transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  customer_id uuid NOT NULL,
  points integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earn','redeem','adjust')),
  reference_type text,
  reference_id text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_all ON public.loyalty_transactions
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON public.loyalty_transactions(customer_id, created_at DESC);

-- 5. Helper: read loyalty settings
CREATE OR REPLACE FUNCTION public.get_loyalty_settings(_company_id uuid)
RETURNS TABLE(enabled boolean, earn_rate numeric, redeem_value numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((value->>'enabled')::boolean, true),
    COALESCE((value->>'earn_rate')::numeric, 0.01),
    COALESCE((value->>'redeem_value')::numeric, 0.1)
  FROM public.app_settings
  WHERE company_id = _company_id AND key = 'loyalty'
  UNION ALL
  SELECT true, 0.01, 0.1
  LIMIT 1
$$;

-- 6. Trigger: on sale completion, award loyalty + record balance
CREATE OR REPLACE FUNCTION public.handle_sale_loyalty_and_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _enabled boolean;
  _earn_rate numeric;
  _points integer;
BEGIN
  IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    -- Outstanding balance
    IF COALESCE(NEW.balance_due, 0) > 0 THEN
      UPDATE public.customers
        SET outstanding_balance = outstanding_balance + NEW.balance_due
        WHERE id = NEW.customer_id;
    END IF;

    -- Loyalty
    SELECT enabled, earn_rate INTO _enabled, _earn_rate
      FROM public.get_loyalty_settings(NEW.company_id) LIMIT 1;

    IF COALESCE(_enabled, true) THEN
      _points := FLOOR(COALESCE(NEW.total,0) * COALESCE(_earn_rate, 0.01))::integer;
      IF _points > 0 THEN
        INSERT INTO public.loyalty_transactions(company_id, customer_id, points, type, reference_type, reference_id, note, created_by)
        VALUES (NEW.company_id, NEW.customer_id, _points, 'earn', 'sale', NEW.id::text,
                'Earned from sale ' || NEW.transaction_number, NEW.cashier_id);
        UPDATE public.customers
          SET loyalty_points = loyalty_points + _points
          WHERE id = NEW.customer_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_loyalty_balance ON public.sales_transactions;
CREATE TRIGGER trg_sale_loyalty_balance
  AFTER INSERT ON public.sales_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_loyalty_and_balance();

-- 7. Trigger: on customer payment, reduce outstanding balance
CREATE OR REPLACE FUNCTION public.handle_customer_payment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.customers
    SET outstanding_balance = GREATEST(outstanding_balance - NEW.amount, 0)
    WHERE id = NEW.customer_id;
  PERFORM public.log_audit('customer.payment', 'Customers',
    (SELECT name FROM public.customers WHERE id = NEW.customer_id),
    'Payment of ' || NEW.amount || ' (' || NEW.method || ') recorded',
    'info'::audit_severity);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_payment ON public.customer_payments;
CREATE TRIGGER trg_customer_payment
  AFTER INSERT ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_customer_payment();

-- 8. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_transactions;

-- 9. Seed default permissions on system roles (idempotent)
UPDATE public.roles SET permissions = ARRAY[
  'inventory.read','inventory.write','inventory.delete',
  'sales.read','sales.write','sales.refund','sales.discount','sales.credit',
  'po.read','po.write','po.approve',
  'customers.read','customers.write','customers.payment',
  'approvals.read','approvals.act',
  'reports.read','reports.export',
  'settings.write','users.manage','roles.manage','audit.read'
] WHERE name IN ('Super Admin','Admin') AND (permissions IS NULL OR array_length(permissions,1) IS NULL OR NOT 'sales.credit' = ANY(permissions));

UPDATE public.roles SET permissions = ARRAY[
  'inventory.read','inventory.write',
  'sales.read','sales.write','sales.refund','sales.discount','sales.credit',
  'po.read','po.write','po.approve',
  'customers.read','customers.write','customers.payment',
  'approvals.read','approvals.act',
  'reports.read'
] WHERE name = 'Manager' AND (permissions IS NULL OR NOT 'sales.credit' = ANY(permissions));

UPDATE public.roles SET permissions = ARRAY[
  'inventory.read',
  'sales.read','sales.write',
  'customers.read','customers.write'
] WHERE name IN ('Sales Rep','Cashier') AND (permissions IS NULL OR array_length(permissions,1) IS NULL);

UPDATE public.roles SET permissions = ARRAY[
  'inventory.read','inventory.write',
  'po.read','po.write'
] WHERE name = 'Warehouse Staff' AND (permissions IS NULL OR array_length(permissions,1) IS NULL);

UPDATE public.roles SET permissions = ARRAY[
  'inventory.read','sales.read','po.read','customers.read','reports.read'
] WHERE name = 'Viewer' AND (permissions IS NULL OR array_length(permissions,1) IS NULL);


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260604045804_a7f799b0-9e9e-4362-a81b-ab077b403396.sql
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: 20260605053832_432f0ef5-2e50-4e1f-9db4-bb8a3830d0fa.sql
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.permission_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  change_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  requested_by_name text,
  reviewed_by uuid,
  reviewed_by_name text,
  review_notes text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.permission_change_requests TO authenticated;
GRANT ALL ON public.permission_change_requests TO service_role;

ALTER TABLE public.permission_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcr_insert_company"
  ON public.permission_change_requests FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND requested_by = auth.uid());

CREATE POLICY "pcr_select_company_admin_or_own"
  ON public.permission_change_requests FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])
      OR requested_by = auth.uid()
    )
  );

CREATE POLICY "pcr_update_company_admin"
  ON public.permission_change_requests FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[])
  );

CREATE TRIGGER tr_pcr_updated
  BEFORE UPDATE ON public.permission_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.permission_change_requests;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  EDGE FUNCTIONS (TypeScript source — informational only)         ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── Edge Function: ai-chat ─────────────────────────
-- import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
-- import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
-- 
-- const corsHeaders = {
--   "Access-Control-Allow-Origin": "*",
--   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
-- };
-- 
-- serve(async (req) => {
--   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
-- 
--   try {
--     const { messages } = await req.json().catch(() => ({ messages: [] }));
--     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
--     if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
-- 
--     const authHeader = req.headers.get("Authorization") ?? "";
--     const supabase = createClient(
--       Deno.env.get("SUPABASE_URL")!,
--       Deno.env.get("SUPABASE_ANON_KEY")!,
--       { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
--     );
-- 
--     const [salesRes, itemsRes, inventoryRes, expensesRes] = await Promise.all([
--       supabase
--         .from("sales_transactions")
--         .select("total, payment_method, created_at, status")
--         .order("created_at", { ascending: false })
--         .limit(300),
--       supabase
--         .from("sales_transaction_items")
--         .select("name, qty, total")
--         .limit(800),
--       supabase
--         .from("inventory_items")
--         .select("name, qty, reorder_point, status, price")
--         .order("qty", { ascending: true })
--         .limit(200),
--       supabase
--         .from("expenses")
--         .select("amount, category, date")
--         .order("date", { ascending: false })
--         .limit(300),
--     ]);
-- 
--     const sales = salesRes.data ?? [];
--     const items = itemsRes.data ?? [];
--     const inventory = inventoryRes.data ?? [];
--     const expenses = expensesRes.data ?? [];
-- 
--     const totalRevenue = sales.reduce((sum, txn) => sum + Number(txn.total || 0), 0);
--     const completedSales = sales.filter((txn) => txn.status === "completed").length;
-- 
--     const topProducts = Object.values(
--       items.reduce((acc: Record<string, { name: string; qty: number; revenue: number }>, item) => {
--         if (!acc[item.name]) {
--           acc[item.name] = { name: item.name, qty: 0, revenue: 0 };
--         }
--         acc[item.name].qty += Number(item.qty || 0);
--         acc[item.name].revenue += Number(item.total || 0);
--         return acc;
--       }, {})
--     )
--       .sort((a, b) => b.revenue - a.revenue)
--       .slice(0, 8);
-- 
--     const lowStock = inventory
--       .filter((item) => item.status === "critical" || item.status === "low" || Number(item.qty) <= Number(item.reorder_point || 0))
--       .slice(0, 12)
--       .map((item) => ({
--         name: item.name,
--         qty: Number(item.qty || 0),
--         reorderPoint: Number(item.reorder_point || 0),
--         status: item.status,
--       }));
-- 
--     const expenseByCategory = expenses.reduce((acc: Record<string, number>, row) => {
--       const key = row.category || "Other";
--       acc[key] = (acc[key] || 0) + Number(row.amount || 0);
--       return acc;
--     }, {});
-- 
--     const liveDataContext = {
--       generatedAt: new Date().toISOString(),
--       counts: {
--         transactions: sales.length,
--         completedSales,
--         inventoryItems: inventory.length,
--         expenses: expenses.length,
--       },
--       revenue: {
--         totalRevenue,
--         averageTransaction: sales.length > 0 ? totalRevenue / sales.length : 0,
--       },
--       paymentMethods: sales.reduce((acc: Record<string, number>, txn) => {
--         const key = txn.payment_method || "unknown";
--         acc[key] = (acc[key] || 0) + 1;
--         return acc;
--       }, {}),
--       topProducts,
--       lowStock,
--       expensesByCategory: expenseByCategory,
--       errors: [salesRes.error, itemsRes.error, inventoryRes.error, expensesRes.error]
--         .filter(Boolean)
--         .map((err) => (err as { message?: string }).message || "Unknown database error"),
--     };
-- 
--     const sanitizedMessages = Array.isArray(messages)
--       ? messages
--           .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
--           .slice(-20)
--       : [];
-- 
--     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
--       method: "POST",
--       headers: {
--         Authorization: `Bearer ${LOVABLE_API_KEY}`,
--         "Content-Type": "application/json",
--       },
--       body: JSON.stringify({
--         model: "google/gemini-3-flash-preview",
--         messages: [
--           {
--             role: "system",
--             content: `You are an intelligent business assistant for a retail/wholesale management platform. You help users with inventory, sales insights, operations, and workflow guidance. Be concise, data-driven, and actionable. Use markdown formatting for clarity.`,
--           },
--           {
--             role: "system",
--             content: `Use this LIVE business snapshot (JSON) from the database for your answers. If data is missing, say so clearly and provide best-practice guidance.\n\n${JSON.stringify(liveDataContext)}`,
--           },
--           ...sanitizedMessages,
--         ],
--         stream: true,
--       }),
--     });
-- 
--     if (!response.ok) {
--       if (response.status === 429) {
--         return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
--           status: 429,
--           headers: { ...corsHeaders, "Content-Type": "application/json" },
--         });
--       }
--       if (response.status === 402) {
--         return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
--           status: 402,
--           headers: { ...corsHeaders, "Content-Type": "application/json" },
--         });
--       }
--       const t = await response.text();
--       console.error("AI gateway error:", response.status, t);
--       return new Response(JSON.stringify({ error: "AI service unavailable" }), {
--         status: 500,
--         headers: { ...corsHeaders, "Content-Type": "application/json" },
--       });
--     }
-- 
--     return new Response(response.body, {
--       headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
--     });
--   } catch (e) {
--     console.error("ai-chat error:", e);
--     return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
--       status: 500,
--       headers: { ...corsHeaders, "Content-Type": "application/json" },
--     });
--   }
-- });


-- ── Edge Function: ai-sales-insights ─────────────────────────
-- import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
-- import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
-- 
-- const corsHeaders = {
--   "Access-Control-Allow-Origin": "*",
--   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
-- };
-- 
-- serve(async (req) => {
--   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
-- 
--   try {
--     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
--     if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
-- 
--     const authHeader = req.headers.get("Authorization");
--     const supabase = createClient(
--       Deno.env.get("SUPABASE_URL")!,
--       Deno.env.get("SUPABASE_ANON_KEY")!,
--       { global: { headers: { Authorization: authHeader || "" } } }
--     );
-- 
--     // Fetch recent sales data
--     const { data: sales } = await supabase
--       .from("sales_transactions")
--       .select("total, payment_method, created_at, customer_name, status, subtotal, tax, discount")
--       .order("created_at", { ascending: false })
--       .limit(200);
-- 
--     // Fetch top selling items
--     const { data: items } = await supabase
--       .from("sales_transaction_items")
--       .select("name, qty, total, price")
--       .limit(500);
-- 
--     // Fetch inventory alerts
--     const { data: lowStock } = await supabase
--       .from("inventory_items")
--       .select("name, qty, reorder_point, status, price")
--       .in("status", ["critical", "low"])
--       .limit(50);
-- 
--     // Fetch expenses summary
--     const { data: expenses } = await supabase
--       .from("expenses")
--       .select("amount, category, date")
--       .order("date", { ascending: false })
--       .limit(100);
-- 
--     const salesSummary = sales?.length ? {
--       totalTransactions: sales.length,
--       totalRevenue: sales.reduce((s, t) => s + (t.total || 0), 0),
--       avgTransaction: sales.reduce((s, t) => s + (t.total || 0), 0) / sales.length,
--       totalTax: sales.reduce((s, t) => s + (t.tax || 0), 0),
--       totalDiscount: sales.reduce((s, t) => s + (t.discount || 0), 0),
--       paymentMethods: sales.reduce((acc: Record<string, number>, t) => {
--         acc[t.payment_method] = (acc[t.payment_method] || 0) + 1;
--         return acc;
--       }, {}),
--     } : null;
-- 
--     const topProducts = items?.length
--       ? Object.values(items.reduce((acc: Record<string, { name: string; qty: number; revenue: number }>, i) => {
--           if (!acc[i.name]) acc[i.name] = { name: i.name, qty: 0, revenue: 0 };
--           acc[i.name].qty += i.qty;
--           acc[i.name].revenue += i.total;
--           return acc;
--         }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
--       : [];
-- 
--     const expenseSummary = expenses?.length ? {
--       total: expenses.reduce((s, e) => s + (e.amount || 0), 0),
--       byCategory: expenses.reduce((acc: Record<string, number>, e) => {
--         acc[e.category] = (acc[e.category] || 0) + e.amount;
--         return acc;
--       }, {}),
--     } : null;
-- 
--     const dataContext = JSON.stringify({
--       salesSummary,
--       topProducts,
--       lowStockItems: lowStock?.length || 0,
--       lowStockDetails: lowStock?.slice(0, 10),
--       expenseSummary,
--     });
-- 
--     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
--       method: "POST",
--       headers: {
--         Authorization: `Bearer ${LOVABLE_API_KEY}`,
--         "Content-Type": "application/json",
--       },
--       body: JSON.stringify({
--         model: "google/gemini-3-flash-preview",
--         messages: [
--           {
--             role: "system",
--             content: `You are a business analytics AI. Analyze the provided business data and generate a concise, actionable insights report. Use markdown formatting with headers, bullet points, and bold text. Focus on:
-- 1. **Revenue Performance** - Key metrics and trends
-- 2. **Top Products** - Best sellers by revenue and volume
-- 3. **Inventory Alerts** - Critical stock situations
-- 4. **Expense Overview** - Cost analysis
-- 5. **Recommendations** - 3-5 actionable suggestions
-- 
-- Keep the report under 500 words. Use emojis sparingly for visual appeal.`
--           },
--           {
--             role: "user",
--             content: `Analyze this business data and provide insights:\n\n${dataContext}`
--           }
--         ],
--         stream: true,
--       }),
--     });
-- 
--     if (!response.ok) {
--       if (response.status === 429) {
--         return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
--           status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
--         });
--       }
--       if (response.status === 402) {
--         return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
--           status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
--         });
--       }
--       const t = await response.text();
--       console.error("AI gateway error:", response.status, t);
--       return new Response(JSON.stringify({ error: "AI service unavailable" }), {
--         status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
--       });
--     }
-- 
--     return new Response(response.body, {
--       headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
--     });
--   } catch (e) {
--     console.error("ai-sales-insights error:", e);
--     return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
--       status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
--     });
--   }
-- });


-- ── Edge Function: create-user ─────────────────────────
-- import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
-- 
-- const corsHeaders = {
--   "Access-Control-Allow-Origin": "*",
--   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
-- };
-- 
-- Deno.serve(async (req) => {
--   if (req.method === "OPTIONS") {
--     return new Response("ok", { headers: corsHeaders });
--   }
-- 
--   try {
--     const authHeader = req.headers.get("Authorization");
--     if (!authHeader) {
--       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
--     const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
-- 
--     // Verify caller using getClaims (works with signing-keys)
--     const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
--       global: { headers: { Authorization: authHeader } },
--     });
--     const token = authHeader.replace("Bearer ", "");
--     const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
--     if (claimsError || !claimsData?.claims?.sub) {
--       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
--     const callerId = claimsData.claims.sub;
-- 
--     const adminClient = createClient(supabaseUrl, serviceRoleKey);
-- 
--     // Check caller has admin role
--     const { data: isAdmin } = await adminClient.rpc("has_any_role", { _user_id: callerId, _roles: ["super_admin", "admin"] });
--     if (!isAdmin) {
--       return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     const { username, password, name, role, department, store, companyId: bodyCompanyId } = await req.json();
-- 
--     if (!username || !password || !name) {
--       return new Response(JSON.stringify({ error: "username, password, and name are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     // Generate a synthetic email from username for Supabase Auth
--     const email = username.includes("@") ? username : `${username.toLowerCase().replace(/\s+/g, ".")}@staff.internal`;
-- 
--     // Create auth user with admin API (auto-confirms email)
--     const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
--       email,
--       password,
--       email_confirm: true,
--       user_metadata: { name },
--     });
-- 
--     if (createError || !newUser?.user) {
--       const msg = createError?.message || "Failed to create user";
--       const userMsg = msg.includes("already been registered")
--         ? `Username "${username}" is already taken. Please choose a different username.`
--         : msg;
--       return new Response(JSON.stringify({ error: userMsg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     const userId = newUser.user.id;
-- 
--     // Get caller's company_id to assign to the new user
--     let companyId = bodyCompanyId;
--     if (!companyId) {
--       const { data: callerProfile } = await adminClient.from("profiles").select("company_id").eq("id", callerId).single();
--       companyId = callerProfile?.company_id || null;
--     }
-- 
--     if (!companyId) {
--       // Roll back the orphan auth user so the admin can retry cleanly.
--       await adminClient.auth.admin.deleteUser(userId);
--       return new Response(
--         JSON.stringify({ error: "Your account is not linked to a company. Open Company Setup first, then create users." }),
--         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
--       );
--     }
-- 
--     // Update profile with name and company_id (trigger should have created it).
--     // We retry briefly because the auth → profiles trigger is async.
--     let profileUpdated = false;
--     for (let attempt = 0; attempt < 5 && !profileUpdated; attempt++) {
--       const { error: updErr, data: updRow } = await adminClient
--         .from("profiles")
--         .update({ name, email, company_id: companyId })
--         .eq("id", userId)
--         .select("id")
--         .maybeSingle();
--       if (!updErr && updRow) { profileUpdated = true; break; }
--       await new Promise((r) => setTimeout(r, 150));
--     }
--     if (!profileUpdated) {
--       // Fallback: insert the row directly if the trigger never fired.
--       await adminClient.from("profiles").upsert({ id: userId, name, email, company_id: companyId });
--     }
-- 
--     // Assign role if specified
--     if (role) {
--       const { data: roleRow } = await adminClient.from("roles").select("id").eq("name", role).single();
--       if (roleRow) {
--         await adminClient.from("user_roles").delete().eq("user_id", userId);
--         await adminClient.from("user_roles").insert({ user_id: userId, role_id: roleRow.id });
--       }
--     }
-- 
--     // Assign store if specified
--     if (store) {
--       const { data: storeRow } = await adminClient.from("stores").select("id").eq("name", store).single();
--       if (storeRow) {
--         await adminClient.from("user_store_assignments").insert({ user_id: userId, store_id: storeRow.id, assigned_by: callerId });
--         await adminClient.from("profiles").update({ store_id: storeRow.id }).eq("id", userId);
--       }
--     }
-- 
--     // Assign department if specified
--     if (department) {
--       const { data: deptRow } = await adminClient.from("departments").select("id").eq("name", department).single();
--       if (deptRow) {
--         await adminClient.from("profiles").update({ department_id: deptRow.id }).eq("id", userId);
--       }
--     }
-- 
--     return new Response(JSON.stringify({ id: userId, email, name }), {
--       headers: { ...corsHeaders, "Content-Type": "application/json" },
--     });
--   } catch (err) {
--     return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--   }
-- });


-- ── Edge Function: delete-user ─────────────────────────
-- import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
-- 
-- const corsHeaders = {
--   "Access-Control-Allow-Origin": "*",
--   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
-- };
-- 
-- Deno.serve(async (req) => {
--   if (req.method === "OPTIONS") {
--     return new Response("ok", { headers: corsHeaders });
--   }
-- 
--   try {
--     const authHeader = req.headers.get("Authorization");
--     if (!authHeader) {
--       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
--     const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
-- 
--     const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
--       global: { headers: { Authorization: authHeader } },
--     });
--     const token = authHeader.replace("Bearer ", "");
--     const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
--     if (claimsError || !claimsData?.claims?.sub) {
--       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
--     const callerId = claimsData.claims.sub;
-- 
--     const adminClient = createClient(supabaseUrl, serviceRoleKey);
-- 
--     // Check caller has admin role
--     const { data: isAdmin } = await adminClient.rpc("has_any_role", { _user_id: callerId, _roles: ["super_admin", "admin"] });
--     if (!isAdmin) {
--       return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     const { user_id } = await req.json();
-- 
--     if (!user_id) {
--       return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     // Prevent self-deletion
--     if (user_id === callerId) {
--       return new Response(JSON.stringify({ error: "Cannot delete your own account" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     // Delete the auth user (cascades to profiles, user_roles, etc.)
--     const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
--     if (deleteError) {
--       return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--     }
-- 
--     return new Response(JSON.stringify({ success: true }), {
--       headers: { ...corsHeaders, "Content-Type": "application/json" },
--     });
--   } catch (err) {
--     return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
--   }
-- });

