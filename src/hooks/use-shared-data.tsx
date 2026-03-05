import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface InventoryItem {
  sku: string; name: string; category: string; warehouse: string; qty: number; reorder: number; price: number; status: "critical" | "low" | "ok";
}

export interface SaleRecord {
  id: string; items: { name: string; sku: string; qty: number; price: number }[]; total: number; customer: string; method: string; date: string; store: string;
}

export interface SharedDocument {
  id: string; name: string; type: "pdf" | "xlsx" | "docx" | "png" | "jpg" | "folder" | "txt"; size: string; modified: string; author: string; folder: string; source?: string;
}

const initialStock: InventoryItem[] = [
  { sku: "WDG-A100", name: "Widget Alpha", category: "Components", warehouse: "Main HQ", qty: 12, reorder: 50, price: 24.99, status: "critical" },
  { sku: "WDG-B200", name: "Widget Beta", category: "Components", warehouse: "Main HQ", qty: 340, reorder: 100, price: 18.50, status: "ok" },
  { sku: "SEN-X10", name: "Sensor X10", category: "Electronics", warehouse: "West DC", qty: 45, reorder: 40, price: 89.00, status: "low" },
  { sku: "MTR-500", name: "Motor 500W", category: "Machinery", warehouse: "East DC", qty: 78, reorder: 30, price: 145.00, status: "ok" },
  { sku: "CBL-CAT6", name: "Cat6 Cable (100ft)", category: "Networking", warehouse: "Main HQ", qty: 520, reorder: 200, price: 34.99, status: "ok" },
  { sku: "PCB-R3", name: "PCB Board Rev3", category: "Electronics", warehouse: "West DC", qty: 8, reorder: 25, price: 12.75, status: "critical" },
  { sku: "FAN-120", name: "Cooling Fan 120mm", category: "Components", warehouse: "East DC", qty: 190, reorder: 100, price: 9.99, status: "ok" },
  { sku: "PSU-750", name: "PSU 750W Gold", category: "Electronics", warehouse: "Main HQ", qty: 62, reorder: 50, price: 119.00, status: "low" },
  { sku: "USB-H7", name: "USB Hub 7-Port", category: "Accessories", warehouse: "Main HQ", qty: 200, reorder: 80, price: 29.99, status: "ok" },
  { sku: "LED-5M", name: "LED Strip 5m", category: "Accessories", warehouse: "Main HQ", qty: 310, reorder: 100, price: 15.99, status: "ok" },
  { sku: "THP-10", name: "Thermal Paste 10g", category: "Components", warehouse: "Main HQ", qty: 450, reorder: 150, price: 8.49, status: "ok" },
  { sku: "NSW-8P", name: "Network Switch 8P", category: "Networking", warehouse: "Main HQ", qty: 85, reorder: 40, price: 64.99, status: "ok" },
];

const initialDocs: SharedDocument[] = [
  { id: "1", name: "Finance", type: "folder", size: "8 items", modified: "Feb 12, 2026", author: "System", folder: "/" },
  { id: "2", name: "HR Documents", type: "folder", size: "5 items", modified: "Feb 10, 2026", author: "System", folder: "/" },
  { id: "3", name: "Marketing Assets", type: "folder", size: "12 items", modified: "Feb 8, 2026", author: "System", folder: "/" },
  { id: "4", name: "Chat Attachments", type: "folder", size: "0 items", modified: "Feb 14, 2026", author: "System", folder: "/" },
  { id: "5", name: "Q4 Inventory Report.pdf", type: "pdf", size: "2.4 MB", modified: "Feb 12, 2026", author: "Sarah Chen", folder: "/" },
  { id: "6", name: "Sales Forecast 2026.xlsx", type: "xlsx", size: "1.8 MB", modified: "Feb 11, 2026", author: "Mike Ross", folder: "/" },
  { id: "7", name: "Employee Handbook v3.docx", type: "docx", size: "4.1 MB", modified: "Feb 10, 2026", author: "HR Department", folder: "/" },
  { id: "8", name: "Warehouse Layout.png", type: "png", size: "890 KB", modified: "Feb 9, 2026", author: "Lisa Park", folder: "/" },
  { id: "9", name: "Purchase Orders - Jan.pdf", type: "pdf", size: "3.2 MB", modified: "Feb 8, 2026", author: "James Wilson", folder: "/" },
  { id: "10", name: "Tax Filing 2025.pdf", type: "pdf", size: "5.1 MB", modified: "Jan 28, 2026", author: "Lisa Zhang", folder: "/Finance" },
  { id: "11", name: "Budget Overview.xlsx", type: "xlsx", size: "2.2 MB", modified: "Jan 25, 2026", author: "Lisa Zhang", folder: "/Finance" },
  { id: "12", name: "Invoice Template.docx", type: "docx", size: "340 KB", modified: "Jan 20, 2026", author: "Mark Davis", folder: "/Finance" },
  { id: "13", name: "Onboarding Checklist.docx", type: "docx", size: "520 KB", modified: "Feb 5, 2026", author: "Michael Brown", folder: "/HR Documents" },
  { id: "14", name: "Company Policy.pdf", type: "pdf", size: "1.9 MB", modified: "Feb 1, 2026", author: "HR Department", folder: "/HR Documents" },
  { id: "15", name: "Brand Guidelines.pdf", type: "pdf", size: "8.4 MB", modified: "Feb 7, 2026", author: "David Kumar", folder: "/Marketing Assets" },
  { id: "16", name: "Logo Pack.png", type: "png", size: "12 MB", modified: "Feb 6, 2026", author: "Design Team", folder: "/Marketing Assets" },
];

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

  // Documents
  documents: SharedDocument[];
  addDocument: (doc: Omit<SharedDocument, "id">) => void;
  deleteDocument: (id: string) => void;
}

const SharedDataContext = createContext<SharedDataContextType>(null!);

function calcStatus(qty: number, reorder: number): InventoryItem["status"] {
  if (qty <= reorder * 0.3) return "critical";
  if (qty <= reorder) return "low";
  return "ok";
}

export function SharedDataProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialStock);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>(initialDocs);

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
            qty: poItem.qty, reorder: Math.ceil(poItem.qty * 0.3), price: poItem.unitPrice,
            status: "ok",
          });
        }
      });
      return updated;
    });
  }, []);

  const addSale = useCallback((sale: Omit<SaleRecord, "id" | "date">) => {
    setSales(prev => [{
      ...sale,
      id: `TXN-${9300 + prev.length + Math.floor(Math.random() * 100)}`,
      date: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const addDocument = useCallback((doc: Omit<SharedDocument, "id">) => {
    setDocuments(prev => [...prev, { ...doc, id: `doc-${Date.now()}` }]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  return (
    <SharedDataContext.Provider value={{
      inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQty, addStockFromPO,
      sales, addSale,
      documents, addDocument, deleteDocument,
    }}>
      {children}
    </SharedDataContext.Provider>
  );
}

export function useSharedData() {
  return useContext(SharedDataContext);
}
