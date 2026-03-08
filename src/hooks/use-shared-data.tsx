import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface InventoryItem {
  sku: string; name: string; category: string; warehouse: string; qty: number; reorder: number; costPrice: number; price: number; status: "critical" | "low" | "ok";
}

export interface SaleRecord {
  id: string; items: { name: string; sku: string; qty: number; price: number }[]; total: number; customer: string; method: string; date: string; store: string; createdBy: string; createdByRole: string;
}

export interface SharedDocument {
  id: string; name: string; type: "pdf" | "xlsx" | "docx" | "png" | "jpg" | "folder" | "txt"; size: string; modified: string; author: string; folder: string; source?: string;
}

export interface OrgStore {
  id: number; name: string; type: string; address: string; phone: string; email: string; status: string; employees: number; revenue: string; createdBy?: string;
}

export interface OrgWarehouse {
  id: number; name: string; location: string; capacity: number; sqft: string; manager: string; zones: number; activePicks: number;
}

export interface OrgDepartment {
  id: number; name: string; head: string; headcount: number; budget: string; teams: string[];
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
  parentId?: string; // links generated entries back to the recurring template
}

interface SharedDataContextType {
  // Inventory
  inventory: InventoryItem[];
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (sku: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (sku: string) => void;
  adjustInventoryQty: (sku: string, delta: number) => void;
  addStockFromPO: (items: { name: string; qty: number; unitPrice: number }[], warehouse: string) => void;

  // Sales
  sales: SaleRecord[];
  addSale: (sale: Omit<SaleRecord, "id" | "date">) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Documents
  documents: SharedDocument[];
  addDocument: (doc: Omit<SharedDocument, "id">) => void;
  deleteDocument: (id: string) => void;

  // Organization
  stores: OrgStore[];
  addStore: (store: Omit<OrgStore, "id">) => void;
  updateStore: (id: number, updates: Partial<OrgStore>) => void;
  deleteStore: (id: number) => void;

  warehouses: OrgWarehouse[];
  addWarehouse: (wh: Omit<OrgWarehouse, "id">) => void;
  updateWarehouse: (id: number, updates: Partial<OrgWarehouse>) => void;
  deleteWarehouse: (id: number) => void;

  departments: OrgDepartment[];
  addDepartment: (dept: Omit<OrgDepartment, "id">) => void;
  updateDepartment: (id: number, updates: Partial<OrgDepartment>) => void;
  deleteDepartment: (id: number) => void;

  // Helpers
  warehouseNames: string[];
  storeNames: string[];
  departmentNames: string[];
}

const SharedDataContext = createContext<SharedDataContextType>(null!);

function calcStatus(qty: number, reorder: number): InventoryItem["status"] {
  if (qty <= reorder * 0.3) return "critical";
  if (qty <= reorder) return "low";
  return "ok";
}

export function SharedDataProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [stores, setStores] = useState<OrgStore[]>([]);
  const [warehouses, setWarehouses] = useState<OrgWarehouse[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);

  // Inventory
  const addInventoryItem = useCallback((item: InventoryItem) => {
    setInventory(prev => [...prev, item]);
  }, []);

