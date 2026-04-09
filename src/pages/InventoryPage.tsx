import { useState, useMemo, useCallback, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Package, Warehouse, ArrowRightLeft, Search, Filter, Plus, AlertTriangle,
  CheckCircle2, TrendingDown, TrendingUp, MoreHorizontal, MapPin, Box,
  ArrowRight, Clock, Eye, ArrowUpDown, ArrowUp, ArrowDown, X, Check, Trash2, Edit2,
  Tag, ShieldCheck, XCircle, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useSharedData, InventoryItem, CategoryType } from "@/hooks/use-shared-data";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import { useAudit } from "@/hooks/use-audit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OrgWarehouse } from "@/hooks/use-shared-data";

type Tab = "stock" | "warehouses" | "transfers" | "categories";

interface Transfer {
  id: string; dbId: string; items: string; from: string; to: string; fromId: string | null; toId: string | null; initiated: string; eta: string; status: "in_transit" | "pending" | "delivered"; requester: string;
}

const statusConfig = {
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
  low: { label: "Low Stock", className: "bg-warning/10 text-warning" },
  ok: { label: "In Stock", className: "bg-success/10 text-success" },
  operational: { label: "Operational", className: "bg-success/10 text-success" },
  maintenance: { label: "Maintenance", className: "bg-warning/10 text-warning" },
  in_transit: { label: "In Transit", className: "bg-info/10 text-info" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  delivered: { label: "Delivered", className: "bg-success/10 text-success" },
};

const barColors = ["hsl(172,66%,50%)", "hsl(205,80%,55%)", "hsl(38,92%,50%)", "hsl(152,60%,45%)"];

export default function InventoryPage() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQty, warehouses: orgWarehouses, warehouseNames, categories, addCategory, approveCategory, rejectCategory, deleteCategory, inventoryCategories, expenseCategories } = useSharedData();
  const { addNotification, addApprovalItem } = useAppEvents();
  const { formatCurrency, hasPermission } = useAppSettings();
  const { user } = useAuth();
  const { logAction } = useAudit();
  const [tab, setTab] = useState<Tab>("stock");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Fetch transfers from DB
  useEffect(() => {
    const fetchTransfers = async () => {
      setTransfersLoading(true);
      const { data } = await supabase
        .from("stock_transfers")
        .select("*, stock_transfer_items(*), from_wh:warehouses!stock_transfers_from_warehouse_id_fkey(name), to_wh:warehouses!stock_transfers_to_warehouse_id_fkey(name)")
        .order("created_at", { ascending: false });

      if (data) {
        const profilesRes = await supabase.from("profiles").select("id, name");
        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.name || "Unknown"]));

        setTransfers(data.map((t: any) => {
          const items = (t.stock_transfer_items || []).map((i: any) => `${i.name} ×${i.qty}`).join(", ");
          return {
            id: t.transfer_number,
            dbId: t.id,
            items: items || "Items",
            from: (t.from_wh as any)?.name || "Unknown",
            to: (t.to_wh as any)?.name || "Unknown",
            fromId: t.from_warehouse_id,
            toId: t.to_warehouse_id,
            initiated: new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            eta: t.eta ? new Date(t.eta).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD",
            status: t.status as Transfer["status"],
            requester: t.requester ? (profileMap.get(t.requester) || "Unknown") : "System",
          };
        }));
      }
      setTransfersLoading(false);
    };
    fetchTransfers();
  }, []);

  const stats = useMemo(() => {
    const totalSkus = inventory.length;
    const lowAlerts = inventory.filter((i) => i.status === "critical" || i.status === "low").length;
    const activeTransfers = transfers.filter((t) => t.status === "in_transit" || t.status === "pending").length;
    const totalValue = inventory.reduce((s, i) => s + i.qty * i.price, 0);
    return [
      { label: "Total SKUs", value: totalSkus.toLocaleString(), change: `+${totalSkus}`, trend: "up" as const, icon: Package },
      { label: "Inventory Value", value: formatCurrency(totalValue), change: "+4.2%", trend: "up" as const, icon: Warehouse },
      { label: "Low Stock Alerts", value: lowAlerts.toString(), change: `+${lowAlerts}`, trend: "down" as const, icon: AlertTriangle },
      { label: "Active Transfers", value: activeTransfers.toString(), change: "0", trend: "up" as const, icon: ArrowRightLeft },
    ];
  }, [inventory, transfers, formatCurrency]);

  const allTabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "stock", label: "Stock Levels", icon: Package },
    { key: "warehouses", label: "Warehouses", icon: Warehouse },
    { key: "transfers", label: "Transfers", icon: ArrowRightLeft },
    { key: "categories", label: "Categories", icon: Tag },
  ];

  const tabPermMap: Record<Tab, string> = { stock: "pages.inventory.stock", warehouses: "pages.inventory.warehouses", transfers: "pages.inventory.transfers", categories: "pages.inventory.categories" };
  const tabs = useMemo(() => allTabs.filter(t => hasPermission(tabPermMap[t.key] as any)), [hasPermission]);

  const addTransfer = async (tr: Transfer) => {
    // Save to DB
    const { data: tNum } = await supabase.rpc("generate_transfer_number");
    const transferNumber = tNum || `TRF-${Date.now()}`;
    const fromWh = orgWarehouses.find(w => w.name === tr.from);
    const toWh = orgWarehouses.find(w => w.name === tr.to);

    const { data: newTransfer, error } = await supabase.from("stock_transfers").insert({
      transfer_number: transferNumber,
      from_warehouse_id: fromWh?.id || null,
      to_warehouse_id: toWh?.id || null,
      status: "pending" as any,
      requester: user?.id || null,
      notes: tr.items,
    }).select().single();

    if (newTransfer && !error) {
      setTransfers(prev => [{ ...tr, id: transferNumber, dbId: newTransfer.id }, ...prev]);
      addApprovalItem({
        title: `Transfer: ${tr.items}`,
        type: "stock_transfer",
        sourceId: newTransfer.id,
        requester: user?.name || "You",
        department: "Inventory",
        amount: null,
        description: `${tr.items} from ${tr.from} to ${tr.to}`,
        priority: "medium",
      });
      addNotification({ type: "inventory", title: `Transfer ${transferNumber} created`, message: `${tr.items} from ${tr.from} → ${tr.to}`, link: "/approvals" });
      toast.success("Transfer created");
    }
  };

  const updateTransferStatus = async (id: string, status: Transfer["status"]) => {
    const tr = transfers.find(t => t.id === id);
    if (!tr) return;
    await supabase.from("stock_transfers").update({ status: status as any }).eq("id", tr.dbId);
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (status === "delivered") {
      addNotification({ type: "inventory", title: `Transfer ${id} delivered`, message: "Stock has been received at destination", link: "/inventory" });
      toast.success("Transfer marked as delivered");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">Track stock levels, manage warehouses, and monitor transfers.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            {tab === "stock" ? "Add Item" : tab === "warehouses" ? "Add Warehouse" : "New Transfer"}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className="w-4 h-4 text-primary" /></div>
                <div className={`flex items-center gap-1 text-xs font-medium ${s.label === "Low Stock Alerts" ? "text-destructive" : s.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}<span>{s.change}</span>
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {tab === "stock" && <StockTab items={inventory} onDelete={deleteInventoryItem} onAdjustQty={adjustInventoryQty} onEdit={setEditingItem} formatCurrency={formatCurrency} />}
        {tab === "warehouses" && <WarehouseTab warehouses={orgWarehouses} />}
        {tab === "transfers" && <TransferTab transfers={transfers} onUpdateStatus={updateTransferStatus} onAdd={addTransfer} />}
        {tab === "categories" && (
          <CategoriesTab
            categories={categories}
            onAdd={(name, type, desc) => {
              const isAdmin = user?.role === "Super Admin" || user?.role === "Admin";
              addCategory({ name, type, description: desc, status: isAdmin ? "approved" : "pending", createdBy: user?.name || "System" });
              if (!isAdmin) {
                addApprovalItem({ title: `New Category: ${name}`, type: "workflow", sourceId: `CAT-${Date.now()}`, requester: user?.name || "You", department: "Inventory", amount: null, description: `Request to add "${name}" as ${type} category`, priority: "medium" });
                addNotification({ type: "approval", title: "Category pending approval", message: `"${name}" needs admin approval`, link: "/inventory", targetRoles: ["Admin", "Super Admin"] });
              }
              logAction("category.add", "Categories", name, `Added ${type} category: ${name} (${isAdmin ? "auto-approved" : "pending"})`);
            }}
            onApprove={(id) => { approveCategory(id, user?.name || "Admin"); logAction("category.approve", "Categories", id, "Approved category"); }}
            onReject={(id) => { rejectCategory(id); logAction("category.reject", "Categories", id, "Rejected category"); }}
            onDelete={(id) => { deleteCategory(id); logAction("category.delete", "Categories", id, "Deleted category"); }}
            userRole={user?.role || "Viewer"}
          />
        )}
      </div>

      {showAddModal && tab === "stock" && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Add Stock Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <AddItemForm onAdd={(item) => { addInventoryItem(item); setShowAddModal(false); }} onCancel={() => setShowAddModal(false)} />
          </div>
        </div>
      )}

      {showAddModal && tab === "transfers" && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">New Transfer</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <NewTransferForm inventoryItems={inventory} onAdd={(tr) => { addTransfer(tr); setShowAddModal(false); }} onCancel={() => setShowAddModal(false)} />
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Edit Item: {editingItem.name}</h3>
              <button onClick={() => setEditingItem(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <EditItemForm item={editingItem} onSave={(updates) => { updateInventoryItem(editingItem.sku, updates); setEditingItem(null); }} onCancel={() => setEditingItem(null)} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function EditItemForm({ item, onSave, onCancel }: { item: InventoryItem; onSave: (updates: Partial<InventoryItem>) => void; onCancel: () => void }) {
  const { warehouseNames, inventoryCategories } = useSharedData();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [warehouse, setWarehouse] = useState(item.warehouse);
  const [qty, setQty] = useState(item.qty.toString());
  const [reorder, setReorder] = useState(item.reorder.toString());
  const [costPrice, setCostPrice] = useState((item.costPrice || 0).toString());
  const [price, setPrice] = useState(item.price.toString());
  const [barcode, setBarcode] = useState(item.barcode || "");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">SKU</label><Input value={item.sku} disabled className="mt-1 opacity-60" /></div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Barcode</label>
        <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Enter or scan barcode" className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {inventoryCategories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">Warehouse</label>
          <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {warehouseNames.length > 0 ? warehouseNames.map(w => <option key={w}>{w}</option>) : <option>No warehouses</option>}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Qty</label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Reorder Point</label><Input type="number" value={reorder} onChange={(e) => setReorder(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Cost Price</label><Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Selling Price</label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
        <button onClick={() => onSave({ name, category, warehouse, qty: parseInt(qty), reorder: parseInt(reorder), costPrice: parseFloat(costPrice), price: parseFloat(price), barcode: barcode || undefined })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save</button>
      </div>
    </div>
  );
}

function AddItemForm({ onAdd, onCancel }: { onAdd: (item: InventoryItem) => void; onCancel: () => void }) {
  const { warehouseNames, inventoryCategories } = useSharedData();
  const [name, setName] = useState(""); const [sku, setSku] = useState(""); const [category, setCategory] = useState(inventoryCategories[0] || "Uncategorized");
  const [warehouse, setWarehouse] = useState(warehouseNames[0] || ""); const [qty, setQty] = useState(""); const [reorder, setReorder] = useState("50"); const [costPrice, setCostPrice] = useState(""); const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");

  const generateBarcode = () => {
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
    setBarcode(digits);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">SKU</label><Input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1" /></div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Barcode</label>
        <div className="flex gap-2 mt-1">
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Enter or auto-generate" className="flex-1" />
          <button type="button" onClick={generateBarcode} className="px-3 py-2 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap">Auto</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {inventoryCategories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">Warehouse</label>
          <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {warehouseNames.length > 0 ? warehouseNames.map(w => <option key={w}>{w}</option>) : <option>No warehouses</option>}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Qty</label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Reorder Point</label><Input type="number" value={reorder} onChange={(e) => setReorder(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Cost Price</label><Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Selling Price</label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
        <button disabled={!name || !sku || !qty || !price}
          onClick={() => {
            const q = parseInt(qty); const r = parseInt(reorder);
            const status: InventoryItem["status"] = q <= r * 0.3 ? "critical" : q <= r ? "low" : "ok";
            onAdd({ name, sku, category, warehouse, qty: q, reorder: r, costPrice: parseFloat(costPrice || "0"), price: parseFloat(price), status, barcode: barcode || undefined });
          }}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">Add Item</button>
      </div>
    </div>
  );
}

function NewTransferForm({ inventoryItems, onAdd, onCancel }: { inventoryItems: InventoryItem[]; onAdd: (tr: Transfer) => void; onCancel: () => void }) {
  const { warehouseNames } = useSharedData();
  const [selectedItem, setSelectedItem] = useState(inventoryItems[0]?.sku || "");
  const [transferQty, setTransferQty] = useState("10");
  const [from, setFrom] = useState(warehouseNames[0] || ""); const [to, setTo] = useState(warehouseNames[1] || "");
  const wh = warehouseNames;
  const item = inventoryItems.find(i => i.sku === selectedItem);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Select Item</label>
        <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {inventoryItems.map(i => <option key={i.sku} value={i.sku}>{i.name} ({i.sku}) — {i.qty} in stock</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Quantity</label>
        <Input type="number" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} className="mt-1" max={item?.qty} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">From</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">{wh.map((w) => <option key={w}>{w}</option>)}</select>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">To</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">{wh.filter((w) => w !== from).map((w) => <option key={w}>{w}</option>)}</select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
        <button disabled={!selectedItem || !transferQty} onClick={() => onAdd({
          id: "", dbId: "", items: `${item?.name || "Item"} ×${transferQty}`, from, to,
          fromId: null, toId: null,
          initiated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          eta: "TBD", status: "pending", requester: "You"
        })}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">Create Transfer</button>
      </div>
    </div>
  );
}

function StockTab({ items, onDelete, onAdjustQty, onEdit, formatCurrency }: {
  items: InventoryItem[]; onDelete: (sku: string) => void; onAdjustQty: (sku: string, delta: number) => void;
  onEdit: (item: InventoryItem) => void; formatCurrency: (n: number) => string;
}) {
  const [search, setSearch] = useState(""); const [filterCategory, setFilterCategory] = useState("all"); const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "qty" | "price" | null>(null); const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [customQty, setCustomQty] = useState<Record<string, string>>({});

  const categories = [...new Set(items.map((i) => i.category))];
  const warehouseNames = [...new Set(items.map((i) => i.warehouse))];
  const activeFilterCount = [filterCategory, filterWarehouse, filterStatus].filter((f) => f !== "all").length;

  const handleSort = (key: "name" | "qty" | "price") => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: "name" | "qty" | "price" }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      const matchSearch = search === "" || item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
      return matchSearch && (filterCategory === "all" || item.category === filterCategory) && (filterWarehouse === "all" || item.warehouse === filterWarehouse) && (filterStatus === "all" || item.status === filterStatus);
    });
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = sortKey === "name" ? a.name.localeCompare(b.name) : sortKey === "qty" ? a.qty - b.qty : a.price - b.price;
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return result;
  }, [items, search, filterCategory, filterWarehouse, filterStatus, sortKey, sortDir]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => { map[i.category] = (map[i.category] || 0) + i.qty; });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [items]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search by SKU, name, or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${showFilters || activeFilterCount > 0 ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <Filter className="w-4 h-4" />Filter
          {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 animate-fade-in">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground outline-none">
            <option value="all">All Categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground outline-none">
            <option value="all">All Warehouses</option>{warehouseNames.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground outline-none">
            <option value="all">All Statuses</option><option value="critical">Critical</option><option value="low">Low Stock</option><option value="ok">In Stock</option>
          </select>
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterCategory("all"); setFilterWarehouse("all"); setFilterStatus("all"); }} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10">
              <X className="w-3.5 h-3.5" />Clear
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">Item <SortIcon col="name" /></div>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">SKU</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Warehouse</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("qty")}>
                    <div className="flex items-center gap-1 justify-end">Qty <SortIcon col="qty" /></div>
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Cost</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3 cursor-pointer hover:text-foreground hidden sm:table-cell" onClick={() => handleSort("price")}>
                    <div className="flex items-center gap-1 justify-end">Price <SortIcon col="price" /></div>
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-sm text-muted-foreground">No items match filters.</td></tr>
                ) : filtered.map((item) => {
                  const sc = statusConfig[item.status];
                  const isExpanded = expandedSku === item.sku;
                  return (
                    <>
                      <tr key={item.sku} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => setExpandedSku(isExpanded ? null : item.sku)}>
                        <td className="px-5 py-3"><p className="text-sm font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.category}</p></td>
                        <td className="px-5 py-3 text-xs font-mono text-primary">{item.sku}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{item.warehouse}</td>
                        <td className="px-5 py-3 text-right"><span className={`text-sm font-semibold ${item.status === "critical" ? "text-destructive" : item.status === "low" ? "text-warning" : "text-foreground"}`}>{item.qty}</span></td>
                        <td className="px-5 py-3 text-right text-sm text-muted-foreground hidden lg:table-cell">{formatCurrency(item.costPrice || 0)}</td>
                        <td className="px-5 py-3 text-right text-sm text-foreground hidden sm:table-cell">{formatCurrency(item.price)}</td>
                        <td className="px-5 py-3 text-center"><span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{item.status === "critical" && <AlertTriangle className="w-3 h-3" />}{sc.label}</span></td>
                        <td className="px-3 py-3 text-right"><MoreHorizontal className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" /></td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${item.sku}-actions`} className="bg-muted/20">
                          <td colSpan={8} className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                              <span className="text-xs text-muted-foreground">Reorder point: {item.reorder}</span>
                              <div className="flex items-center gap-1 ml-2">
                                <Input type="number" placeholder="Qty" value={customQty[item.sku] || ""} onChange={(e) => setCustomQty(prev => ({ ...prev, [item.sku]: e.target.value }))} className="w-20 h-7 text-xs" />
                                <button onClick={(e) => { e.stopPropagation(); const q = parseInt(customQty[item.sku] || "0"); if (q) onAdjustQty(item.sku, q); }} className="text-xs px-2 py-1 rounded bg-success/10 text-success font-medium hover:bg-success/20">+ Add</button>
                                <button onClick={(e) => { e.stopPropagation(); const q = parseInt(customQty[item.sku] || "0"); if (q) onAdjustQty(item.sku, -q); }} className="text-xs px-2 py-1 rounded bg-warning/10 text-warning font-medium hover:bg-warning/20">- Remove</button>
                              </div>
                              <div className="ml-auto flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-xs px-2 py-1 rounded bg-info/10 text-info font-medium hover:bg-info/20"><Edit2 className="w-3 h-3 inline mr-1" />Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(item.sku); }} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive font-medium hover:bg-destructive/20"><Trash2 className="w-3 h-3 inline mr-1" />Delete</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-1">By Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Stock distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} barSize={24}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
              <Tooltip contentStyle={{ background: "hsl(222,22%,11%)", border: "1px solid hsl(220,18%,18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210,20%,92%)" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>{categoryData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-5 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-3"><AlertTriangle className="w-3.5 h-3.5" />Critical Stock</h4>
            <div className="space-y-2">
              {items.filter((i) => i.status === "critical").map((item) => (
                <div key={item.sku} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div><p className="text-xs font-medium text-foreground">{item.name}</p><p className="text-[10px] text-muted-foreground">{item.sku} · {item.warehouse}</p></div>
                  <span className="text-sm font-bold text-destructive">{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarehouseTab({ warehouses }: { warehouses: OrgWarehouse[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
      {warehouses.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-10">No warehouses configured. Add warehouses in Organization → Warehouses.</p>}
      {warehouses.map((wh) => {
        const capacityColor = wh.capacity >= 85 ? "bg-destructive" : wh.capacity >= 60 ? "bg-warning" : "bg-success";
        return (
          <div key={wh.id} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Warehouse className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{wh.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><MapPin className="w-3 h-3" />{wh.location}</div>
                </div>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">Operational</span>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-muted-foreground">Capacity</span><span className="font-semibold text-foreground">{wh.capacity}%</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${capacityColor} transition-all duration-500`} style={{ width: `${wh.capacity}%` }} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2.5 rounded-lg bg-muted/50"><Box className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-sm font-bold text-foreground">{wh.sqft || "—"}</p><p className="text-[10px] text-muted-foreground">Sq. Ft.</p></div>
              <div className="text-center p-2.5 rounded-lg bg-muted/50"><MapPin className="w-4 h-4 text-info mx-auto mb-1" /><p className="text-sm font-bold text-foreground">{wh.zones}</p><p className="text-[10px] text-muted-foreground">Zones</p></div>
              <div className="text-center p-2.5 rounded-lg bg-muted/50"><Eye className="w-4 h-4 text-warning mx-auto mb-1" /><p className="text-sm font-bold text-foreground truncate">{wh.manager ? wh.manager.split(" ")[0] : "—"}</p><p className="text-[10px] text-muted-foreground">Manager</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransferTab({ transfers, onUpdateStatus, onAdd }: { transfers: Transfer[]; onUpdateStatus: (id: string, status: Transfer["status"]) => void; onAdd: (tr: Transfer) => void }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => transfers.filter((t) => !search || t.id.toLowerCase().includes(search.toLowerCase()) || t.items.toLowerCase().includes(search.toLowerCase())), [transfers, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search transfers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map((tr) => {
          const sc = statusConfig[tr.status];
          return (
            <div key={tr.id} className="glass-card rounded-xl p-5 hover:bg-card/90 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tr.status === "in_transit" ? "bg-info/10" : tr.status === "pending" ? "bg-warning/10" : "bg-success/10"}`}>
                    <ArrowRightLeft className={`w-5 h-5 ${tr.status === "in_transit" ? "text-info" : tr.status === "pending" ? "text-warning" : "text-success"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-primary">{tr.id}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{tr.items}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{tr.from}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{tr.to}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-muted-foreground">By {tr.requester}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 justify-end"><Clock className="w-3 h-3" />{tr.eta}</div>
                  <div className="flex gap-1.5 mt-2 justify-end">
                    {tr.status === "pending" && <button onClick={() => onUpdateStatus(tr.id, "in_transit")} className="text-[10px] px-2 py-1 rounded bg-info/10 text-info font-medium hover:bg-info/20">Start Transit</button>}
                    {tr.status === "in_transit" && <button onClick={() => onUpdateStatus(tr.id, "delivered")} className="text-[10px] px-2 py-1 rounded bg-success/10 text-success font-medium hover:bg-success/20">Mark Delivered</button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoriesTab({ categories, onAdd, onApprove, onReject, onDelete, userRole }: {
  categories: import("@/hooks/use-shared-data").Category[];
  onAdd: (name: string, type: CategoryType, desc: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  userRole: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("inventory");
  const [newDesc, setNewDesc] = useState("");
  const [filterType, setFilterType] = useState<"all" | CategoryType>("all");

  const isAdmin = userRole === "Super Admin" || userRole === "Admin";
  const filtered = categories.filter(c => filterType === "all" || c.type === filterType);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newType, newDesc.trim());
    setNewName(""); setNewDesc(""); setShowAdd(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All Types</option>
            <option value="inventory">Inventory</option>
            <option value="expense">Expense</option>
            <option value="general">General</option>
          </select>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />New Category
        </button>
      </div>

      {showAdd && (
        <div className="glass-card rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Create Category</h4>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          {!isAdmin && (
            <div className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg">
              Categories created by non-admin users require approval before they can be used.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Category name" value={newName} onChange={e => setNewName(e.target.value)} />
            <select value={newType} onChange={e => setNewType(e.target.value as CategoryType)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="inventory">Inventory</option>
              <option value="expense">Expense</option>
              <option value="general">General</option>
            </select>
            <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          </div>
          <button onClick={handleAdd} disabled={!newName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isAdmin ? "Create & Approve" : "Submit for Approval"}
          </button>
        </div>
      )}

      <div className="glass-card rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Description</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 hidden md:table-cell">Created By</th>
                {isAdmin && <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(cat => (
                <tr key={cat.id} className="border-b border-border/50">
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{cat.name}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cat.type === "inventory" ? "bg-primary/10 text-primary" : cat.type === "expense" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                      {cat.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground hidden sm:table-cell">{cat.description || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cat.status === "approved" ? "bg-success/10 text-success" : cat.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                      {cat.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{cat.createdBy}{cat.approvedBy && cat.status === "approved" ? ` · ✓ ${cat.approvedBy}` : ""}</td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {cat.status === "pending" && (
                          <>
                            <button onClick={() => onApprove(cat.id)} className="p-1 rounded hover:bg-success/10 text-success transition-colors" title="Approve">
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                            <button onClick={() => onReject(cat.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {cat.createdBy !== "System" && (
                          <button onClick={() => onDelete(cat.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
