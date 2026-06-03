import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAppEvents } from "@/hooks/use-app-events";
import { useSharedData } from "@/hooks/use-shared-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printNode } from "@/lib/print";
import POPrintTemplate, { type POPrintData } from "@/components/POPrintTemplate";
import {
  Truck, Package, Search, Plus, Clock, CheckCircle2, XCircle,
  FileText, Send, Building2, DollarSign, ChevronRight, MapPin, Phone, Mail, Star,
  Users, TrendingUp, TrendingDown, X, Edit2, Trash2, RefreshCw, Loader2, Printer,
} from "lucide-react";

type Tab = "orders" | "suppliers";
type POStatus = "draft" | "submitted" | "approved" | "shipped" | "received" | "cancelled";

interface PurchaseOrder {
  id: string; po_number: string; supplier_id: string | null; supplier_name: string; items: { name: string; qty: number; unitPrice: number; inventory_item_id?: string; unitName?: string; unitFactor?: number }[];
  status: POStatus; created: string; expectedDelivery: string; total: number; warehouse: string; warehouse_id: string | null; notes: string; approvedBy: string | null;
}

interface Supplier {
  id: string; name: string; contact: string; email: string; phone: string; address: string;
  rating: number; totalOrders: number; onTimeRate: number; categories: string[]; status: "active" | "inactive";
}

