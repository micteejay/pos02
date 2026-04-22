
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
