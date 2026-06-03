
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
