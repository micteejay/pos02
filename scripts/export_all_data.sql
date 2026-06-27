-- =====================================================================
-- FULL DATA EXPORT — VITE POS (pos02)
-- Run this in: Supabase Dashboard → SQL Editor
-- Works for ANY number of tables — self-discovering
-- =====================================================================


-- ══════════════════════════════════════════════════════════════════════
-- STEP 1: Discover all tables in your public schema
--         Run this first to see all 48 table names
-- ══════════════════════════════════════════════════════════════════════

SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size('public.' || quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type  = 'BASE TABLE'
ORDER BY table_name;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 2: Row-count summary for ALL tables (no hardcoding needed)
-- ══════════════════════════════════════════════════════════════════════

SELECT
  relname                            AS table_name,
  n_live_tup                         AS estimated_rows,
  pg_size_pretty(pg_total_relation_size('public.' || quote_ident(relname))) AS size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC, relname;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 3: Export ALL data as JSON — one row per table
--         Copy the output and save as a .json file
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl  TEXT;
  sql  TEXT;
  result JSON;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    sql := format(
      'SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM public.%I) t',
      tbl
    );
    EXECUTE sql INTO result;
    RAISE NOTICE 'TABLE: % | DATA: %', tbl, result;
  END LOOP;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 4: Generate a ready-to-run SELECT script for all 48 tables
--         Run this, copy the output, paste it as a new query
-- ══════════════════════════════════════════════════════════════════════

SELECT string_agg(
  '-- ── ' || table_name || E' ──\n' ||
  'SELECT ' || quote_literal(table_name) || E' AS "table", count(*) AS rows FROM public.' || quote_ident(table_name) || E';\n' ||
  'SELECT * FROM public.' || quote_ident(table_name) || E' ORDER BY 1;\n',
  E'\n'
  ORDER BY table_name
) AS generated_export_script
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';


-- ══════════════════════════════════════════════════════════════════════
-- STEP 5: Known tables — direct SELECT * (35 confirmed tables)
--         The 13 extra tables will appear from Steps 1–4 above
-- ══════════════════════════════════════════════════════════════════════

-- Organization & Core
SELECT * FROM public.stores               ORDER BY created_at;
SELECT * FROM public.warehouses           ORDER BY created_at;
SELECT * FROM public.departments          ORDER BY created_at;
SELECT * FROM public.company_profiles     ORDER BY created_at;

-- Users, Roles & RBAC
SELECT * FROM public.roles                ORDER BY created_at;
SELECT * FROM public.profiles             ORDER BY created_at;
SELECT * FROM public.user_roles;

-- Inventory
SELECT * FROM public.inventory_categories ORDER BY created_at;
SELECT * FROM public.inventory_items      ORDER BY created_at;
SELECT * FROM public.stock_adjustments    ORDER BY created_at;
SELECT * FROM public.stock_transfers      ORDER BY created_at;
SELECT * FROM public.stock_transfer_items;

-- Supply Chain & Purchasing
SELECT * FROM public.suppliers            ORDER BY created_at;
SELECT * FROM public.purchase_orders      ORDER BY created_at;
SELECT * FROM public.purchase_order_items;

-- Sales & POS
SELECT * FROM public.sales_transactions   ORDER BY created_at;
SELECT * FROM public.sales_transaction_items;
SELECT * FROM public.sales_returns        ORDER BY created_at;
SELECT * FROM public.sales_return_items;

-- Workflows & Approvals
SELECT * FROM public.workflow_templates   ORDER BY created_at;
SELECT * FROM public.workflows            ORDER BY created_at;
SELECT * FROM public.workflow_step_history ORDER BY created_at;
SELECT * FROM public.approvals            ORDER BY created_at;

-- Documents & File Storage
SELECT * FROM public.document_folders     ORDER BY created_at;
SELECT * FROM public.documents            ORDER BY created_at;
SELECT * FROM public.document_shares      ORDER BY created_at;

-- Chat & Messaging
SELECT * FROM public.chat_channels        ORDER BY created_at;
SELECT * FROM public.chat_channel_members ORDER BY joined_at;
SELECT * FROM public.chat_messages        ORDER BY created_at;

-- Notifications & Audit
SELECT * FROM public.notifications        ORDER BY created_at;
SELECT * FROM public.audit_log            ORDER BY created_at;

-- Settings & Reports
SELECT * FROM public.app_settings         ORDER BY updated_at;
SELECT * FROM public.saved_reports        ORDER BY created_at;
SELECT * FROM public.receipt_templates    ORDER BY created_at;
SELECT * FROM public.user_sessions        ORDER BY started_at;
