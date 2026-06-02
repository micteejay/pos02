
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
UPDATE public.profiles SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.stores SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.warehouses SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.departments SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.inventory_items SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.inventory_categories SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.sales_transactions SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.invoices SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.purchase_orders SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.suppliers SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.expenses SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.categories SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.documents SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.document_folders SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.chat_channels SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.approvals SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.workflows SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.workflow_templates SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.receipt_templates SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.saved_reports SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.generated_reports SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.app_settings SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.notifications SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;
UPDATE public.audit_log SET company_id = (SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1) WHERE company_id IS NULL;

