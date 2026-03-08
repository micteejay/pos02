import { useState, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAppEvents } from "@/hooks/use-app-events";
import { useSharedData } from "@/hooks/use-shared-data";
import {
  Truck, Package, Search, Plus, Clock, CheckCircle2, XCircle,
  FileText, Send, Building2, DollarSign, ChevronRight, MapPin, Phone, Mail, Star,
  Users, TrendingUp, TrendingDown, X, Edit2, Trash2, RefreshCw,
} from "lucide-react";

type Tab = "orders" | "suppliers";
type POStatus = "draft" | "submitted" | "approved" | "shipped" | "received" | "cancelled";

interface PurchaseOrder {
  id: string; supplier: string; items: { name: string; qty: number; unitPrice: number }[]; status: POStatus; created: string; expectedDelivery: string; total: number; warehouse: string; notes: string; approvedBy: string | null;
}

interface Supplier {
  id: string; name: string; contact: string; email: string; phone: string; address: string; rating: number; totalOrders: number; onTimeRate: number; categories: string[]; status: "active" | "inactive";
}

const initialOrders: PurchaseOrder[] = [];
const initialSuppliers: Supplier[] = [];

const statusConfig: Record<POStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
  submitted: { label: "Submitted", className: "bg-info/10 text-info", icon: Send },
  approved: { label: "Approved", className: "bg-success/10 text-success", icon: CheckCircle2 },
  shipped: { label: "Shipped", className: "bg-primary/10 text-primary", icon: Truck },
  received: { label: "Received", className: "bg-success/10 text-success", icon: Package },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function SupplyPage() {
  const { formatCurrency } = useAppSettings();
  const { addApprovalItem, addNotification } = useAppEvents();
  const { inventory, addStockFromPO } = useSharedData();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState(initialOrders);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewPO, setShowNewPO] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const stats = useMemo(() => {
    const active = orders.filter(o => !["received", "cancelled"].includes(o.status)).length;
    const inTransit = orders.filter(o => o.status === "shipped").length;
    const totalSpend = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    return [
      { label: "Active POs", value: active.toString(), change: "", trend: "up" as const, icon: FileText },
      { label: "In Transit", value: inTransit.toString(), change: "", trend: "up" as const, icon: Truck },
      { label: "Total Spend", value: formatCurrency(totalSpend), change: "", trend: "up" as const, icon: DollarSign },
      { label: "Suppliers", value: suppliers.filter(s => s.status === "active").length.toString(), change: "", trend: "up" as const, icon: Building2 },
    ];
  }, [orders, suppliers, formatCurrency]);

  const filteredOrders = useMemo(() => orders.filter((o) => {
    const matchSearch = !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.supplier.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, search, statusFilter]);

  const filteredSuppliers = useMemo(() => suppliers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);

  const updateOrderStatus = useCallback((id: string, newStatus: POStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const updated = { ...o, status: newStatus, approvedBy: newStatus === "approved" ? "You" : o.approvedBy };
      if (newStatus === "submitted") {
        addApprovalItem({ title: `${o.id}: ${o.supplier}`, type: "purchase_order", sourceId: o.id, requester: "You", department: "Operations", amount: o.total, description: `${o.items.map(i => `${i.name} ×${i.qty}`).join(", ")} — ${o.warehouse}`, priority: "medium" });
        addNotification({ type: "supply", title: `PO ${o.id} submitted for approval`, message: `${o.supplier} order for ${formatCurrency(o.total)}`, link: "/approvals" });
      }
      if (newStatus === "received") {
        addStockFromPO(o.items, o.warehouse);
        addNotification({ type: "inventory", title: `PO ${o.id} received at ${o.warehouse}`, message: `${o.items.length} item(s) from ${o.supplier} added to inventory`, link: "/inventory" });
      }
      return updated;
    }));
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleSupplierStatus = useCallback((id: string) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s));
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "orders", label: "Purchase Orders", icon: FileText },
    { key: "suppliers", label: "Suppliers", icon: Building2 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Supply Chain</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage purchase orders, suppliers, and procurement.</p>
          </div>
          <div className="flex gap-2">
            {tab === "orders" && (
              <button onClick={() => setShowNewPO(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Plus className="w-4 h-4" />New PO
              </button>
            )}
            {tab === "suppliers" && (
              <button onClick={() => setShowNewSupplier(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Plus className="w-4 h-4" />Add Supplier
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className="w-4 h-4 text-primary" /></div>
                <div className={`flex items-center gap-1 text-xs font-medium ${s.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{s.change}
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="pl-9" />
          </div>
          {tab === "orders" && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
        </div>

        {/* Purchase Orders */}
        {tab === "orders" && (
          <div className="space-y-3 animate-fade-in">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">No purchase orders match filters.</div>
            ) : filteredOrders.map((po) => {
              const sc = statusConfig[po.status];
              const StatusIcon = sc.icon;
              const isExpanded = expandedId === po.id;
              return (
                <div key={po.id} className="glass-card rounded-xl overflow-hidden transition-all">
                  <button onClick={() => setExpandedId(isExpanded ? null : po.id)} className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/20 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${sc.className}`}><StatusIcon className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-primary">{po.id}</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{po.supplier}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{po.items.length} item{po.items.length > 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(po.total)}</span>
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{po.warehouse}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{po.created}</p>
                      {po.expectedDelivery !== "—" && <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end"><Truck className="w-3 h-3" />ETA: {po.expectedDelivery}</p>}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 animate-fade-in">
                      <p className="text-xs text-muted-foreground mb-3">{po.notes}</p>
                      <div className="glass-card rounded-lg overflow-hidden mb-3">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border">
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Item</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Qty</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Unit Price</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Total</th>
                          </tr></thead>
                          <tbody>{po.items.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="px-4 py-2 text-foreground">{item.name}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{item.qty}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-2 text-right font-medium text-foreground">{formatCurrency(item.qty * item.unitPrice)}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                      {po.approvedBy && <p className="text-xs text-muted-foreground mb-3">Approved by: <span className="text-foreground font-medium">{po.approvedBy}</span></p>}
                      <div className="flex flex-wrap gap-2">
                        {po.status === "draft" && <button onClick={() => updateOrderStatus(po.id, "submitted")} className="flex items-center gap-1.5 px-3 py-1.5 bg-info/10 text-info rounded-lg text-xs font-medium hover:bg-info/20"><Send className="w-3.5 h-3.5" />Submit</button>}
                        {po.status === "submitted" && <>
                          <button onClick={() => updateOrderStatus(po.id, "approved")} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20"><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>
                          <button onClick={() => updateOrderStatus(po.id, "cancelled")} className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20"><XCircle className="w-3.5 h-3.5" />Reject</button>
                        </>}
                        {po.status === "approved" && <button onClick={() => updateOrderStatus(po.id, "shipped")} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20"><Truck className="w-3.5 h-3.5" />Mark Shipped</button>}
                        {po.status === "shipped" && <button onClick={() => updateOrderStatus(po.id, "received")} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20"><Package className="w-3.5 h-3.5" />Mark Received</button>}
                        {["draft", "cancelled"].includes(po.status) && <button onClick={() => deleteOrder(po.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted ml-auto"><Trash2 className="w-3.5 h-3.5" />Delete</button>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Suppliers */}
        {tab === "suppliers" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
            {filteredSuppliers.map((sup) => (
              <div key={sup.id} className={`glass-card rounded-xl p-5 transition-all ${sup.status === "inactive" ? "opacity-60" : "hover:border-primary/30"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{sup.name}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sup.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{sup.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-warning fill-warning" /><span className="text-sm font-semibold text-foreground">{sup.rating}</span></div>
                    <button onClick={() => setEditingSupplier(sup)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => toggleSupplierStatus(sup.id)} className="p-1 rounded hover:bg-muted"><RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => deleteSupplier(sup.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />{sup.contact}</div>
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{sup.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{sup.phone}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{sup.address}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex gap-1.5">{sup.categories.map((c) => <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>)}</div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{sup.totalOrders} orders</span>
                    <span className={`font-semibold ${sup.onTimeRate >= 90 ? "text-success" : sup.onTimeRate >= 80 ? "text-warning" : "text-destructive"}`}>{sup.onTimeRate}% on-time</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New PO Modal */}
      {showNewPO && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewPO(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">New Purchase Order</h3>
              <button onClick={() => setShowNewPO(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <NewPOForm suppliers={suppliers.filter(s => s.status === "active")} formatCurrency={formatCurrency} inventoryItems={inventory}
              onSubmit={(data) => {
                setOrders(prev => [{ id: `PO-${5007 + prev.length}`, ...data, status: "draft" as POStatus, created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), expectedDelivery: "—", approvedBy: null }, ...prev]);
                setShowNewPO(false);
              }} onCancel={() => setShowNewPO(false)} />
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplier && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewSupplier(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Add Supplier</h3>
              <button onClick={() => setShowNewSupplier(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <SupplierForm onSave={(data) => { setSuppliers(prev => [...prev, { id: `SUP-${prev.length + 1}`, ...data, rating: 0, totalOrders: 0, onTimeRate: 0 }]); setShowNewSupplier(false); }} onCancel={() => setShowNewSupplier(false)} />
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingSupplier(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Edit Supplier</h3>
              <button onClick={() => setEditingSupplier(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <SupplierForm supplier={editingSupplier} onSave={(data) => { setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...data } : s)); setEditingSupplier(null); }} onCancel={() => setEditingSupplier(null)} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function NewPOForm({ suppliers, formatCurrency, inventoryItems, warehouseNames, onSubmit, onCancel }: { suppliers: Supplier[]; formatCurrency: (n: number) => string; inventoryItems: any[]; warehouseNames: string[]; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [supplier, setSupplier] = useState(suppliers[0]?.name || "");
  const [warehouse, setWarehouse] = useState(warehouseNames[0] || "");
  const [items, setItems] = useState([{ name: "", qty: "1", unitPrice: "" }]);
  const [notes, setNotes] = useState("");

  const addItem = () => setItems(prev => [...prev, { name: "", qty: "1", unitPrice: "" }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const selectInventoryItem = (i: number, sku: string) => {
    const inv = inventoryItems.find(item => item.sku === sku);
    if (inv) {
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, name: inv.name, unitPrice: inv.price.toString() } : item));
    }
  };

  const total = items.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseInt(i.qty) || 0), 0);

  return (
    <div className="space-y-3">
      <div><label className="text-xs font-medium text-muted-foreground">Supplier</label>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {suppliers.map((s) => <option key={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Destination</label>
        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          <option>Main HQ</option><option>West DC</option><option>East DC</option><option>South Hub</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Items</label>
        {items.map((item, i) => (
          <div key={i} className="space-y-1 mt-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2">
              <select onChange={(e) => selectInventoryItem(i, e.target.value)} className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground" defaultValue="">
                <option value="" disabled>Select from inventory...</option>
                {inventoryItems.map(inv => <option key={inv.sku} value={inv.sku}>{inv.name} ({inv.sku})</option>)}
              </select>
              {items.length > 1 && <button onClick={() => removeItem(i)} className="p-1 rounded hover:bg-destructive/10"><X className="w-3.5 h-3.5 text-destructive" /></button>}
            </div>
            <div className="grid grid-cols-7 gap-2">
              <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Or type item name" className="col-span-3 h-8 text-xs" />
              <Input type="number" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} placeholder="Qty" className="col-span-1 h-8 text-xs" />
              <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} placeholder="Price" className="col-span-3 h-8 text-xs" />
            </div>
          </div>
        ))}
        <button onClick={addItem} className="text-xs text-primary mt-2 hover:underline">+ Add item</button>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Notes</label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1" /></div>
      {total > 0 && <p className="text-sm font-semibold text-foreground">Total: {formatCurrency(total)}</p>}
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button onClick={() => onSubmit({ supplier, warehouse, items: items.filter(i => i.name).map(i => ({ name: i.name, qty: parseInt(i.qty), unitPrice: parseFloat(i.unitPrice) })), total, notes })} disabled={!items.some(i => i.name && i.unitPrice)} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Create PO</button>
      </div>
    </div>
  );
}

function SupplierForm({ supplier, onSave, onCancel }: { supplier?: Supplier; onSave: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(supplier?.name || ""); const [contact, setContact] = useState(supplier?.contact || "");
  const [email, setEmail] = useState(supplier?.email || ""); const [phone, setPhone] = useState(supplier?.phone || "");
  const [address, setAddress] = useState(supplier?.address || ""); const [categories, setCategories] = useState(supplier?.categories.join(", ") || "");
  const [status, setStatus] = useState<"active" | "inactive">(supplier?.status || "active");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Company Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Contact Person</label><Input value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Address</label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Categories (comma-separated)</label><Input value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="e.g. Electronics, Components" className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button disabled={!name} onClick={() => onSave({ name, contact, email, phone, address, categories: categories.split(",").map(c => c.trim()).filter(Boolean), status })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{supplier ? "Update" : "Add"} Supplier</button>
      </div>
    </div>
  );
}