const statusConfig: Record<POStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
  submitted: { label: "Submitted", className: "bg-info/10 text-info", icon: Send },
  approved: { label: "Approved", className: "bg-success/10 text-success", icon: CheckCircle2 },
  shipped: { label: "Shipped", className: "bg-primary/10 text-primary", icon: Truck },
  received: { label: "Received", className: "bg-success/10 text-success", icon: Package },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function SupplyPage() {
  const { user } = useAuth();
  const { companyProfile } = useAuth();
  const { formatCurrency, hasPermission } = useAppSettings();
  const { addApprovalItem, addNotification, getStagesForType } = useAppEvents();
  const { inventory, addStockFromPO, warehouseNames, refreshData: refreshShared } = useSharedData();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewPO, setShowNewPO] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [printingPO, setPrintingPO] = useState<PurchaseOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch POs and suppliers from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [posRes, suppRes] = await Promise.all([
        supabase.from("purchase_orders").select("*, purchase_order_items(*), suppliers(name)").order("created_at", { ascending: false }),
        supabase.from("suppliers").select("*").order("name"),
      ]);

      if (posRes.data) {
        setOrders(posRes.data.map((po: any) => ({
          id: po.id,
          po_number: po.po_number,
          supplier_id: po.supplier_id,
          supplier_name: po.suppliers?.name || "Unknown",
          items: (po.purchase_order_items || []).map((i: any) => ({
            name: i.name,
            qty: i.qty,
            unitPrice: i.unit_price,
            inventory_item_id: i.inventory_item_id,
            unitName: i.unit_name || undefined,
            unitFactor: Number(i.unit_factor) || 1,
          })),
          status: po.status as POStatus,
          created: new Date(po.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          expectedDelivery: po.expected_date ? new Date(po.expected_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
          total: po.total,
          warehouse: po.warehouse_id || "",
          warehouse_id: po.warehouse_id,
          notes: po.notes || "",
          approvedBy: po.approved_by || null,
        })));
      }

      if (suppRes.data) {
        setSuppliers(suppRes.data.map((s: any) => ({
          id: s.id, name: s.name, contact: s.contact_name || "", email: s.email || "",
          phone: s.phone || "", address: s.address || "", rating: s.rating || 0,
          totalOrders: s.total_orders || 0, onTimeRate: s.on_time_rate || 0,
          categories: s.categories || [], status: s.status === "active" ? "active" : "inactive",
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Realtime: subscribe to PO and workflow changes so the page reflects sync
  // automatically when a linked workflow finalizes (no window events needed).
  useEffect(() => {
    if (!user?.companyId) return;
    const channel = supabase
      .channel("supply-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "purchase_orders", filter: `company_id=eq.${user.companyId}` },
        (payload) => {
          const next = payload.new as any;
          setOrders((prev) => prev.map((o) => {
            if (o.id !== next.id) return o;
            if (o.status === next.status) return o;
            // Toast only on workflow-driven transitions (approved/cancelled)
            if (next.status === "approved") toast.success(`PO ${o.po_number} approved`);
            else if (next.status === "cancelled") toast.error(`PO ${o.po_number} cancelled`);
            return { ...o, status: next.status as POStatus, total: Number(next.total) };
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "workflows", filter: `company_id=eq.${user.companyId}` },
        (payload) => {
          const wf = payload.new as any;
          if (wf.source_type !== "purchase_order" || !wf.source_id) return;
          // workflow row updated — let the PO update event drive the status toast
          if (wf.status === "completed" || wf.status === "cancelled") {
            toast(`Workflow for PO updated: ${wf.status}`);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.companyId]);

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
    const matchSearch = !search || o.po_number.toLowerCase().includes(search.toLowerCase()) || o.supplier_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, search, statusFilter]);

  const filteredSuppliers = useMemo(() => suppliers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);

  const updateOrderStatus = useCallback(async (id: string, newStatus: POStatus) => {
    const { error } = await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update PO status"); return; }

    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const updated = { ...o, status: newStatus, approvedBy: newStatus === "approved" ? "You" : o.approvedBy };
      if (newStatus === "submitted") {
        addApprovalItem({ title: `${o.po_number}: ${o.supplier_name}`, type: "purchase_order", sourceId: o.id, requester: "You", department: "Operations", amount: o.total, description: `${o.items.map(i => `${i.name} ×${i.qty}`).join(", ")}`, priority: "medium" });
        addNotification({ type: "supply", title: `PO ${o.po_number} submitted for approval`, message: `${o.supplier_name} order for ${formatCurrency(o.total)}`, link: "/approvals" });
        // Also create a linked Workflow row so the PO appears under /workflows
        (async () => {
          const stages = getStagesForType("purchase_order");
          const steps = (stages.length ? stages : [
            { name: "Manager Review", role: "manager" },
            { name: "Admin Approval", role: "admin" },
          ]).map((s: any) => ({ name: s.name, role: s.role, status: "pending", assignee: "Auto-assigned" }));
          const itemsSummary = o.items.map(i => `${i.name} ×${i.qty}${i.unitName && (i.unitFactor || 1) > 1 ? ` ${i.unitName}` : ""}`).join(", ");
          // Avoid duplicates: skip if a workflow already exists for this PO
          const { data: existing } = await supabase.from("workflows").select("id").eq("source_type", "purchase_order").eq("source_id", o.id).limit(1).maybeSingle();
          if (existing) return;
          await supabase.from("workflows").insert({
            title: `${o.po_number}: ${o.supplier_name}`,
            type: "Purchase Order Approval",
            description: `${itemsSummary} — ${formatCurrency(o.total)}`,
            status: "active",
            current_step: 0,
            steps: steps as any,
            source_type: "purchase_order",
            source_id: o.id,
            created_by: user?.id || null,
            company_id: user?.companyId || null,
          });
        })();
      }
      if (newStatus === "received") {
        addStockFromPO(o.items, o.warehouse);
        addNotification({ type: "inventory", title: `PO ${o.po_number} received`, message: `${o.items.length} item(s) from ${o.supplier_name} added to inventory`, link: "/inventory" });
      }
      return updated;
    }));
    toast.success(`PO status updated to ${newStatus}`);
  }, [formatCurrency, addApprovalItem, addNotification, addStockFromPO, getStagesForType, user]);

  const deleteOrder = useCallback(async (id: string) => {
    const { error } = await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);
    if (!error) {
      const { error: poErr } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (!poErr) { setOrders(prev => prev.filter(o => o.id !== id)); toast.success("PO deleted"); return; }
    }
    toast.error("Failed to delete PO");
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { toast.error("Failed to delete supplier"); return; }
    setSuppliers(prev => prev.filter(s => s.id !== id));
    toast.success("Supplier deleted");
  }, []);

  const toggleSupplierStatus = useCallback(async (id: string) => {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) return;
    const newStatus = sup.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("suppliers").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update supplier"); return; }
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  }, [suppliers]);

  const allTabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "orders", label: "Purchase Orders", icon: FileText },
    { key: "suppliers", label: "Suppliers", icon: Building2 },
  ];

  const tabPermMap: Record<Tab, string> = { orders: "pages.supply.orders", suppliers: "pages.supply.suppliers" };
  const tabs = useMemo(() => allTabs.filter(t => hasPermission(tabPermMap[t.key] as any)), [hasPermission]);

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

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
                        <span className="text-xs font-mono text-primary">{po.po_number}</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{po.supplier_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{po.items.length} item{po.items.length > 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(po.total)}</span>
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
                              <td className="px-4 py-2 text-foreground">
                                {item.name}
                                {item.unitName && (item.unitFactor || 1) > 1 && (
                                  <span className="block text-[10px] text-muted-foreground">
                                    Ordered as {item.unitName} (1 {item.unitName} = {item.unitFactor} base)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {(item.unitFactor || 1) > 1
                                  ? `${(item.qty / (item.unitFactor || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${item.unitName}`
                                  : item.qty}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {(item.unitFactor || 1) > 1
                                  ? `${formatCurrency(item.unitPrice * (item.unitFactor || 1))} / ${item.unitName}`
                                  : formatCurrency(item.unitPrice)}
                              </td>
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
                        {["draft", "submitted"].includes(po.status) && (
                          <button onClick={() => setEditingPO(po)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted">
                            <Edit2 className="w-3.5 h-3.5" />Edit
                          </button>
                        )}
                        {["draft", "cancelled"].includes(po.status) && <button onClick={() => deleteOrder(po.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted ml-auto"><Trash2 className="w-3.5 h-3.5" />Delete</button>}
                        <button onClick={() => setPrintingPO(po)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted">
                          <Printer className="w-3.5 h-3.5" />Print
                        </button>
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
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-sm text-muted-foreground">No suppliers found.</div>
            ) : filteredSuppliers.map((sup) => (
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
            <NewPOForm suppliers={suppliers.filter(s => s.status === "active")} formatCurrency={formatCurrency} inventoryItems={inventory} warehouseNames={warehouseNames}
              onSubmit={async (data) => {
                // Auto-create inventory items for any PO lines that don't have one.
                // The line's purchase price becomes the item's cost_price (and seeds
                // selling price so it can be sold immediately if needed).
                const created: { name: string; sku: string }[] = [];
                const resolvedItems = await Promise.all(
                  data.items.map(async (i: any) => {
                    if (i.inventory_item_id) return i;
                    const unitName = i.unitName || "pcs";
                    const factor = Number(i.unitFactor) || 1;
                    const baseCost = (Number(i.unitPrice) || 0) / factor;
                    const sku = `AUTO-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
                    const { data: newInv, error: newErr } = await supabase.from("inventory_items").insert({
                      sku,
                      name: i.name,
                      category: "Uncategorized",
                      qty: 0,
                      reorder_point: 50,
                      cost_price: baseCost,
                      price: baseCost,
                      unit: unitName,
                      base_unit: unitName,
                      pack_size: 1,
                      units: [],
                      company_id: user?.companyId || null,
                    }).select().single();
                    if (newErr || !newInv) {
                      toast.error(`Failed to create inventory item "${i.name}"`);
                      return i;
                    }
                    created.push({ name: i.name, sku });
                    return { ...i, inventory_item_id: newInv.id };
                  })
                );
                data.items = resolvedItems;

                // Generate PO number
                const { data: poNum } = await supabase.rpc("generate_po_number");
                const { data: po, error } = await supabase.from("purchase_orders").insert({
                  po_number: poNum || `PO-${Date.now()}`,
                  supplier_id: data.supplier_id || null,
                  warehouse_id: data.warehouse_id || null,
                  notes: data.notes,
                  status: "draft" as const,
                  subtotal: data.total,
                  total: data.total,
                  created_by: (await supabase.auth.getUser()).data.user?.id,
                  company_id: user?.companyId || null,
                }).select().single();

                if (error || !po) { toast.error("Failed to create PO"); return; }

                // Insert items
                if (data.items.length > 0) {
                  await supabase.from("purchase_order_items").insert(
                    data.items.map((i: any) => ({
                      purchase_order_id: po.id, name: i.name,
                      qty: (i.qty || 0) * (i.unitFactor || 1), // store qty in BASE units so receive-trigger increments stock correctly
                      unit_price: (i.unitPrice || 0) / (i.unitFactor || 1), // base-unit price
                      total: i.qty * i.unitPrice,
                      inventory_item_id: i.inventory_item_id || null,
                      unit_name: i.unitName || null,
                      unit_factor: i.unitFactor || 1,
                      base_qty: (i.qty || 0) * (i.unitFactor || 1),
                    }))
                  );
                }

                setOrders(prev => [{
                  id: po.id, po_number: po.po_number, supplier_id: po.supplier_id,
                  supplier_name: data.supplier_name || "Unknown",
                  items: data.items, status: "draft", total: data.total,
                  created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                  expectedDelivery: "—", warehouse: data.warehouse_name || "", warehouse_id: data.warehouse_id,
                  notes: data.notes, approvedBy: null,
                }, ...prev]);
                if (created.length > 0) {
                  refreshShared();
                  toast.success(`Created ${created.length} new inventory item${created.length > 1 ? "s" : ""}`);
                }
                setShowNewPO(false);
                toast.success("Purchase order created");
              }} onCancel={() => setShowNewPO(false)} />
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {editingPO && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingPO(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Edit {editingPO.po_number}</h3>
              <button onClick={() => setEditingPO(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <NewPOForm
              suppliers={suppliers.filter(s => s.status === "active" || s.id === editingPO.supplier_id)}
              formatCurrency={formatCurrency}
              inventoryItems={inventory}
              warehouseNames={warehouseNames}
              submitLabel="Save changes"
              initial={{
                supplier_id: editingPO.supplier_id,
                warehouse: editingPO.warehouse,
                items: editingPO.items,
                notes: editingPO.notes,
              }}
              onSubmit={async (data) => {
                // Update header
                const { error: hErr } = await supabase.from("purchase_orders").update({
                  supplier_id: data.supplier_id || null,
                  notes: data.notes,
                  subtotal: data.total,
                  total: data.total,
                }).eq("id", editingPO.id);
                if (hErr) { toast.error("Failed to update PO"); return; }

                // Replace items
                await supabase.from("purchase_order_items").delete().eq("purchase_order_id", editingPO.id);
                if (data.items.length > 0) {
                  await supabase.from("purchase_order_items").insert(
                    data.items.map((i: any) => ({
                      purchase_order_id: editingPO.id, name: i.name,
                      qty: (i.qty || 0) * (i.unitFactor || 1),
                      unit_price: (i.unitPrice || 0) / (i.unitFactor || 1),
                      total: i.qty * i.unitPrice,
                      inventory_item_id: i.inventory_item_id || null,
                      unit_name: i.unitName || null,
                      unit_factor: i.unitFactor || 1,
                      base_qty: (i.qty || 0) * (i.unitFactor || 1),
                    }))
                  );
                }

                // Mirror updates to any linked workflow row's description
                const itemsSummary = data.items.map((i: any) => `${i.name} ×${i.qty}${i.unitName && (i.unitFactor || 1) > 1 ? ` ${i.unitName}` : ""}`).join(", ");
                await supabase.from("workflows")
                  .update({ description: `${itemsSummary} — ${formatCurrency(data.total)}` })
                  .eq("source_type", "purchase_order")
                  .eq("source_id", editingPO.id);

                setOrders(prev => prev.map(o => o.id === editingPO.id ? {
                  ...o,
                  supplier_id: data.supplier_id || null,
                  supplier_name: data.supplier_name || o.supplier_name,
                  items: data.items,
                  notes: data.notes,
                  total: data.total,
                } : o));
                setEditingPO(null);
                toast.success("Purchase order updated");
              }}
              onCancel={() => setEditingPO(null)}
            />
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
            <SupplierForm onSave={async (data) => {
              const { data: sup, error } = await supabase.from("suppliers").insert({
                name: data.name, contact_name: data.contact, email: data.email,
                phone: data.phone, address: data.address, categories: data.categories,
                status: data.status, company_id: user?.companyId || null,
              }).select().single();
              if (error || !sup) { toast.error("Failed to add supplier"); return; }
              setSuppliers(prev => [...prev, {
                id: sup.id, name: sup.name, contact: sup.contact_name || "", email: sup.email || "",
                phone: sup.phone || "", address: sup.address || "", rating: 0, totalOrders: 0, onTimeRate: 0,
                categories: sup.categories || [], status: sup.status === "active" ? "active" : "inactive",
              }]);
              setShowNewSupplier(false);
              toast.success("Supplier added");
            }} onCancel={() => setShowNewSupplier(false)} />
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
            <SupplierForm supplier={editingSupplier} onSave={async (data) => {
              const { error } = await supabase.from("suppliers").update({
                name: data.name, contact_name: data.contact, email: data.email,
                phone: data.phone, address: data.address, categories: data.categories,
                status: data.status,
              }).eq("id", editingSupplier.id);
              if (error) { toast.error("Failed to update supplier"); return; }
              setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...data } : s));
              setEditingSupplier(null);
              toast.success("Supplier updated");
            }} onCancel={() => setEditingSupplier(null)} />
          </div>
        </div>
      )}

      {/* Print PO Modal */}
      {printingPO && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPrintingPO(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">Print PO {printingPO.po_number}</h3>
              <button onClick={() => setPrintingPO(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <POPrintTemplate
              ref={printRef}
              po={{
                po_number: printingPO.po_number,
                supplier_name: printingPO.supplier_name,
                warehouse: printingPO.warehouse,
                notes: printingPO.notes,
                status: printingPO.status,
                created: printingPO.created,
                expectedDelivery: printingPO.expectedDelivery,
                total: printingPO.total,
                approvedBy: printingPO.approvedBy,
                items: printingPO.items.map((i) => ({
                  name: i.name,
                  qty: i.qty,
                  unitPrice: i.unitPrice,
                  unitName: i.unitName,
                  unitFactor: i.unitFactor,
                })),
              }}
              company={companyProfile}
              formatCurrency={formatCurrency}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPrintingPO(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Close</button>
              <button onClick={() => printNode(printRef.current, `PO ${printingPO.po_number}`)} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-1">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function NewPOForm({ suppliers, formatCurrency, inventoryItems, warehouseNames, onSubmit, onCancel, initial, submitLabel = "Create PO" }: { suppliers: Supplier[]; formatCurrency: (n: number) => string; inventoryItems: any[]; warehouseNames: string[]; onSubmit: (data: any) => void; onCancel: () => void; initial?: { supplier_id?: string | null; warehouse?: string; items: { name: string; qty: number; unitPrice: number; inventory_item_id?: string; unitName?: string; unitFactor?: number }[]; notes?: string }; submitLabel?: string }) {
  const [supplier, setSupplier] = useState(initial?.supplier_id || suppliers[0]?.id || "");
  const [warehouse, setWarehouse] = useState(initial?.warehouse || warehouseNames[0] || "");
  const [items, setItems] = useState(initial?.items?.length
    ? initial.items.map(i => ({
        name: i.name,
        // NewPOForm works in selected-unit qty/price; convert from base when factor>1
        qty: String((i.qty || 0) / (i.unitFactor || 1)),
        unitPrice: String((i.unitPrice || 0) * (i.unitFactor || 1)),
        inventory_item_id: i.inventory_item_id || "",
        unitName: i.unitName || "",
        unitFactor: i.unitFactor || 1,
      }))
    : [{ name: "", qty: "1", unitPrice: "", inventory_item_id: "", unitName: "", unitFactor: 1 }]);
  const [notes, setNotes] = useState(initial?.notes || "");

  const addItem = () => setItems(prev => [...prev, { name: "", qty: "1", unitPrice: "", inventory_item_id: "", unitName: "", unitFactor: 1 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const selectInventoryItem = (i: number, sku: string) => {
    const inv = inventoryItems.find(item => item.sku === sku);
    if (inv) {
      // Prefill with COST (purchase) price, falling back to selling price if not set
      const purchasePrice = (Number(inv.costPrice) > 0 ? inv.costPrice : inv.price).toString();
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, name: inv.name, unitPrice: purchasePrice, inventory_item_id: inv.id, unitName: inv.baseUnit || "pcs", unitFactor: 1 } : item));
    }
  };

  const selectUnit = (i: number, unitName: string) => {
    const item = items[i];
    const inv = inventoryItems.find(it => it.id === item.inventory_item_id);
    if (!inv) return;
    const baseCost = Number(inv.costPrice) > 0 ? Number(inv.costPrice) : Number(inv.price);
    if (unitName === (inv.baseUnit || "pcs")) {
      updateItem(i, "unitName", unitName); updateItem(i, "unitFactor", 1); updateItem(i, "unitPrice", baseCost.toString()); return;
    }
    const u = (inv.units || []).find((x: any) => x.name === unitName);
    if (u) { updateItem(i, "unitName", unitName); updateItem(i, "unitFactor", u.factor); updateItem(i, "unitPrice", (baseCost * u.factor).toString()); }
  };

  const total = items.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseInt(i.qty) || 0), 0);
  const selectedSupplier = suppliers.find(s => s.id === supplier);

  return (
    <div className="space-y-3">
      <div><label className="text-xs font-medium text-muted-foreground">Supplier</label>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Destination</label>
        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {warehouseNames.length === 0 && <option value="">No warehouses configured</option>}
          {warehouseNames.map(w => <option key={w} value={w}>{w}</option>)}
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
            {item.inventory_item_id && (() => {
              const inv = inventoryItems.find((x: any) => x.id === item.inventory_item_id);
              const opts = inv ? [{ name: inv.baseUnit || "pcs", factor: 1, price: inv.price }, ...(inv.units || [])] : [];
              if (opts.length <= 1) return null;
              return (
                <select value={item.unitName} onChange={(e) => selectUnit(i, e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
                  {opts.map((u: any) => <option key={u.name} value={u.name}>Order as {u.name} (= {u.factor} {inv.baseUnit || "pcs"})</option>)}
                </select>
              );
            })()}
            <div className="grid grid-cols-7 gap-2">
              <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Item name (new or existing)" className="col-span-3 h-8 text-xs" />
              <Input type="number" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} placeholder="Qty" className="col-span-1 h-8 text-xs" />
              <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} placeholder="Purchase price" className="col-span-3 h-8 text-xs" title="Purchase (cost) price per unit" />
            </div>
            {!item.inventory_item_id && item.name && (
              <p className="text-[10px] text-primary/80 mt-1">+ Will create new inventory item "{item.name}" with this purchase price.</p>
            )}
          </div>
        ))}
        <button onClick={addItem} className="text-xs text-primary mt-2 hover:underline">+ Add item</button>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Notes</label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1" /></div>
      {total > 0 && <p className="text-sm font-semibold text-foreground">Total: {formatCurrency(total)}</p>}
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button onClick={() => {
          // Validation: each item needs valid qty (>0 integer), price (>=0), unitFactor (>0)
          const cleaned = items.filter(i => i.name);
          if (cleaned.length === 0) { toast.error("Add at least one item"); return; }
          for (const i of cleaned) {
            const qty = parseInt(i.qty);
            const price = parseFloat(i.unitPrice);
            const factor = Number(i.unitFactor) || 1;
            if (!Number.isFinite(qty) || qty <= 0) { toast.error(`Invalid quantity for "${i.name}" — must be a positive whole number`); return; }
            if (!Number.isFinite(price) || price < 0) { toast.error(`Invalid price for "${i.name}"`); return; }
            if (!Number.isFinite(factor) || factor <= 0) { toast.error(`Invalid unit factor for "${i.name}" — must be greater than zero`); return; }
            // Base-quantity must be a whole number to match inventory base units
            const baseQty = qty * factor;
            if (!Number.isInteger(baseQty)) { toast.error(`Base quantity for "${i.name}" must be a whole number (got ${baseQty})`); return; }
          }
          onSubmit({
            supplier_id: supplier, supplier_name: selectedSupplier?.name || "",
            warehouse_name: warehouse, warehouse_id: null,
            items: cleaned.map(i => ({ name: i.name, qty: parseInt(i.qty), unitPrice: parseFloat(i.unitPrice), inventory_item_id: i.inventory_item_id || undefined, unitName: i.unitName || undefined, unitFactor: Number(i.unitFactor) || 1 })),
            total, notes,
          });
        }} disabled={!items.some(i => i.name && i.unitPrice)} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{submitLabel}</button>
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
