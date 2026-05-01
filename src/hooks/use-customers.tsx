import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
  };
}

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });
    setCustomers((data || []).map(mapRow));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addCustomer = useCallback(
    async (input: Partial<Customer> & { name: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
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
      setCustomers((prev) => [c, ...prev]);
      return { ok: true as const, customer: c };
    },
    [user]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: Partial<Customer>) => {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.email !== undefined) payload.email = updates.email || null;
      if (updates.phone !== undefined) payload.phone = updates.phone || null;
      if (updates.address !== undefined) payload.address = updates.address || null;
      if (updates.city !== undefined) payload.city = updates.city || null;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      const { error } = await supabase.from("customers").update(payload).eq("id", id);
      if (error) return { ok: false as const, error: error.message };
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      return { ok: true as const };
    },
    []
  );

  const deleteCustomer = useCallback(async (id: string) => {
    await supabase.from("customers").delete().eq("id", id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

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

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, findOrCreate, refresh: fetchAll };
}