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

