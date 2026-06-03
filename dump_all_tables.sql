-- =========================================================================
-- SQL Query to Dump All 35 Tables to a Single JSON Object
-- =========================================================================
-- How to use:
-- 1. Copy the entire contents of this file.
-- 2. Paste it into the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/.../sql/new).
-- 3. Run the query.
-- 4. Copy the single JSON output value and save it to a file (e.g. database_dump.json).
-- =========================================================================

SELECT json_build_object(
  'stores', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.stores t),
  'warehouses', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.warehouses t),
  'departments', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.departments t),
  'company_profiles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.company_profiles t),
  'roles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.roles t),
  'profiles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.profiles t),
  'user_roles', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.user_roles t),
  'inventory_categories', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.inventory_categories t),
  'inventory_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.inventory_items t),
  'stock_adjustments', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.stock_adjustments t),
  'stock_transfers', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.stock_transfers t),
  'stock_transfer_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.stock_transfer_items t),
  'suppliers', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.suppliers t),
  'purchase_orders', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.purchase_orders t),
  'purchase_order_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.purchase_order_items t),
  'sales_transactions', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.sales_transactions t),
  'sales_transaction_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.sales_transaction_items t),
  'sales_returns', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.sales_returns t),
  'sales_return_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.sales_return_items t),
  'workflow_templates', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.workflow_templates t),
  'workflows', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.workflows t),
  'workflow_step_history', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.workflow_step_history t),
  'approvals', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.approvals t),
  'document_folders', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.document_folders t),
  'documents', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.documents t),
  'document_shares', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.document_shares t),
  'chat_channels', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.chat_channels t),
  'chat_channel_members', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.chat_channel_members t),
  'chat_messages', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.chat_messages t),
  'notifications', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.notifications t),
  'audit_log', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.audit_log t),
  'app_settings', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.app_settings t),
  'saved_reports', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.saved_reports t),
  'receipt_templates', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.receipt_templates t),
  'user_sessions', (SELECT COALESCE(json_agg(t), '[]'::json) FROM public.user_sessions t)
) AS database_dump;
