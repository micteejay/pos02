import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LocalCustomerRepository } from "@/lib/repositories";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  totalSpend: number;
  totalOrders: number;
  lastPurchaseAt: string | null;
  createdAt: string;
  outstanding_balance?: number;
  loyalty_points?: number;
}

function mapRow(r: any): Customer {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    city: r.city,
    notes: r.notes,
    totalSpend: Number(r.total_spend) || 0,
    totalOrders: r.total_orders || 0,
    lastPurchaseAt: r.last_purchase_at,
    createdAt: r.created_at,
    outstanding_balance: Number(r.outstanding_balance) || 0,
    loyalty_points: Number(r.loyalty_points) || 0,
  };
}

let customersHasPulledOnBoot = false;

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;
    const useOnline = !isTauriEnv || isOnline;

    if (useOnline) {
      const { data } = await supabase.from("customers").select("*").order("name", { ascending: true });
      const mapped = (data || []).map(mapRow);

      if (isTauriEnv && data) {
        try {
          const { getDb } = await import("@/lib/db");
          const db = await getDb();
          for (const c of data) {
            await db.execute(
              `INSERT OR REPLACE INTO customers (id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at, outstanding_balance, loyalty_points) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [c.id, c.name, c.email, c.phone, c.address, c.city, c.notes, c.total_spend || 0, c.total_orders || 0, c.last_purchase_at, c.created_at, c.outstanding_balance || 0, c.loyalty_points || 0]
            );
          }
        } catch (e) {
          console.error("[useCustomers] SQLite cache write failed:", e);
        }
      }

      setCustomers(mapped);
      setLoading(false);
      return;
    }

    // Offline fallback for Tauri
    let localCusts = await LocalCustomerRepository.getAll();
    
    // Bootstrap / Seed SQLite customers table from remote Supabase on first run
    if (localCusts.length === 0) {
      const { data } = await supabase.from("customers").select("*").order("name", { ascending: true });
      if (data) {
        try {
          const { getDb } = await import("@/lib/db");
          const db = await getDb();
          for (const c of data) {
            await db.execute(
              `INSERT OR REPLACE INTO customers (id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at, outstanding_balance, loyalty_points) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [c.id, c.name, c.email, c.phone, c.address, c.city, c.notes, c.total_spend || 0, c.total_orders || 0, c.last_purchase_at, c.created_at, c.outstanding_balance || 0, c.loyalty_points || 0]
            );
          }
          localCusts = await LocalCustomerRepository.getAll();
        } catch (e) {
          console.error("[useCustomers] SQLite bootstrap seeding failed:", e);
        }
      }
    }
    
    setCustomers(localCusts);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Listen for cross-component aggregate bumps (sales / invoice payments)
  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener("customer-stats-updated", handler);
    return () => window.removeEventListener("customer-stats-updated", handler);
  }, [fetchAll]);

  const addCustomer = useCallback(
    async (input: Partial<Customer> & { name: string }) => {
      const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      const isOnline = typeof window !== "undefined" && window.navigator.onLine;

      if (isTauriEnv && !isOnline) {
        const c = await LocalCustomerRepository.insert(input, user?.companyId || null, user?.id || null);
        setCustomers((prev) => [c, ...prev]);
        return { ok: true as const, customer: c };
      }

      const id = input.id || crypto.randomUUID();
      const { data, error } = await supabase
        .from("customers")
        .insert({
          id,
          name: input.name.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          address: input.address?.trim() || null,
          city: input.city?.trim() || null,
          notes: input.notes?.trim() || null,
          company_id: user?.companyId || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error || !data) return { ok: false as const, error: error?.message };
      const c = mapRow(data);

      if (isTauriEnv) {
        try {
          const { getDb } = await import("@/lib/db");
          const db = await getDb();
          await db.execute(
            `INSERT OR REPLACE INTO customers (id, name, email, phone, address, city, notes, total_spend, total_orders, last_purchase_at, created_at, outstanding_balance, loyalty_points) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, c.name, c.email, c.phone, c.address, c.city, c.notes, 0, 0, null, c.createdAt, 0, 0]
          );
        } catch (e) {
          console.error("[addCustomer] SQLite write failed:", e);
        }
      }

      setCustomers((prev) => [c, ...prev]);
      return { ok: true as const, customer: c };
    },
    [user]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: Partial<Customer>) => {
      const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      const isOnline = typeof window !== "undefined" && window.navigator.onLine;

      if (isTauriEnv && !isOnline) {
        await LocalCustomerRepository.update(id, updates);
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
        return { ok: true as const };
      }

      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.email !== undefined) payload.email = updates.email || null;
      if (updates.phone !== undefined) payload.phone = updates.phone || null;
      if (updates.address !== undefined) payload.address = updates.address || null;
      if (updates.city !== undefined) payload.city = updates.city || null;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      
      const { error } = await supabase.from("customers").update(payload).eq("id", id);
      if (error) return { ok: false as const, error: error.message };

      if (isTauriEnv) {
        try {
          const { getDb } = await import("@/lib/db");
          const db = await getDb();
          const existing = await db.select<any[]>("SELECT * FROM customers WHERE id = ?", [id]);
          if (existing.length > 0) {
            const current = existing[0];
            const name = updates.name !== undefined ? updates.name : current.name;
            const email = updates.email !== undefined ? updates.email : current.email;
            const phone = updates.phone !== undefined ? updates.phone : current.phone;
            const address = updates.address !== undefined ? updates.address : current.address;
            const city = updates.city !== undefined ? updates.city : current.city;
            const notes = updates.notes !== undefined ? updates.notes : current.notes;
            await db.execute(
              `UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, notes = ? WHERE id = ?`,
              [name, email, phone, address, city, notes, id]
            );
          }
        } catch (e) {
          console.error("[updateCustomer] SQLite update failed:", e);
        }
      }

      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      return { ok: true as const };
    },
    []
  );

  const deleteCustomer = useCallback(async (id: string) => {
    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;

    if (isTauriEnv && !isOnline) {
      const { getDb } = await import("@/lib/db");
      const { enqueueSync } = await import("@/lib/sync-engine");
      const db = await getDb();
      await db.execute("DELETE FROM customers WHERE id = ?", [id]);
      await enqueueSync("customers", "DELETE", { id });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      return;
    }

    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) {
      if (isTauriEnv) {
        try {
          const { getDb } = await import("@/lib/db");
          const db = await getDb();
          await db.execute("DELETE FROM customers WHERE id = ?", [id]);
        } catch (e) {
          console.error("[deleteCustomer] SQLite delete failed:", e);
        }
      }
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  /** Recompute totals from sales_transactions for this company. Useful after backfilling links. */
  const recomputeStats = useCallback(async () => {
    const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    const isOnline = typeof window !== "undefined" && window.navigator.onLine;
    const useOnline = !isTauriEnv || isOnline;

    if (!useOnline) {
      try {
        const { getDb } = await import("@/lib/db");
        const db = await getDb();
        const txs = await db.select<any[]>(
          "SELECT customer_id, total, created_at FROM sales_transactions WHERE customer_id IS NOT NULL"
        );
        const agg = new Map<string, { spend: number; orders: number; last: string }>();
        txs.forEach((t: any) => {
          const cur = agg.get(t.customer_id) || { spend: 0, orders: 0, last: "" };
          cur.spend += Number(t.total) || 0;
          cur.orders += 1;
          if (!cur.last || t.created_at > cur.last) cur.last = t.created_at;
          agg.set(t.customer_id, cur);
        });

        for (const [id, v] of Array.from(agg.entries())) {
          await db.execute(
            "UPDATE customers SET total_spend = ?, total_orders = ?, last_purchase_at = ? WHERE id = ?",
            [v.spend, v.orders, v.last || null, id]
          );
        }
        await fetchAll();
      } catch (e) {
        console.error("[recomputeStats] Offline stats recompute failed:", e);
      }
      return;
    }

    if (!user?.companyId) return;
    const { data: txs } = await supabase
      .from("sales_transactions")
      .select("customer_id,total,created_at")
      .eq("company_id", user.companyId)
      .not("customer_id", "is", null);
    const agg = new Map<string, { spend: number; orders: number; last: string }>();
    (txs || []).forEach((t: any) => {
      const cur = agg.get(t.customer_id) || { spend: 0, orders: 0, last: "" };
      cur.spend += Number(t.total) || 0;
      cur.orders += 1;
      if (!cur.last || t.created_at > cur.last) cur.last = t.created_at;
      agg.set(t.customer_id, cur);
    });
    await Promise.all(
      Array.from(agg.entries()).map(([id, v]) =>
        supabase.from("customers").update({
          total_spend: v.spend,
          total_orders: v.orders,
          last_purchase_at: v.last || null,
        }).eq("id", id)
      )
    );
    // Write back updated stats to SQLite cache
    if (isTauriEnv) {
      try {
        const { getDb } = await import("@/lib/db");
        const db = await getDb();
        for (const [id, v] of Array.from(agg.entries())) {
          await db.execute(
            "UPDATE customers SET total_spend = ?, total_orders = ?, last_purchase_at = ? WHERE id = ?",
            [v.spend, v.orders, v.last || null, id]
          );
        }
      } catch (e) {
        console.error("[recomputeStats] SQLite write back failed:", e);
      }
    }
    await fetchAll();
  }, [user, fetchAll]);

  /**
   * Find an existing customer matching name/phone/email, or create one. Used by POS / Invoice.
   */
  const findOrCreate = useCallback(
    async (input: { name: string; phone?: string; email?: string }) => {
      const name = input.name.trim();
      if (!name || name.toLowerCase() === "walk-in") return null;
      const phone = input.phone?.trim();
      const email = input.email?.trim();
      const match = customers.find(
        (c) =>
          (phone && c.phone && c.phone === phone) ||
          (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
          c.name.toLowerCase() === name.toLowerCase()
      );
      if (match) return match;
      const created = await addCustomer({ name, phone, email });
      return created.ok ? created.customer : null;
    },
    [customers, addCustomer]
  );

  const getById = useCallback((id?: string | null) => customers.find((c) => c.id === id) || null, [customers]);

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, findOrCreate, recomputeStats, getById, refresh: fetchAll };
}