  const updateInventoryItem = useCallback((sku: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => {
      if (i.sku !== sku) return i;
      const updated = { ...i, ...updates };
      updated.status = calcStatus(updated.qty, updated.reorder);
      return updated;
    }));
  }, []);

  const deleteInventoryItem = useCallback((sku: string) => {
    setInventory(prev => prev.filter(i => i.sku !== sku));
  }, []);

  const adjustInventoryQty = useCallback((sku: string, delta: number) => {
    setInventory(prev => prev.map(i => {
      if (i.sku !== sku) return i;
      const newQty = Math.max(0, i.qty + delta);
      return { ...i, qty: newQty, status: calcStatus(newQty, i.reorder) };
    }));
  }, []);

  const addStockFromPO = useCallback((items: { name: string; qty: number; unitPrice: number }[], warehouse: string) => {
    setInventory(prev => {
      const updated = [...prev];
      items.forEach(poItem => {
        const existing = updated.find(i => i.name.toLowerCase() === poItem.name.toLowerCase());
        if (existing) {
          existing.qty += poItem.qty;
          existing.status = calcStatus(existing.qty, existing.reorder);
        } else {
          const sku = `NEW-${Date.now().toString(36).toUpperCase().slice(-4)}`;
          updated.push({
            sku, name: poItem.name, category: "Uncategorized", warehouse,
            qty: poItem.qty, reorder: Math.ceil(poItem.qty * 0.3), costPrice: poItem.unitPrice, price: poItem.unitPrice,
            status: "ok",
          });
        }
      });
      return updated;
    });
  }, []);

  // Sales - now includes createdBy
  const addSale = useCallback((sale: Omit<SaleRecord, "id" | "date">) => {
    setSales(prev => [{
      ...sale,
      id: `TXN-${9300 + prev.length + Math.floor(Math.random() * 100)}`,
      date: new Date().toISOString(),
    }, ...prev]);
  }, []);

  // Expenses
  const addExpense = useCallback((expense: Omit<Expense, "id">) => {
    const newExpense: Expense = { ...expense, id: `EXP-${Date.now()}` };
    // If recurring, calculate the next due date
    if (newExpense.recurring && newExpense.recurringInterval && !newExpense.nextDueDate) {
      newExpense.nextDueDate = calcNextDueDate(new Date(), newExpense.recurringInterval).toISOString();
    }
    setExpenses(prev => [newExpense, ...prev]);
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Process recurring expenses — generates new entries when due
  const processRecurringExpenses = useCallback(() => {
    setExpenses(prev => {
      const now = new Date();
      const newEntries: Expense[] = [];
      const updated = prev.map(exp => {
        if (!exp.recurring || !exp.recurringInterval || !exp.nextDueDate) return exp;
        const dueDate = new Date(exp.nextDueDate);
        if (dueDate > now) return exp;
        // Generate the expense entry
        newEntries.push({
          id: `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: exp.category,
          description: `${exp.description} (auto)`,
          amount: exp.amount,
          date: dueDate.toISOString(),
          store: exp.store,
          createdBy: "System",
          createdByRole: "System",
          recurring: false,
          parentId: exp.id,
        });
        // Advance the next due date
        return { ...exp, nextDueDate: calcNextDueDate(dueDate, exp.recurringInterval!).toISOString() };
      });
      if (newEntries.length === 0) return prev;
      return [...newEntries, ...updated];
    });
  }, []);

  // Auto-process recurring expenses on mount and every minute
  useEffect(() => {
    processRecurringExpenses();
    const interval = setInterval(processRecurringExpenses, 60_000);
    return () => clearInterval(interval);
  }, [processRecurringExpenses]);

  // Documents
  const addDocument = useCallback((doc: Omit<SharedDocument, "id">) => {
    setDocuments(prev => [...prev, { ...doc, id: `doc-${Date.now()}` }]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  // Organization - Stores
  const addStore = useCallback((store: Omit<OrgStore, "id">) => {
    setStores(prev => [...prev, { ...store, id: Date.now() }]);
  }, []);

  const updateStore = useCallback((id: number, updates: Partial<OrgStore>) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteStore = useCallback((id: number) => {
    setStores(prev => prev.filter(s => s.id !== id));
  }, []);

  // Organization - Warehouses
  const addWarehouse = useCallback((wh: Omit<OrgWarehouse, "id">) => {
    setWarehouses(prev => [...prev, { ...wh, id: Date.now() }]);
  }, []);

  const updateWarehouse = useCallback((id: number, updates: Partial<OrgWarehouse>) => {
    setWarehouses(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const deleteWarehouse = useCallback((id: number) => {
    setWarehouses(prev => prev.filter(w => w.id !== id));
  }, []);

  // Organization - Departments
  const addDepartment = useCallback((dept: Omit<OrgDepartment, "id">) => {
    setDepartments(prev => [...prev, { ...dept, id: Date.now() }]);
  }, []);

  const updateDepartment = useCallback((id: number, updates: Partial<OrgDepartment>) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const deleteDepartment = useCallback((id: number) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
  }, []);

  // Derived helpers
  const warehouseNames = warehouses.map(w => w.name);
  const storeNames = stores.map(s => s.name);
  const departmentNames = departments.map(d => d.name);

  return (
    <SharedDataContext.Provider value={{
      inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQty, addStockFromPO,
      sales, addSale,
      expenses, addExpense, updateExpense, deleteExpense,
      documents, addDocument, deleteDocument,
      stores, addStore, updateStore, deleteStore,
      warehouses, addWarehouse, updateWarehouse, deleteWarehouse,
      departments, addDepartment, updateDepartment, deleteDepartment,
      warehouseNames, storeNames, departmentNames,
    }}>
      {children}
    </SharedDataContext.Provider>
  );
}

export function useSharedData() {
  return useContext(SharedDataContext);
}
