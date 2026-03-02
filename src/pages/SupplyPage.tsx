import { useState, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import {
  Truck, Package, Search, Plus, Filter, Clock, CheckCircle2, XCircle,
  AlertTriangle, Eye, MoreHorizontal, ArrowRight, X, Check, Building2,
  DollarSign, Calendar, FileText, Send, Users, TrendingUp, TrendingDown,
  ChevronRight, MapPin, Phone, Mail, Star, RefreshCw,
} from "lucide-react";

type Tab = "orders" | "suppliers";
type POStatus = "draft" | "submitted" | "approved" | "shipped" | "received" | "cancelled";

interface PurchaseOrder {
  id: string;
  supplier: string;
  items: { name: string; qty: number; unitPrice: number }[];
  status: POStatus;
  created: string;
  expectedDelivery: string;
  total: number;
  warehouse: string;
  notes: string;
  approvedBy: string | null;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  totalOrders: number;
  onTimeRate: number;
  categories: string[];
  status: "active" | "inactive";
}

const initialOrders: PurchaseOrder[] = [
  { id: "PO-5001", supplier: "TechParts Inc", items: [{ name: "Widget Alpha", qty: 500, unitPrice: 18.50 }, { name: "PCB Board Rev3", qty: 200, unitPrice: 9.75 }], status: "approved", created: "Feb 10, 2026", expectedDelivery: "Feb 20, 2026", total: 11200, warehouse: "Main HQ", notes: "Urgent restock for critical items", approvedBy: "Sarah Chen" },
  { id: "PO-5002", supplier: "Global Sensors", items: [{ name: "Sensor X10", qty: 100, unitPrice: 72.00 }], status: "shipped", created: "Feb 8, 2026", expectedDelivery: "Feb 18, 2026", total: 7200, warehouse: "West DC", notes: "Regular monthly order", approvedBy: "James Wilson" },
  { id: "PO-5003", supplier: "PowerMax Supply", items: [{ name: "PSU 750W Gold", qty: 50, unitPrice: 95.00 }, { name: "Motor 500W", qty: 30, unitPrice: 110.00 }], status: "submitted", created: "Feb 12, 2026", expectedDelivery: "Feb 25, 2026", total: 8050, warehouse: "East DC", notes: "Q1 equipment refresh", approvedBy: null },
  { id: "PO-5004", supplier: "CableWorld", items: [{ name: "Cat6 Cable (100ft)", qty: 300, unitPrice: 26.00 }], status: "received", created: "Feb 5, 2026", expectedDelivery: "Feb 15, 2026", total: 7800, warehouse: "Main HQ", notes: "Networking infrastructure expansion", approvedBy: "Lisa Park" },
  { id: "PO-5005", supplier: "CoolTech Co", items: [{ name: "Cooling Fan 120mm", qty: 200, unitPrice: 7.50 }], status: "draft", created: "Feb 14, 2026", expectedDelivery: "—", total: 1500, warehouse: "South Hub", notes: "Pending budget approval", approvedBy: null },
  { id: "PO-5006", supplier: "TechParts Inc", items: [{ name: "Widget Beta", qty: 1000, unitPrice: 14.00 }], status: "cancelled", created: "Feb 3, 2026", expectedDelivery: "—", total: 14000, warehouse: "Main HQ", notes: "Cancelled — supplier couldn't meet deadline", approvedBy: null },
];

const suppliers: Supplier[] = [
  { id: "SUP-01", name: "TechParts Inc", contact: "John Rivera", email: "john@techparts.com", phone: "+1 555-1001", address: "Silicon Valley, CA", rating: 4.8, totalOrders: 142, onTimeRate: 96, categories: ["Components", "Electronics"], status: "active" },
  { id: "SUP-02", name: "Global Sensors", contact: "Mei Zhang", email: "mei@globalsensors.com", phone: "+1 555-1002", address: "Portland, OR", rating: 4.6, totalOrders: 89, onTimeRate: 92, categories: ["Electronics"], status: "active" },
  { id: "SUP-03", name: "PowerMax Supply", contact: "Carlos Diaz", email: "carlos@powermax.com", phone: "+1 555-1003", address: "Houston, TX", rating: 4.4, totalOrders: 67, onTimeRate: 88, categories: ["Electronics", "Machinery"], status: "active" },
  { id: "SUP-04", name: "CableWorld", contact: "Amy Park", email: "amy@cableworld.com", phone: "+1 555-1004", address: "Atlanta, GA", rating: 4.7, totalOrders: 112, onTimeRate: 94, categories: ["Networking"], status: "active" },
  { id: "SUP-05", name: "CoolTech Co", contact: "Ben Harris", email: "ben@cooltech.com", phone: "+1 555-1005", address: "Denver, CO", rating: 4.2, totalOrders: 34, onTimeRate: 85, categories: ["Components"], status: "active" },
  { id: "SUP-06", name: "MetalWorks Ltd", contact: "Nina Patel", email: "nina@metalworks.com", phone: "+1 555-1006", address: "Detroit, MI", rating: 3.9, totalOrders: 18, onTimeRate: 78, categories: ["Machinery"], status: "inactive" },
];

const statusConfig: Record<POStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
  submitted: { label: "Submitted", className: "bg-info/10 text-info", icon: Send },
  approved: { label: "Approved", className: "bg-success/10 text-success", icon: CheckCircle2 },
  shipped: { label: "Shipped", className: "bg-primary/10 text-primary", icon: Truck },
  received: { label: "Received", className: "bg-success/10 text-success", icon: Package },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive", icon: XCircle },
};

