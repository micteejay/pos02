import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface InventoryItem {
  id?: string;
  sku: string; name: string; category: string; warehouse: string; qty: number; reorder: number; costPrice: number; price: number; status: "critical" | "low" | "ok";
  warehouseId?: string;
  categoryId?: string;
}

export interface SaleRecord {
  id: string; items: { name: string; sku: string; qty: number; price: number }[]; total: number; customer: string; method: string; date: string; store: string; createdBy: string; createdByRole: string;
}

export interface SharedDocument {
  id: string; name: string; type: "pdf" | "xlsx" | "docx" | "png" | "jpg" | "folder" | "txt"; size: string; modified: string; author: string; folder: string; source?: string;
}

export interface OrgStore {
  id: string; name: string; type: string; address: string; phone: string; email: string; status: string; employees: number; revenue: string; createdBy?: string;
}

export interface OrgWarehouse {
  id: string; name: string; location: string; capacity: number; sqft: string; manager: string; managerId?: string | null; zones: number; activePicks: number;
}

export interface OrgDepartment {
  id: string; name: string; head: string; headcount: number; budget: string; teams: string[];
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  store: string;
  createdBy: string;
  createdByRole: string;
  recurring: boolean;
  recurringInterval?: "daily" | "weekly" | "monthly" | "yearly";
  nextDueDate?: string;
  parentId?: string;
}

export type CategoryType = "inventory" | "expense" | "general";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
  status: "approved" | "pending" | "rejected";
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
}

