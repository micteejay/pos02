-- =====================================================
-- Enterprise Hub — Full Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'sales_rep', 'warehouse_staff', 'viewer');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.inventory_status AS ENUM ('critical', 'low', 'ok');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.transfer_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE public.po_status AS ENUM ('draft', 'submitted', 'approved', 'received', 'cancelled');
CREATE TYPE public.transaction_status AS ENUM ('completed', 'refunded', 'pending');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.workflow_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
CREATE TYPE public.notification_type AS ENUM ('approval', 'inventory', 'workflow', 'chat', 'system', 'sales');
CREATE TYPE public.document_type AS ENUM ('pdf', 'xlsx', 'docx', 'png', 'jpg', 'folder', 'txt');
CREATE TYPE public.store_status AS ENUM ('active', 'maintenance', 'closed');
CREATE TYPE public.warehouse_status AS ENUM ('operational', 'maintenance');

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
  employees INTEGER DEFAULT 0,
  revenue TEXT DEFAULT '$0/mo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER DEFAULT 0,
  sqft TEXT,
  manager TEXT,
  zones INTEGER DEFAULT 1,
  active_picks INTEGER DEFAULT 0,
  status warehouse_status NOT NULL DEFAULT 'operational',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  head TEXT,
  headcount INTEGER DEFAULT 0,
  budget TEXT,
  teams TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, role_id)
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

-- =====================================================
-- 4. INVENTORY TABLES
-- =====================================================

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Uncategorized',
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 50,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status inventory_status NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number TEXT NOT NULL UNIQUE,
  items TEXT NOT NULL,
  from_warehouse_id UUID REFERENCES public.warehouses(id),
  to_warehouse_id UUID REFERENCES public.warehouses(id),
  qty INTEGER NOT NULL DEFAULT 0,
  status transfer_status NOT NULL DEFAULT 'pending',
  requester UUID REFERENCES auth.users(id),
  eta DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  category TEXT DEFAULT 'General',
  status TEXT DEFAULT 'Active',
  rating NUMERIC(2,1) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status po_status NOT NULL DEFAULT 'draft',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  expected_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
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
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES auth.users(id),
  status transaction_status NOT NULL DEFAULT 'completed',
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
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- =====================================================
-- 7. WORKFLOWS & APPROVALS
-- =====================================================

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT DEFAULT 'manual',
  status workflow_status NOT NULL DEFAULT 'active',
  steps JSONB DEFAULT '[]',
  current_step INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  assigned_role UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT,
  requester UUID REFERENCES auth.users(id),
  department TEXT,
  amount NUMERIC(12,2),
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status approval_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 8. DOCUMENTS
-- =====================================================

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type document_type NOT NULL DEFAULT 'txt',
  size TEXT,
  folder TEXT DEFAULT '/',
  author UUID REFERENCES auth.users(id),
  source TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 9. CHAT & MESSAGING
-- =====================================================

CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'channel',
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reactions JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  edited BOOLEAN DEFAULT FALSE,
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
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 11. AUDIT LOG
-- =====================================================

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
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
-- 13. SECURITY DEFINER FUNCTIONS (RBAC)
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

-- =====================================================
-- 14. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read most tables
CREATE POLICY "Authenticated read" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.stores FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.warehouses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.inventory_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.stock_transfers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.suppliers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.purchase_orders FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.purchase_order_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.sales_transactions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.sales_transaction_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.workflows FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.approvals FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.documents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.chat_channels FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.chat_messages FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON public.app_settings FOR SELECT TO authenticated USING (TRUE);

-- Users can only see their own notifications
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Audit log readable by admins (via has_role function)
CREATE POLICY "Admin read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Users can update their own profile
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Admin write policies for management tables
CREATE POLICY "Admin manage users" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin manage stores" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin manage warehouses" ON public.warehouses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Authenticated users can insert into operational tables
CREATE POLICY "Auth insert inventory" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth update inventory" ON public.inventory_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Auth delete inventory" ON public.inventory_items FOR DELETE TO authenticated USING (TRUE);

CREATE POLICY "Auth insert transfers" ON public.stock_transfers FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth update transfers" ON public.stock_transfers FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Auth insert POs" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth update POs" ON public.purchase_orders FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Auth insert PO items" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Auth insert sales" ON public.sales_transactions FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth insert sale items" ON public.sales_transaction_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth update sales" ON public.sales_transactions FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Auth manage workflows" ON public.workflows FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Auth manage approvals" ON public.approvals FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Auth manage documents" ON public.documents FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Auth manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "Auth manage channels" ON public.chat_channels FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Auth manage messages" ON public.chat_messages FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "Auth insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (TRUE);

-- =====================================================
-- 15. INDEXES
-- =====================================================

CREATE INDEX idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX idx_inventory_warehouse ON public.inventory_items(warehouse_id);
CREATE INDEX idx_inventory_status ON public.inventory_items(status);
CREATE INDEX idx_sales_store ON public.sales_transactions(store_id);
CREATE INDEX idx_sales_created ON public.sales_transactions(created_at);
CREATE INDEX idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);
CREATE INDEX idx_audit_created ON public.audit_log(created_at);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_transfers_status ON public.stock_transfers(status);

-- =====================================================
-- 16. TRIGGERS FOR updated_at
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
CREATE TRIGGER tr_approvals_updated BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_messages_updated BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 17. SEED DEFAULT ROLES
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
    'audit.view','chat.view','chat.create','notifications.view','dashboard.view'
  ], TRUE, 'bg-primary/10 text-primary'),
  ('Manager', 'Manage operations and sales', ARRAY[
    'users.view','inventory.view','inventory.create','inventory.edit',
    'sales.view','sales.create','sales.edit','pos.view','pos.create',
    'supply.view','supply.create','supply.edit','supply.approve',
    'workflows.view','workflows.create','workflows.approve',
    'approvals.view','approvals.approve','approvals.reject',
    'reports.view','reports.export','organization.view',
    'documents.view','documents.create','documents.edit',
    'chat.view','chat.create','audit.view'
  ], FALSE, 'bg-info/10 text-info'),
  ('Sales Rep', 'Point of sale and sales', ARRAY[
    'sales.view','sales.create','pos.view','pos.create',
    'inventory.view','reports.view','chat.view','chat.create','documents.view'
  ], FALSE, 'bg-success/10 text-success'),
  ('Warehouse Staff', 'Inventory and supply chain', ARRAY[
    'inventory.view','inventory.create','inventory.edit',
    'supply.view','supply.create','workflows.view',
    'documents.view','chat.view','chat.create'
  ], FALSE, 'bg-warning/10 text-warning'),
  ('Viewer', 'Read-only access', ARRAY[
    'users.view','inventory.view','sales.view','pos.view','supply.view',
    'workflows.view','approvals.view','reports.view','organization.view',
    'documents.view','settings.view','audit.view','chat.view',
    'notifications.view','dashboard.view'
  ], FALSE, 'bg-muted text-muted-foreground');
