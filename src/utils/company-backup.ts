import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BackupManifest {
  version: "1.0";
  app: "VITE POS";
  exported_at: string;
  company_name: string;
  tables_exported: string[];
  row_counts: Record<string, number>;
  data: Record<string, any[]>;
}

export type BackupProgress = {
  stage: "reading" | "exporting" | "importing" | "done" | "error";
  message: string;
  percent: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tables exported in FK-safe dependency order (company_id-scoped)
// ─────────────────────────────────────────────────────────────────────────────

const EXPORT_TABLES: string[] = [
  // Core settings & config
  "roles",
  "user_roles",
  "receipt_templates",
  "app_settings",
  // Org structure
  "stores",
  "warehouses",
  "departments",
  // User assignments (child of stores/warehouses — scoped by company via those parents)
  "user_store_assignments",
  "user_warehouse_assignments",
  // Inventory
  "inventory_categories",
  "inventory_items",
  // Stock movements (supply-side, inventory-linked)
  "stock_adjustments",
  // Supply chain
  "suppliers",
  "purchase_orders",
  "purchase_order_items",
  // Stock transfers (company_id-scoped)
  "stock_transfers",
  "stock_transfer_items",
  // Customers
  "customers",
  "customer_payments",
  "loyalty_transactions",
  // Sales
  "sales_transactions",
  "sales_transaction_items",
  "sales_returns",
  "sales_return_items",
  // Financial
  "expenses",
  "categories",
  "invoices",
  "invoice_items",
  // Documents
  "document_folders",
  "documents",
  "document_shares",
  // Workflows & approvals
  "workflow_templates",
  "workflows",
  "workflow_step_history",
  "approvals",
  "permission_change_requests",
  // Chat
  "chat_channels",
  "chat_channel_members",
  "chat_messages",
  "chat_document_links",
  // Notifications
  "notifications",
  // Audit & sessions
  "audit_log",
  "user_sessions",
  // Reports & integrations
  "saved_reports",
  "generated_reports",
  "integration_configs",
];

// Tables that have a `company_id` column (company-scoped)
const COMPANY_SCOPED = new Set(EXPORT_TABLES);

// Tables without company_id (or not directly company-scoped) that are fetched
// by their parent's IDs collected during export.
const PARENT_LINKED: Record<string, string> = {
  // Org (user join tables, no company_id column)
  user_roles: "role_id",
  user_store_assignments: "store_id",
  user_warehouse_assignments: "warehouse_id",
  // Inventory
  stock_adjustments: "inventory_item_id",
  // Supply
  purchase_order_items: "purchase_order_id",
  stock_transfer_items: "transfer_id",
  // Sales
  sales_transaction_items: "transaction_id",
  sales_returns: "transaction_id",
  sales_return_items: "return_id",
  // Customers
  customer_payments: "customer_id",
  loyalty_transactions: "customer_id",
  // Financial
  invoice_items: "invoice_id",
  // Documents (child tables, no company_id)
  document_shares: "document_id",
  // Workflows
  workflow_step_history: "workflow_id",
  // Chat (channel-linked children)
  chat_channel_members: "channel_id",
  chat_messages: "channel_id",
  chat_document_links: "message_id",
  // Sessions (user-scoped, no company_id — export all for the company's users)
  user_sessions: "user_id",
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function exportCompanyBackup(
  companyId: string,
  companyName: string,
  onProgress?: (p: BackupProgress) => void
): Promise<void> {
  const report = (stage: BackupProgress["stage"], message: string, percent: number) =>
    onProgress?.({ stage, message, percent });

  report("exporting", "Starting export…", 0);

  const data: Record<string, any[]> = {};
  const rowCounts: Record<string, number> = {};

  // 1. Export company_profiles itself (just the one row)
  const { data: company } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", companyId)
    .limit(1);
  data["company_profiles"] = company ?? [];
  rowCounts["company_profiles"] = data["company_profiles"].length;

  // 2. Collect parent IDs for child tables that aren't company-scoped
  let parentIds: Record<string, Set<string>> = {};

  // Fetch profiles belonging to this company to get user_ids for parent-linked tables like user_sessions
  try {
    const { data: companyProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id", companyId);
    parentIds["profiles"] = new Set((companyProfiles ?? []).map((p: any) => p.id));
  } catch (err) {
    console.error("Failed to fetch company profiles:", err);
    parentIds["profiles"] = new Set();
  }

  for (let i = 0; i < EXPORT_TABLES.length; i++) {
    const table = EXPORT_TABLES[i];
    const percent = Math.round(5 + (i / EXPORT_TABLES.length) * 85);
    report("exporting", `Exporting ${table}…`, percent);

    try {
      let rows: any[] = [];

      if (table === "roles") {
        // Roles are global in the database, select all of them
        const { data: tableRows } = await supabase.from("roles").select("*");
        rows = tableRows ?? [];
      } else if (PARENT_LINKED[table]) {
        // Export by parent IDs collected earlier
        const parentCol = PARENT_LINKED[table];
        const parentTableMap: Record<string, string> = {
          // Org
          role_id: "roles",
          store_id: "stores",
          warehouse_id: "warehouses",
          // Inventory
          inventory_item_id: "inventory_items",
          // Supply
          purchase_order_id: "purchase_orders",
          transfer_id: "stock_transfers",
          // Sales
          transaction_id: "sales_transactions",
          return_id: "sales_returns",
          // Customers
          customer_id: "customers",
          // Financial
          invoice_id: "invoices",
          // Documents
          document_id: "documents",
          // Workflows
          workflow_id: "workflows",
          // Chat
          channel_id: "chat_channels",
          message_id: "chat_messages",
          // Sessions
          user_id: "profiles",
        };
        const parentTable = parentTableMap[parentCol];
        const ids = Array.from(parentIds[parentTable] ?? []);
        if (ids.length > 0) {
          const { data: childRows } = await supabase
            .from(table as any)
            .select("*")
            .in(parentCol, ids);
          rows = childRows ?? [];
        }
      } else {
        // Company-scoped table
        const { data: tableRows } = await supabase
          .from(table as any)
          .select("*")
          .eq("company_id", companyId);
        rows = tableRows ?? [];
      }

      // Track parent IDs for child tables (both company-scoped and parent-linked tables can be parents of other tables)
      parentIds[table] = new Set(rows.map((r: any) => r.id));

      data[table] = rows;
      rowCounts[table] = rows.length;
    } catch {
      data[table] = [];
      rowCounts[table] = 0;
    }
  }

  report("exporting", "Packaging backup file…", 92);

  const manifest: BackupManifest = {
    version: "1.0",
    app: "VITE POS",
    exported_at: new Date().toISOString(),
    company_name: companyName,
    tables_exported: ["company_profiles", ...EXPORT_TABLES],
    row_counts: rowCounts,
    data,
  };

  const json = JSON.stringify(manifest, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  a.download = `${safeName}_backup_${date}.vitepbak`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  report("done", "Backup downloaded successfully!", 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function importCompanyBackup(
  file: File,
  newUserId: string,
  onProgress?: (p: BackupProgress) => void
): Promise<{ ok: boolean; message: string; companyId?: string }> {
  const report = (stage: BackupProgress["stage"], message: string, percent: number) =>
    onProgress?.({ stage, message, percent });

  try {
    report("reading", "Reading backup file…", 0);

    const text = await file.text();
    const manifest: BackupManifest = JSON.parse(text);

    // Validate
    if (manifest.app !== "VITE POS" || manifest.version !== "1.0") {
      return { ok: false, message: "Invalid backup file. Only VITE POS .vitepbak files are supported." };
    }

    report("importing", "Preparing data…", 5);

    // Build UUID remap: old UUID → new UUID
    const uuidMap = new Map<string, string>();
    const newUuid = () => crypto.randomUUID();

    // Pre-register all old IDs across all tables
    for (const rows of Object.values(manifest.data)) {
      for (const row of rows ?? []) {
        if (row.id && !uuidMap.has(row.id)) {
          uuidMap.set(row.id, newUuid());
        }
      }
    }

    // The new company gets a fresh UUID
    const oldCompanyId = manifest.data["company_profiles"]?.[0]?.id;
    const newCompanyId = oldCompanyId ? uuidMap.get(oldCompanyId)! : newUuid();
    if (oldCompanyId && !uuidMap.has(oldCompanyId)) {
      uuidMap.set(oldCompanyId, newCompanyId);
    }

    // Map old owner to the new restoring user
    const oldOwnerId = manifest.data["company_profiles"]?.[0]?.owner_id;
    if (oldOwnerId) {
      uuidMap.set(oldOwnerId, newUserId);
    }

    // Pre-fetch existing unique keys to resolve conflicts on import
    const existingRoles = new Map<string, string>();
    const existingUserRoles = new Set<string>();
    const existingProfiles = new Set<string>();
    const existingStoreAssignments = new Set<string>();
    const existingWarehouseAssignments = new Set<string>();

    try {
      const [rolesRes, userRolesRes, profilesRes, storeAssignRes, whAssignRes] = await Promise.all([
        supabase.from("roles").select("id, name"),
        supabase.from("user_roles").select("user_id, role_id"),
        supabase.from("profiles").select("id"),
        supabase.from("user_store_assignments").select("user_id, store_id"),
        supabase.from("user_warehouse_assignments").select("user_id, warehouse_id"),
      ]);

      (rolesRes.data || []).forEach((r: any) => {
        if (r.name) existingRoles.set(r.name.toLowerCase().trim(), r.id);
      });
      (userRolesRes.data || []).forEach((ur: any) => {
        if (ur.user_id && ur.role_id) {
          existingUserRoles.add(`${ur.user_id.toLowerCase().trim()}:${ur.role_id.toLowerCase().trim()}`);
        }
      });
      (profilesRes.data || []).forEach((p: any) => {
        if (p.id) existingProfiles.add(p.id.toLowerCase().trim());
      });
      (storeAssignRes.data || []).forEach((sa: any) => {
        if (sa.user_id && sa.store_id) {
          existingStoreAssignments.add(`${sa.user_id.toLowerCase().trim()}:${sa.store_id.toLowerCase().trim()}`);
        }
      });
      (whAssignRes.data || []).forEach((wa: any) => {
        if (wa.user_id && wa.warehouse_id) {
          existingWarehouseAssignments.add(`${wa.user_id.toLowerCase().trim()}:${wa.warehouse_id.toLowerCase().trim()}`);
        }
      });
    } catch (err) {
      console.warn("Failed to pre-fetch existing unique keys (non-fatal):", err);
    }

    const skuMap = new Map<string, string>();
    const categoryNameMap = new Map<string, string>();
    const importSuffix = Math.floor(Math.random() * 9000 + 1000).toString(36).toUpperCase(); // e.g. "H7B2"

    // Helper: remap all UUID fields in a row
    const remapRow = (row: any, overrides: Record<string, any> = {}): any => {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === "id" || k.endsWith("_id") || k === "user_id" || k === "owner_id" || k === "shared_with") {
          if (typeof v === "string" && uuidMap.has(v)) {
            result[k] = uuidMap.get(v)!;
          } else if (k === "company_id") {
            result[k] = newCompanyId; // Always remap company_id
          } else {
            result[k] = v; // Non-UUID or null
          }
        } else {
          result[k] = v;
        }
      }
      return { ...result, ...overrides };
    };

    // 1. Insert company_profiles
    report("importing", "Creating company profile…", 10);
    const rawCompany = manifest.data["company_profiles"]?.[0];
    if (!rawCompany) {
      return { ok: false, message: "Backup has no company profile data." };
    }

    const newCompanyRow = {
      ...remapRow(rawCompany),
      id: newCompanyId,
      owner_id: newUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error: companyErr } = await supabase.from("company_profiles").insert(newCompanyRow);
    if (companyErr) {
      console.error("company_profiles insert error:", companyErr);
      return { ok: false, message: `Failed to create company: ${companyErr.message}` };
    }

    // 2. Promote new user to Super Admin
    report("importing", "Setting up admin role…", 15);
    await supabase.rpc("promote_to_super_admin", { _user_id: newUserId });
    await supabase.from("profiles").update({ company_id: newCompanyId }).eq("id", newUserId);

    // 3. Insert all other tables in order
    const orderedTables = [
      // Settings & config (must be first — other tables may reference roles)
      "roles",
      "user_roles",
      "receipt_templates",
      "app_settings",
      // Org structure
      "stores",
      "warehouses",
      "departments",
      "user_store_assignments",
      "user_warehouse_assignments",
      // Inventory
      "inventory_categories",
      "inventory_items",
      "stock_adjustments",
      // Supply chain
      "suppliers",
      "purchase_orders",
      "purchase_order_items",
      "stock_transfers",
      "stock_transfer_items",
      // Customers
      "customers",
      "customer_payments",
      "loyalty_transactions",
      // Sales
      "sales_transactions",
      "sales_transaction_items",
      "sales_returns",
      "sales_return_items",
      // Financial
      "expenses",
      "categories",
      "invoices",
      "invoice_items",
      // Documents (children after parent documents table)
      "document_folders",
      "documents",
      "document_shares",
      // Workflows & approvals
      "workflow_templates",
      "workflows",
      "workflow_step_history",
      "approvals",
      "permission_change_requests",
      // Chat (children after parent chat_channels)
      "chat_channels",
      "chat_channel_members",
      "chat_messages",
      "chat_document_links",
      // Notifications
      "notifications",
      // Audit log & sessions (historical — insert last to avoid FK issues)
      "audit_log",
      "user_sessions",
      // Reports & integrations
      "saved_reports",
      "generated_reports",
      "integration_configs",
    ];

    // User fields to handle
    const USER_FIELDS = new Set([
      "user_id", "owner_id", "shared_with", "sender_id", "manager_id", "head_id",
      "cashier_id", "processed_by", "adjusted_by", "requester", "approved_by",
      "created_by", "updated_by", "acted_by", "reviewed_by", "author",
      "generated_by", "requested_by"
    ]);

    // User fields that are NOT NULL in their respective tables
    const NOT_NULL_USER_FIELDS: Record<string, Set<string>> = {
      company_profiles: new Set(["owner_id"]),
      user_roles: new Set(["user_id"]),
      user_store_assignments: new Set(["user_id"]),
      user_warehouse_assignments: new Set(["user_id"]),
      user_sessions: new Set(["user_id"]),
      notifications: new Set(["user_id"]),
      document_shares: new Set(["shared_with"]),
      chat_channel_members: new Set(["user_id"]),
      chat_messages: new Set(["sender_id"]),
      permission_change_requests: new Set(["requested_by"]),
    };

    for (let i = 0; i < orderedTables.length; i++) {
      const table = orderedTables[i];
      const rows: any[] = manifest.data[table] ?? [];
      if (rows.length === 0) continue;

      const percent = Math.round(20 + (i / orderedTables.length) * 75);
      report("importing", `Restoring ${table} (${rows.length} rows)…`, percent);

      // Resolve table-specific unique key conflicts
      let finalRows = rows;
      if (table === "roles") {
        const insertable = [];
        for (const row of rows) {
          const nameLower = row.name ? row.name.toLowerCase().trim() : "";
          if (existingRoles.has(nameLower)) {
            uuidMap.set(row.id, existingRoles.get(nameLower)!);
          } else {
            insertable.push(row);
          }
        }
        finalRows = insertable;
      } else if (table === "user_roles") {
        const insertable = [];
        const seenInBatch = new Set<string>();
        for (const row of rows) {
          const userId = uuidMap.get(row.user_id) || row.user_id;
          const roleId = uuidMap.get(row.role_id) || row.role_id;
          const key = `${userId.toLowerCase().trim()}:${roleId.toLowerCase().trim()}`;
          if (!existingUserRoles.has(key) && !seenInBatch.has(key)) {
            insertable.push(row);
            seenInBatch.add(key);
          }
        }
        finalRows = insertable;
      } else if (table === "profiles") {
        const insertable = [];
        for (const row of rows) {
          const profileId = uuidMap.get(row.id) || row.id;
          if (!existingProfiles.has(profileId.toLowerCase().trim())) {
            insertable.push(row);
          }
        }
        finalRows = insertable;
      } else if (table === "user_store_assignments") {
        const insertable = [];
        const seenInBatch = new Set<string>();
        for (const row of rows) {
          const userId = uuidMap.get(row.user_id) || row.user_id;
          const storeId = uuidMap.get(row.store_id) || row.store_id;
          const key = `${userId.toLowerCase().trim()}:${storeId.toLowerCase().trim()}`;
          if (!existingStoreAssignments.has(key) && !seenInBatch.has(key)) {
            insertable.push(row);
            seenInBatch.add(key);
          }
        }
        finalRows = insertable;
      } else if (table === "user_warehouse_assignments") {
        const insertable = [];
        const seenInBatch = new Set<string>();
        for (const row of rows) {
          const userId = uuidMap.get(row.user_id) || row.user_id;
          const warehouseId = uuidMap.get(row.warehouse_id) || row.warehouse_id;
          const key = `${userId.toLowerCase().trim()}:${warehouseId.toLowerCase().trim()}`;
          if (!existingWarehouseAssignments.has(key) && !seenInBatch.has(key)) {
            insertable.push(row);
            seenInBatch.add(key);
          }
        }
        finalRows = insertable;
      } else if (table === "inventory_categories") {
        finalRows = rows.map(row => {
          if (!row.name) return row;
          const newName = `${row.name}-${importSuffix}`;
          categoryNameMap.set(row.name, newName);
          return { ...row, name: newName };
        });
      } else if (table === "categories") {
        finalRows = rows.map(row => {
          if (!row.name) return row;
          const newName = `${row.name}-${importSuffix}`;
          categoryNameMap.set(row.name, newName);
          return { ...row, name: newName };
        });
      } else if (table === "inventory_items") {
        finalRows = rows.map(row => {
          if (!row.sku) return row;
          const newSku = `${row.sku}-${importSuffix}`;
          skuMap.set(row.sku, newSku);
          return { ...row, sku: newSku };
        });
      } else if (table === "purchase_orders") {
        finalRows = rows.map(row => {
          if (!row.po_number) return row;
          return { ...row, po_number: `${row.po_number}-${importSuffix}` };
        });
      } else if (table === "sales_transactions") {
        finalRows = rows.map(row => {
          if (!row.transaction_number) return row;
          return { ...row, transaction_number: `${row.transaction_number}-${importSuffix}` };
        });
      } else if (table === "stock_transfers") {
        finalRows = rows.map(row => {
          if (!row.transfer_number) return row;
          return { ...row, transfer_number: `${row.transfer_number}-${importSuffix}` };
        });
      }

      if (finalRows.length === 0) continue;

      const remapped = finalRows.map((row) => {
        let rowToProcess = row;
        // Remap sku if it was modified due to conflict
        if (skuMap.size > 0 && row.sku && skuMap.has(row.sku)) {
          rowToProcess = { ...row, sku: skuMap.get(row.sku) };
        }
        // Remap category name if it was modified due to conflict
        if (categoryNameMap.size > 0 && row.category && categoryNameMap.has(row.category)) {
          rowToProcess = { ...rowToProcess, category: categoryNameMap.get(row.category) };
        }
        // Remap categories array if present (e.g. in suppliers)
        if (categoryNameMap.size > 0 && Array.isArray(rowToProcess.categories)) {
          rowToProcess = {
            ...rowToProcess,
            categories: rowToProcess.categories.map((c: string) => categoryNameMap.get(c) || c)
          };
        }

        const overrides: Record<string, any> = {};
        // Only inject company_id if this table actually has that column
        // (child tables like chat_channel_members, chat_messages don't have it directly)
        const noCompanyIdTables = new Set([
          "roles",
          "user_roles",
          "user_store_assignments",
          "user_warehouse_assignments",
          "stock_adjustments",
          "purchase_order_items",
          "stock_transfer_items",
          "sales_transaction_items",
          "sales_returns",
          "sales_return_items",
          "invoice_items",
          "document_shares",
          "workflow_step_history",
          "chat_channel_members",
          "chat_messages",
          "chat_document_links",
          "user_sessions",
        ]);
        if (!noCompanyIdTables.has(table)) overrides.company_id = newCompanyId;

        const r = remapRow(rowToProcess, overrides);

        // Standardize user field handling to avoid foreign key violations
        for (const [k, v] of Object.entries(r)) {
          if (USER_FIELDS.has(k)) {
            if (v === newUserId) {
              continue;
            }
            const isNotNull = NOT_NULL_USER_FIELDS[table]?.has(k);
            if (isNotNull) {
              r[k] = newUserId; // Fallback to new user to satisfy NOT NULL constraints
            } else {
              r[k] = null; // Set to null to avoid FK errors
            }
          }
        }

        // Strip device-specific and non-portable fields from sessions and audit log
        if (table === "user_sessions" || table === "audit_log") {
          if ("ip_address" in r) r.ip_address = null;
          if ("user_agent" in r) r.user_agent = null;
        }

        return r;
      });

      // Insert in batches of 100 to avoid request size limits
      for (let b = 0; b < remapped.length; b += 100) {
        const batch = remapped.slice(b, b + 100);
        
        // Special case: app_settings might have been auto-generated by a database trigger.
        // Delete them first to prevent unique constraint violations on (company_id, key).
        if (table === "app_settings" && b === 0) {
          await supabase.from("app_settings").delete().eq("company_id", newCompanyId);
        }

        let error;
        if (table === "roles") {
           // Roles are global in the database, upsert by name
           const { error: upsertErr } = await supabase.from(table as any).upsert(batch, { onConflict: "name" });
           error = upsertErr;
        } else {
           const { error: insertErr } = await supabase.from(table as any).insert(batch);
           error = insertErr;
        }

        if (error) {
          console.warn(`[Backup Import] ${table} batch error (non-fatal):`, error.message);
          // Continue — don't fail the whole import on a single table
        }
      }
    }

    report("done", "Backup restored successfully!", 100);
    return { ok: true, message: "Company data restored successfully.", companyId: newCompanyId };
  } catch (err: any) {
    console.error("[Backup Import] Fatal error:", err);
    return { ok: false, message: err?.message ?? "Unknown error during import." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse a .vitepbak file and return its manifest (for preview)
// ─────────────────────────────────────────────────────────────────────────────

export async function previewBackupFile(file: File): Promise<{
  ok: boolean;
  manifest?: BackupManifest;
  message?: string;
}> {
  try {
    const text = await file.text();
    const manifest: BackupManifest = JSON.parse(text);
    if (manifest.app !== "VITE POS" || manifest.version !== "1.0") {
      return { ok: false, message: "This file is not a valid VITE POS backup." };
    }
    return { ok: true, manifest };
  } catch {
    return { ok: false, message: "Could not read file. Make sure it is a .vitepbak file." };
  }
}
