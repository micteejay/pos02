import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not defined in .env file.");
  process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

// List of all tables from database.sql
const tables = [
  "stores",
  "warehouses",
  "departments",
  "company_profiles",
  "roles",
  "profiles",
  "user_roles",
  "inventory_categories",
  "inventory_items",
  "stock_adjustments",
  "stock_transfers",
  "stock_transfer_items",
  "suppliers",
  "purchase_orders",
  "purchase_order_items",
  "sales_transactions",
  "sales_transaction_items",
  "sales_returns",
  "sales_return_items",
  "workflow_templates",
  "workflows",
  "workflow_step_history",
  "approvals",
  "document_folders",
  "documents",
  "document_shares",
  "chat_channels",
  "chat_channel_members",
  "chat_messages",
  "notifications",
  "audit_log",
  "app_settings",
  "saved_reports",
  "receipt_templates",
  "user_sessions"
];

async function dumpAllTables() {
  console.log("Starting data extraction from Supabase using Anon Key...");
  console.log("Note: Only tables with public read access or active RLS policies permitting reading will return data.\n");

  const dumpData = {};

  for (const table of tables) {
    console.log(`Fetching table "${table}"...`);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.warn(`  [Warning] Failed to fetch table "${table}":`, error.message);
        dumpData[table] = { error: error.message };
      } else {
        console.log(`  Successfully fetched ${data.length} rows.`);
        dumpData[table] = data;
      }
    } catch (err) {
      console.error(`  [Error] Exception during fetch for "${table}":`, err.message);
      dumpData[table] = { error: err.message };
    }
  }

  const outputPath = join(process.cwd(), "database_rows_dump.json");
  writeFileSync(outputPath, JSON.stringify(dumpData, null, 2), "utf8");

  console.log(`\nSuccess! Extracted rows have been saved to: ${outputPath}`);
}

dumpAllTables();
