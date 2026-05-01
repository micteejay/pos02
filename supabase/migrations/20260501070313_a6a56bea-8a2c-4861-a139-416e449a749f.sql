
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
