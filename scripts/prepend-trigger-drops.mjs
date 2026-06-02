import { readFileSync, writeFileSync } from "fs";

const mapping = [
  ["tr_profiles_updated", "profiles"],
  ["tr_roles_updated", "roles"],
  ["tr_stores_updated", "stores"],
  ["tr_warehouses_updated", "warehouses"],
  ["tr_departments_updated", "departments"],
  ["tr_inventory_updated", "inventory_items"],
  ["tr_transfers_updated", "stock_transfers"],
  ["tr_suppliers_updated", "suppliers"],
  ["tr_po_updated", "purchase_orders"],
  ["tr_workflows_updated", "workflows"],
  ["tr_wf_templates_updated", "workflow_templates"],
  ["tr_approvals_updated", "approvals"],
  ["tr_documents_updated", "documents"],
  ["tr_messages_updated", "chat_messages"],
  ["tr_channels_updated", "chat_channels"],
  ["tr_reports_updated", "saved_reports"],
  ["tr_receipts_updated", "receipt_templates"],
  ["tr_invoices_updated", "invoices"],
  ["tr_audit_stores", "stores"],
  ["tr_audit_user_roles", "user_roles"],
  ["tr_audit_sales", "sales_transactions"],
  ["tr_audit_inventory", "inventory_items"],
  ["tr_audit_category", "categories"],
  ["tr_audit_expense", "expenses"],
  ["tr_chat_attachment_to_doc", "chat_messages"],
];

const sql = readFileSync(process.argv[2], "utf8");
const drops = mapping.map(([t, tbl]) => `DROP TRIGGER IF EXISTS ${t} ON public.${tbl};`).join("\n");
writeFileSync(process.argv[3], drops + "\n\n" + sql);