interface SharedDataContextType {
  inventory: InventoryItem[];
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (sku: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (sku: string) => void;
  adjustInventoryQty: (sku: string, delta: number) => void;
  addStockFromPO: (items: { name: string; qty: number; unitPrice: number }[], warehouse: string) => void;
  sales: SaleRecord[];
  addSale: (sale: Omit<SaleRecord, "id" | "date">) => void;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  categories: Category[];
  addCategory: (cat: Omit<Category, "id" | "createdAt">) => void;
  approveCategory: (id: string, approvedBy: string) => void;
  rejectCategory: (id: string) => void;
  deleteCategory: (id: string) => void;
  inventoryCategories: string[];
  expenseCategories: string[];
  documents: SharedDocument[];
  addDocument: (doc: Omit<SharedDocument, "id">) => void;
  deleteDocument: (id: string) => void;
  stores: OrgStore[];
  addStore: (store: Omit<OrgStore, "id">) => void;
  updateStore: (id: string, updates: Partial<OrgStore>) => void;
  deleteStore: (id: string) => void;
  warehouses: OrgWarehouse[];
  addWarehouse: (wh: Omit<OrgWarehouse, "id">) => void;
  updateWarehouse: (id: string, updates: Partial<OrgWarehouse>) => void;
  deleteWarehouse: (id: string) => void;
  departments: OrgDepartment[];
  addDepartment: (dept: Omit<OrgDepartment, "id">) => void;
  updateDepartment: (id: string, updates: Partial<OrgDepartment>) => void;
  deleteDepartment: (id: string) => void;
  warehouseNames: string[];
  storeNames: string[];
  departmentNames: string[];
  loading: boolean;
  refreshData: () => void;
}

const SharedDataContext = createContext<SharedDataContextType>(null!);

export function SharedDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [stores, setStores] = useState<OrgStore[]>([]);
  const [warehouses, setWarehouses] = useState<OrgWarehouse[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [invRes, salesRes, expRes, catRes, docRes, storeRes, whRes, deptRes] = await Promise.all([
        supabase.from("inventory_items").select("*").order("created_at", { ascending: false }),
        supabase.from("sales_transactions").select("*, sales_transaction_items(*)").order("created_at", { ascending: false }).limit(200),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("categories").select("*").order("created_at", { ascending: false }),
        supabase.from("documents").select("*").order("updated_at", { ascending: false }),
        supabase.from("stores").select("*").order("name"),
        supabase.from("warehouses").select("*").order("name"),
        supabase.from("departments").select("*").order("name"),
      ]);

      if (invRes.data) {
        setInventory(invRes.data.map(i => ({
          id: i.id, sku: i.sku, name: i.name, category: i.category || "Uncategorized",
          warehouse: "", // will be resolved by warehouse name if needed
          qty: i.qty, reorder: i.reorder_point, costPrice: Number(i.cost_price) || 0,
          price: Number(i.price), status: i.status as InventoryItem["status"],
          warehouseId: i.warehouse_id || undefined, categoryId: i.category_id || undefined,
        })));
      }

      if (salesRes.data) {
        setSales(salesRes.data.map(s => ({
          id: s.transaction_number,
          items: ((s as any).sales_transaction_items || []).map((si: any) => ({
            name: si.name, sku: si.sku || "", qty: si.qty, price: Number(si.price),
          })),
          total: Number(s.total), customer: s.customer_name || "Walk-in",
          method: s.payment_method, date: s.created_at,
          store: "", createdBy: "", createdByRole: "",
        })));
      }

      if (expRes.data) {
        setExpenses(expRes.data.map(e => ({
          id: e.id, category: e.category, description: e.description,
          amount: Number(e.amount), date: e.date, store: "",
          createdBy: "", createdByRole: "",
          recurring: e.recurring || false,
          recurringInterval: (e.recurring_interval as any) || undefined,
          nextDueDate: e.next_due_date || undefined,
          parentId: e.parent_id || undefined,
        })));
      }

      if (catRes.data) {
        setCategories(catRes.data.map(c => ({
          id: c.id, name: c.name, type: c.type as CategoryType,
          description: c.description || undefined,
          status: c.status as Category["status"],
          createdBy: c.created_by || "", createdAt: c.created_at,
          approvedBy: c.approved_by || undefined,
        })));
      }

      if (docRes.data) {
        setDocuments(docRes.data.map(d => ({
          id: d.id, name: d.name, type: d.type as SharedDocument["type"],
          size: d.size_display || "0 KB", modified: d.updated_at,
          author: d.author || "", folder: d.folder_path || "/",
          source: d.source || undefined,
        })));
      }

      // Fetch profiles for manager/head resolution and employee counts
      const { data: profilesData } = await supabase.from("profiles").select("id, name, store_id, department_id");
      const profileMap = new Map((profilesData || []).map(p => [p.id, p.name || "Unknown"]));

      if (storeRes.data) {
        setStores(storeRes.data.map(s => {
          const statusMap: Record<string, string> = { active: "Active", maintenance: "Maintenance", closed: "Closed" };
          const employeeCount = (profilesData || []).filter(p => p.store_id === s.id).length;
          return {
            id: s.id, name: s.name, type: s.type, address: s.address || "",
            phone: s.phone || "", email: s.email || "",
            status: statusMap[s.status] || s.status,
            employees: employeeCount,
            revenue: "$0/mo",
            createdBy: s.manager_id ? profileMap.get(s.manager_id) || "" : "",
          };
        }));
      }

      if (whRes.data) {
        setWarehouses(whRes.data.map(w => ({
          id: w.id, name: w.name, location: w.location || "",
          capacity: w.capacity || 0, sqft: w.sqft || "0",
          manager: w.manager_id ? profileMap.get(w.manager_id) || "Unassigned" : "Unassigned",
          zones: w.zones || 0, activePicks: 0,
        })));
      }

      if (deptRes.data) {
        setDepartments(deptRes.data.map(d => {
          const headcount = (profilesData || []).filter(p => p.department_id === d.id).length;
          return {
            id: d.id, name: d.name,
            head: d.head_id ? profileMap.get(d.head_id) || "Unassigned" : "Unassigned",
            headcount,
            budget: d.budget ? `$${Number(d.budget).toLocaleString()}` : "$0",
            teams: d.teams || [],
          };
        }));
      }

      // Resolve warehouse names for inventory
      if (whRes.data && invRes.data) {
        const whMap = new Map(whRes.data.map(w => [w.id, w.name]));
        setInventory(prev => prev.map(item => ({
          ...item,
          warehouse: item.warehouseId ? (whMap.get(item.warehouseId) || "") : "",
        })));
      }
    } catch (err) {
      console.error("Error fetching shared data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Inventory ---
  const addInventoryItem = useCallback(async (item: InventoryItem) => {
    const whId = warehouses.find(w => w.name === item.warehouse)?.id || null;
    const { data, error } = await supabase.from("inventory_items").insert({
      sku: item.sku, name: item.name, category: item.category,
      warehouse_id: whId, qty: item.qty, reorder_point: item.reorder,
      cost_price: item.costPrice, price: item.price,
    }).select().single();
    if (data && !error) {
      setInventory(prev => [{ ...item, id: data.id, warehouseId: whId || undefined }, ...prev]);
    }
  }, [warehouses]);

  const updateInventoryItem = useCallback(async (sku: string, updates: Partial<InventoryItem>) => {
    const existing = inventory.find(i => i.sku === sku);
    if (!existing?.id) return;
    const whId = updates.warehouse ? warehouses.find(w => w.name === updates.warehouse)?.id : undefined;
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.qty !== undefined) payload.qty = updates.qty;
    if (updates.reorder !== undefined) payload.reorder_point = updates.reorder;
    if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
    if (updates.price !== undefined) payload.price = updates.price;
    if (whId !== undefined) payload.warehouse_id = whId;

    await supabase.from("inventory_items").update(payload).eq("id", existing.id);
    setInventory(prev => prev.map(i => {
      if (i.sku !== sku) return i;
      const updated = { ...i, ...updates };
      if (updated.qty <= updated.reorder * 0.3) updated.status = "critical";
      else if (updated.qty <= updated.reorder) updated.status = "low";
      else updated.status = "ok";
      return updated;
    }));
  }, [inventory, warehouses]);

  const deleteInventoryItem = useCallback(async (sku: string) => {
    const existing = inventory.find(i => i.sku === sku);
    if (existing?.id) {
      await supabase.from("inventory_items").delete().eq("id", existing.id);
    }
    setInventory(prev => prev.filter(i => i.sku !== sku));
  }, [inventory]);

  const adjustInventoryQty = useCallback(async (sku: string, delta: number) => {
    const existing = inventory.find(i => i.sku === sku);
    if (!existing?.id) return;
    const newQty = Math.max(0, existing.qty + delta);
    await supabase.from("inventory_items").update({ qty: newQty }).eq("id", existing.id);
    setInventory(prev => prev.map(i => {
      if (i.sku !== sku) return i;
      const status: InventoryItem["status"] = newQty <= i.reorder * 0.3 ? "critical" : newQty <= i.reorder ? "low" : "ok";
      return { ...i, qty: newQty, status };
    }));
  }, [inventory]);

  const addStockFromPO = useCallback(async (items: { name: string; qty: number; unitPrice: number }[], warehouse: string) => {
    // This is handled by the DB trigger on PO received now, but also update local state
    fetchAll();
  }, [fetchAll]);

  // --- Sales ---
  const addSale = useCallback(async (sale: Omit<SaleRecord, "id" | "date">) => {
    const storeId = stores.find(s => s.name === sale.store)?.id || null;
    const { data: txnNum } = await supabase.rpc("generate_txn_number");
    const txnNumber = txnNum || `TXN-${Date.now()}`;

    const { data, error } = await supabase.from("sales_transactions").insert({
      transaction_number: txnNumber,
      customer_name: sale.customer || "Walk-in",
      payment_method: sale.method === "card" ? "Credit Card" : sale.method === "cash" ? "Cash" : sale.method === "mobile" ? "Mobile Pay" : sale.method,
      subtotal: sale.total, tax: 0, total: sale.total,
      store_id: storeId, cashier_id: user?.id || null,
      status: "completed",
    }).select().single();

    if (data && !error) {
      // Insert line items
      const lineItems = sale.items.map(item => ({
        transaction_id: data.id,
        name: item.name, sku: item.sku, qty: item.qty,
        price: item.price, total: item.price * item.qty,
        inventory_item_id: inventory.find(i => i.sku === item.sku)?.id || null,
      }));
      await supabase.from("sales_transaction_items").insert(lineItems);

      setSales(prev => [{
        id: txnNumber, items: sale.items, total: sale.total,
        customer: sale.customer, method: sale.method,
        date: new Date().toISOString(), store: sale.store,
        createdBy: sale.createdBy, createdByRole: sale.createdByRole,
      }, ...prev]);
    }
  }, [stores, user, inventory]);

  // --- Expenses ---
  const addExpense = useCallback(async (expense: Omit<Expense, "id">) => {
    const storeId = stores.find(s => s.name === expense.store)?.id || null;
    const { data, error } = await supabase.from("expenses").insert({
      category: expense.category, description: expense.description,
      amount: expense.amount, date: expense.date || new Date().toISOString(),
      store_id: storeId, created_by: user?.id || null,
      recurring: expense.recurring, recurring_interval: expense.recurringInterval || null,
      next_due_date: expense.nextDueDate || null,
    }).select().single();

    if (data && !error) {
      setExpenses(prev => [{ ...expense, id: data.id }, ...prev]);
    }
  }, [stores, user]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    const payload: any = {};
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.recurring !== undefined) payload.recurring = updates.recurring;
    await supabase.from("expenses").update(payload).eq("id", id);
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // --- Categories ---
  const addCategory = useCallback(async (cat: Omit<Category, "id" | "createdAt">) => {
    const { data, error } = await supabase.from("categories").insert({
      name: cat.name, type: cat.type as any, description: cat.description || null,
      status: cat.status as any, created_by: user?.id || null,
    }).select().single();
    if (data && !error) {
      setCategories(prev => [...prev, { ...cat, id: data.id, createdAt: data.created_at }]);
    }
  }, [user]);

  const approveCategory = useCallback(async (id: string, approvedBy: string) => {
    await supabase.from("categories").update({ status: "approved" as any, approved_by: user?.id || null }).eq("id", id);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, status: "approved" as const, approvedBy } : c));
  }, [user]);

  const rejectCategory = useCallback(async (id: string) => {
    await supabase.from("categories").update({ status: "rejected" as any }).eq("id", id);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, status: "rejected" as const } : c));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const inventoryCategories = categories.filter(c => c.type === "inventory" && c.status === "approved").map(c => c.name);
  const expenseCategories = categories.filter(c => c.type === "expense" && c.status === "approved").map(c => c.name);

  // --- Documents ---
  const addDocument = useCallback(async (doc: Omit<SharedDocument, "id">) => {
    const { data, error } = await supabase.from("documents").insert({
      name: doc.name, type: doc.type as any, size_display: doc.size,
      folder_path: doc.folder, author: user?.id || null, source: doc.source || null,
    }).select().single();
    if (data && !error) {
      setDocuments(prev => [...prev, { ...doc, id: data.id }]);
    }
  }, [user]);

  const deleteDocument = useCallback(async (id: string) => {
    await supabase.from("documents").delete().eq("id", id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  // --- Stores ---
  const addStore = useCallback(async (store: Omit<OrgStore, "id">) => {
    const statusMap: Record<string, string> = { Active: "active", Maintenance: "maintenance", Closed: "closed" };
    const { data, error } = await supabase.from("stores").insert({
      name: store.name, type: store.type, address: store.address || null,
      phone: store.phone || null, email: store.email || null,
      status: (statusMap[store.status] || store.status.toLowerCase()) as any,
    }).select().single();
    if (data && !error) {
      setStores(prev => [...prev, { ...store, id: data.id }]);
    }
  }, []);

  const updateStore = useCallback(async (id: string, updates: Partial<OrgStore>) => {
    const statusMap: Record<string, string> = { Active: "active", Maintenance: "maintenance", Closed: "closed" };
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.status !== undefined) payload.status = statusMap[updates.status] || updates.status.toLowerCase();
    await supabase.from("stores").update(payload).eq("id", id);
    setStores(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteStore = useCallback(async (id: string) => {
    await supabase.from("stores").delete().eq("id", id);
    setStores(prev => prev.filter(s => s.id !== id));
  }, []);

  // --- Warehouses ---
  const addWarehouse = useCallback(async (wh: Omit<OrgWarehouse, "id">) => {
    const { data, error } = await supabase.from("warehouses").insert({
      name: wh.name, location: wh.location || null,
      capacity: wh.capacity || null, sqft: wh.sqft || null,
      zones: wh.zones || null,
      manager_id: wh.managerId || null,
    }).select().single();
    if (data && !error) {
      setWarehouses(prev => [...prev, { ...wh, id: data.id }]);
    }
  }, []);

  const updateWarehouse = useCallback(async (id: string, updates: Partial<OrgWarehouse>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.capacity !== undefined) payload.capacity = updates.capacity;
    if (updates.sqft !== undefined) payload.sqft = updates.sqft;
    if (updates.zones !== undefined) payload.zones = updates.zones;
    await supabase.from("warehouses").update(payload).eq("id", id);
    setWarehouses(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const deleteWarehouse = useCallback(async (id: string) => {
    await supabase.from("warehouses").delete().eq("id", id);
    setWarehouses(prev => prev.filter(w => w.id !== id));
  }, []);

  // --- Departments ---
  const addDepartment = useCallback(async (dept: Omit<OrgDepartment, "id">) => {
    const { data, error } = await supabase.from("departments").insert({
      name: dept.name, budget: parseFloat(dept.budget) || 0,
      teams: dept.teams || [],
    }).select().single();
    if (data && !error) {
      setDepartments(prev => [...prev, { ...dept, id: data.id }]);
    }
  }, []);

  const updateDepartment = useCallback(async (id: string, updates: Partial<OrgDepartment>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.budget !== undefined) payload.budget = parseFloat(updates.budget as string) || 0;
    if (updates.teams !== undefined) payload.teams = updates.teams;
    await supabase.from("departments").update(payload).eq("id", id);
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    await supabase.from("departments").delete().eq("id", id);
    setDepartments(prev => prev.filter(d => d.id !== id));
  }, []);

  const warehouseNames = warehouses.map(w => w.name);
  const storeNames = stores.map(s => s.name);
  const departmentNames = departments.map(d => d.name);

  return (
    <SharedDataContext.Provider value={{
      inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQty, addStockFromPO,
      sales, addSale,
      categories, addCategory, approveCategory, rejectCategory, deleteCategory, inventoryCategories, expenseCategories,
      expenses, addExpense, updateExpense, deleteExpense,
      documents, addDocument, deleteDocument,
      stores, addStore, updateStore, deleteStore,
      warehouses, addWarehouse, updateWarehouse, deleteWarehouse,
      departments, addDepartment, updateDepartment, deleteDepartment,
      warehouseNames, storeNames, departmentNames,
      loading, refreshData: fetchAll,
    }}>
      {children}
    </SharedDataContext.Provider>
  );
}

export function useSharedData() {
  return useContext(SharedDataContext);
}
