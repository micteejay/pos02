import { supabase } from "@/integrations/supabase/client";
import { getDb } from "./db";

let isProcessingQueue = false;

/**
 * Enqueues a write operation into the local sync_queue for background processing.
 */
export async function enqueueSync(tableName: string, action: "INSERT" | "UPDATE" | "DELETE" | "RPC", payload: any): Promise<void> {
  try {
    const db = await getDb();
    const payloadStr = JSON.stringify(payload);
    const now = new Date().toISOString();
    
    await db.execute(
      "INSERT INTO sync_queue (table_name, action, payload, created_at) VALUES (?, ?, ?, ?)",
      [tableName, action, payloadStr, now]
    );
    console.log(`[SyncEngine] Enqueued sync job: ${action} on ${tableName}`);
    
    // Trigger queue processing asynchronously
    void triggerSync();
  } catch (error) {
    console.error("[SyncEngine] Failed to enqueue sync job:", error);
  }
}

/**
 * Processes the queue of pending offline mutations, applying them to Supabase.
 */
export async function triggerSync(): Promise<void> {
  if (isProcessingQueue) return;
  
  // Verify network connection
  if (typeof window !== "undefined" && !window.navigator.onLine) {
    console.log("[SyncEngine] Device is offline. Postponing synchronization.");
    return;
  }

  isProcessingQueue = true;
  console.log("[SyncEngine] Starting synchronization queue processing...");

  try {
    const db = await getDb();
    // Retrieve jobs in chronological order
    const jobs = await db.select(
      "SELECT id, table_name, action, payload FROM sync_queue ORDER BY id ASC"
    );

    if (jobs.length === 0) {
      console.log("[SyncEngine] No pending mutations in outbox.");
      isProcessingQueue = false;
      return;
    }

    console.log(`[SyncEngine] Found ${jobs.length} pending mutations to synchronize.`);

    for (const job of jobs) {
      let payload;
      try {
        payload = JSON.parse(job.payload);
      } catch (err) {
        console.error("[SyncEngine] Corrupt payload in job:", job.id, err);
        // Delete corrupt job so it doesn't block the queue
        await db.execute("DELETE FROM sync_queue WHERE id = ?", [job.id]);
        continue;
      }

      let success = false;
      try {
        if (job.action === "INSERT") {
          const { error } = await supabase.from(job.table_name).insert(payload);
          if (!error) success = true;
          else console.error(`[SyncEngine] Supabase insert error on ${job.table_name}:`, error);
        } else if (job.action === "UPDATE") {
          const { error } = await supabase.from(job.table_name).update(payload).eq("id", payload.id);
          if (!error) success = true;
          else console.error(`[SyncEngine] Supabase update error on ${job.table_name}:`, error);
        } else if (job.action === "DELETE") {
          const { error } = await supabase.from(job.table_name).delete().eq("id", payload.id);
          if (!error) success = true;
          else console.error(`[SyncEngine] Supabase delete error on ${job.table_name}:`, error);
        }
      } catch (err) {
        console.error(`[SyncEngine] Network/Request failure on job ${job.id}:`, err);
      }

      if (success) {
        // Remove successfully processed job
        await db.execute("DELETE FROM sync_queue WHERE id = ?", [job.id]);
        console.log(`[SyncEngine] Job ${job.id} synced successfully and removed from queue.`);
      } else {
        // Pause queue on error to preserve order and avoid data inconsistency
        console.warn(`[SyncEngine] Sync failed for job ${job.id}. Postponing remaining queue.`);
        break;
      }
    }
  } catch (error) {
    console.error("[SyncEngine] Error during queue sync run:", error);
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Syncs the local products table with remote updates from Supabase.
 */
export async function pullProductsFromCloud(): Promise<void> {
  if (typeof window !== "undefined" && !window.navigator.onLine) return;

  try {
    const db = await getDb();
    
    // Find the latest update time from our local DB
    const localResult = await db.select(
      "SELECT MAX(updated_at) as last_updated FROM products"
    );
    
    const lastUpdated = localResult[0]?.last_updated || "1970-01-01T00:00:00Z";
    
    // Fetch newly updated products from Supabase
    const { data: remoteProducts, error } = await supabase
      .from("inventory_items")
      .select("id, name, price, qty, reorder_point, sku, category, updated_at")
      .gt("updated_at", lastUpdated);
      
    if (error) {
      console.error("[SyncEngine] Failed to pull products from Supabase:", error);
      return;
    }

    if (remoteProducts && remoteProducts.length > 0) {
      console.log(`[SyncEngine] Pulling ${remoteProducts.length} new/updated products from cloud.`);
      for (const prod of remoteProducts) {
        await db.execute(
          `INSERT OR REPLACE INTO products (id, name, price, stock, reorder_level, sku, category_id, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            prod.id,
            prod.name,
            Number(prod.price),
            prod.qty,
            prod.reorder_point || 10,
            prod.sku,
            prod.category || "Uncategorized",
            prod.updated_at
          ]
        );
      }
      console.log("[SyncEngine] Local products table updated.");
    }
  } catch (error) {
    console.error("[SyncEngine] Incremental products pull failed:", error);
  }
}

/**
 * Syncs the local customers table with remote updates from Supabase.
 */
export async function pullCustomersFromCloud(): Promise<void> {
  if (typeof window !== "undefined" && !window.navigator.onLine) return;

  try {
    const db = await getDb();
    
    // Find the latest update time from our local DB using created_at
    const localResult = await db.select(
      "SELECT MAX(created_at) as last_created FROM customers"
    );
    
    const lastCreated = localResult[0]?.last_created || "1970-01-01T00:00:00Z";
    
    // Fetch newly updated/created customers from Supabase
    const { data: remoteCustomers, error } = await supabase
      .from("customers")
      .select("id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at")
      .gt("created_at", lastCreated);
      
    if (error) {
      console.error("[SyncEngine] Failed to pull customers from Supabase:", error);
      return;
    }

    if (remoteCustomers && remoteCustomers.length > 0) {
      console.log(`[SyncEngine] Pulling ${remoteCustomers.length} new/updated customers from cloud.`);
      for (const cust of remoteCustomers) {
        await db.execute(
          `INSERT OR REPLACE INTO customers (id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cust.id,
            cust.name,
            cust.email,
            cust.phone,
            cust.address,
            cust.city,
            cust.notes,
            cust.total_spend || 0,
            cust.total_orders || 0,
            cust.last_purchase_at,
            cust.created_at
          ]
        );
      }
      console.log("[SyncEngine] Local customers table updated.");
    }
  } catch (error) {
    console.error("[SyncEngine] Incremental customers pull failed:", error);
  }
}

/**
 * Registers background listeners and loops for sync handling.
 */
export function startSyncEngine() {
  if (typeof window === "undefined") return;

  // Sync outbox when device goes online
  window.addEventListener("online", async () => {
    console.log("[SyncEngine] Connection restored. Triggering sync process...");
    await triggerSync();
    await pullProductsFromCloud();
    await pullCustomersFromCloud();
  });

  // Regular periodic pulls (every 1.5 minutes) and queue flushing
  setInterval(() => {
    void triggerSync();
  }, 45000); // 45s outbox check
  
  setInterval(() => {
    void pullProductsFromCloud();
  }, 90000); // 90s products pull

  setInterval(() => {
    void pullCustomersFromCloud();
  }, 120000); // 120s customers pull
 
  // Initial checks
  setTimeout(() => {
    void triggerSync();
    void pullProductsFromCloud();
    void pullCustomersFromCloud();
  }, 3000);
  
  console.log("[SyncEngine] Background synchronization loops registered.");
}