const stats = [
  { label: "Active POs", value: "4", change: "+1", trend: "up" as const, icon: FileText },
  { label: "In Transit", value: "1", change: "0", trend: "up" as const, icon: Truck },
  { label: "Total Spend (MTD)", value: "$35.7K", change: "+8.2%", trend: "up" as const, icon: DollarSign },
  { label: "Suppliers", value: "5", change: "+1", trend: "up" as const, icon: Building2 },
];

export default function SupplyPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewPO, setShowNewPO] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.supplier.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const updateOrderStatus = useCallback((id: string, newStatus: POStatus) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus, approvedBy: newStatus === "approved" ? "You" : o.approvedBy } : o));
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
          <button onClick={() => setShowNewPO(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            New Purchase Order
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${s.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {s.change}
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
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
            ) : (
              filteredOrders.map((po) => {
                const sc = statusConfig[po.status];
                const StatusIcon = sc.icon;
                const isExpanded = expandedId === po.id;
                return (
                  <div key={po.id} className="glass-card rounded-xl overflow-hidden transition-all">
                    <button onClick={() => setExpandedId(isExpanded ? null : po.id)} className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/20 transition-colors">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${sc.className}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-primary">{po.id}</span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{po.supplier}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{po.items.length} item{po.items.length > 1 ? "s" : ""}</span>
                          <span className="font-semibold text-foreground">${po.total.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{po.warehouse}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{po.created}</p>
                        {po.expectedDelivery !== "—" && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                            <Truck className="w-3 h-3" />ETA: {po.expectedDelivery}
                          </p>
                        )}
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 animate-fade-in">
                        <p className="text-xs text-muted-foreground mb-3">{po.notes}</p>
                        <div className="glass-card rounded-lg overflow-hidden mb-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Item</th>
                                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Qty</th>
                                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Unit Price</th>
                                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {po.items.map((item, i) => (
                                <tr key={i} className="border-b border-border/50">
                                  <td className="px-4 py-2 text-foreground">{item.name}</td>
                                  <td className="px-4 py-2 text-right text-muted-foreground">{item.qty}</td>
                                  <td className="px-4 py-2 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right font-medium text-foreground">${(item.qty * item.unitPrice).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {po.approvedBy && <p className="text-xs text-muted-foreground mb-3">Approved by: <span className="text-foreground font-medium">{po.approvedBy}</span></p>}
                        <div className="flex flex-wrap gap-2">
                          {po.status === "draft" && (
                            <button onClick={() => updateOrderStatus(po.id, "submitted")} className="flex items-center gap-1.5 px-3 py-1.5 bg-info/10 text-info rounded-lg text-xs font-medium hover:bg-info/20">
                              <Send className="w-3.5 h-3.5" />Submit for Approval
                            </button>
                          )}
                          {po.status === "submitted" && (
                            <>
                              <button onClick={() => updateOrderStatus(po.id, "approved")} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />Approve
                              </button>
                              <button onClick={() => updateOrderStatus(po.id, "cancelled")} className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20">
                                <XCircle className="w-3.5 h-3.5" />Reject
                              </button>
                            </>
                          )}
                          {po.status === "approved" && (
                            <button onClick={() => updateOrderStatus(po.id, "shipped")} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20">
                              <Truck className="w-3.5 h-3.5" />Mark Shipped
                            </button>
                          )}
                          {po.status === "shipped" && (
                            <button onClick={() => updateOrderStatus(po.id, "received")} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20">
                              <Package className="w-3.5 h-3.5" />Mark Received
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Suppliers */}
        {tab === "suppliers" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
            {filteredSuppliers.map((sup) => (
              <div key={sup.id} className={`glass-card rounded-xl p-5 transition-all ${sup.status === "inactive" ? "opacity-60" : "hover:border-primary/30"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{sup.name}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sup.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{sup.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                    <span className="text-sm font-semibold text-foreground">{sup.rating}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />{sup.contact}</div>
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{sup.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{sup.phone}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{sup.address}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {sup.categories.map((c) => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
                    ))}
                  </div>
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
            <NewPOForm
              onSubmit={(data) => {
                const newPO: PurchaseOrder = {
                  id: `PO-${5007 + orders.length}`,
                  ...data,
                  status: "draft",
                  created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                  expectedDelivery: "—",
                  approvedBy: null,
                };
                setOrders((prev) => [newPO, ...prev]);
                setShowNewPO(false);
              }}
              onCancel={() => setShowNewPO(false)}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function NewPOForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [supplier, setSupplier] = useState(suppliers[0].name);
  const [warehouse, setWarehouse] = useState("Main HQ");
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [notes, setNotes] = useState("");

  const total = itemPrice && itemQty ? parseFloat(itemPrice) * parseInt(itemQty) : 0;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Supplier</label>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {suppliers.filter((s) => s.status === "active").map((s) => <option key={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Destination Warehouse</label>
        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          <option>Main HQ</option><option>West DC</option><option>East DC</option><option>South Hub</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="text-xs font-medium text-muted-foreground">Item</label>
          <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Qty</label>
          <Input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Price ($)</label>
          <Input type="number" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="0.00" className="mt-1" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="mt-1" />
      </div>
      {total > 0 && <p className="text-sm font-semibold text-foreground">Total: ${total.toLocaleString()}</p>}
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
        <button
          onClick={() => onSubmit({ supplier, warehouse, items: [{ name: itemName, qty: parseInt(itemQty), unitPrice: parseFloat(itemPrice) }], total, notes })}
          disabled={!itemName || !itemPrice}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Create PO
        </button>
      </div>
    </div>
  );
}
