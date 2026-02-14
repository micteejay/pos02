import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Package,
  Warehouse,
  ArrowRightLeft,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  MoreHorizontal,
  MapPin,
  Box,
  ArrowRight,
  Clock,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Tab = "stock" | "warehouses" | "transfers";

// ── Stock Data ──────────────────────────────────────────────
const stockItems = [
  { sku: "WDG-A100", name: "Widget Alpha", category: "Components", warehouse: "Main HQ", qty: 12, reorder: 50, price: 24.99, status: "critical" as const },
  { sku: "WDG-B200", name: "Widget Beta", category: "Components", warehouse: "Main HQ", qty: 340, reorder: 100, price: 18.50, status: "ok" as const },
  { sku: "SEN-X10", name: "Sensor X10", category: "Electronics", warehouse: "West DC", qty: 45, reorder: 40, price: 89.00, status: "low" as const },
  { sku: "MTR-500", name: "Motor 500W", category: "Machinery", warehouse: "East DC", qty: 78, reorder: 30, price: 145.00, status: "ok" as const },
  { sku: "CBL-CAT6", name: "Cat6 Cable (100ft)", category: "Networking", warehouse: "Main HQ", qty: 520, reorder: 200, price: 34.99, status: "ok" as const },
  { sku: "PCB-R3", name: "PCB Board Rev3", category: "Electronics", warehouse: "West DC", qty: 8, reorder: 25, price: 12.75, status: "critical" as const },
  { sku: "FAN-120", name: "Cooling Fan 120mm", category: "Components", warehouse: "East DC", qty: 190, reorder: 100, price: 9.99, status: "ok" as const },
  { sku: "PSU-750", name: "PSU 750W Gold", category: "Electronics", warehouse: "Main HQ", qty: 62, reorder: 50, price: 119.00, status: "low" as const },
];

const categoryData = [
  { name: "Components", count: 542 },
  { name: "Electronics", count: 115 },
  { name: "Machinery", count: 78 },
  { name: "Networking", count: 520 },
];

// ── Warehouse Data ──────────────────────────────────────────
const warehouses = [
  { id: "WH-001", name: "Main HQ Warehouse", location: "San Francisco, CA", capacity: 85, items: 4280, zones: 12, manager: "Sarah Chen", status: "operational" as const },
  { id: "WH-002", name: "West Distribution Center", location: "Portland, OR", capacity: 62, items: 2150, zones: 8, manager: "James Wilson", status: "operational" as const },
  { id: "WH-003", name: "East Distribution Center", location: "Atlanta, GA", capacity: 91, items: 5420, zones: 15, manager: "Maria Garcia", status: "maintenance" as const },
  { id: "WH-004", name: "South Fulfillment Hub", location: "Houston, TX", capacity: 34, items: 890, zones: 6, manager: "David Kim", status: "operational" as const },
];

// ── Transfer Data ───────────────────────────────────────────
const transfers = [
  { id: "TRF-4501", items: "Widget Alpha ×200", from: "West DC", to: "Main HQ", initiated: "Feb 12, 2026", eta: "Feb 14, 2026", status: "in_transit" as const, requester: "Lisa Park" },
  { id: "TRF-4498", items: "Sensor X10 ×50", from: "Main HQ", to: "East DC", initiated: "Feb 11, 2026", eta: "Feb 13, 2026", status: "in_transit" as const, requester: "Mike Ross" },
  { id: "TRF-4495", items: "Motor 500W ×30", from: "East DC", to: "South Hub", initiated: "Feb 10, 2026", eta: "Feb 12, 2026", status: "delivered" as const, requester: "Sarah Chen" },
  { id: "TRF-4490", items: "Cat6 Cable ×100", from: "Main HQ", to: "West DC", initiated: "Feb 9, 2026", eta: "Feb 11, 2026", status: "delivered" as const, requester: "James Wilson" },
  { id: "TRF-4488", items: "PCB Board Rev3 ×100", from: "South Hub", to: "Main HQ", initiated: "Feb 8, 2026", eta: "Feb 14, 2026", status: "pending" as const, requester: "David Kim" },
  { id: "TRF-4485", items: "PSU 750W ×25", from: "West DC", to: "East DC", initiated: "Feb 7, 2026", eta: "Feb 10, 2026", status: "delivered" as const, requester: "Maria Garcia" },
];

// ── Stat cards ──────────────────────────────────────────────
const stats = [
  { label: "Total SKUs", value: "12,847", change: "+124", trend: "up" as const, icon: Package },
  { label: "Warehouses", value: "4", change: "0", trend: "up" as const, icon: Warehouse },
  { label: "Low Stock Alerts", value: "18", change: "+3", trend: "down" as const, icon: AlertTriangle },
  { label: "Active Transfers", value: "2", change: "-1", trend: "up" as const, icon: ArrowRightLeft },
];

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
  const [tab, setTab] = useState<Tab>("stock");

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "stock", label: "Stock Levels", icon: Package },
    { key: "warehouses", label: "Warehouses", icon: Warehouse },
    { key: "transfers", label: "Transfers", icon: ArrowRightLeft },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track stock levels, manage warehouses, and monitor transfers.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            {tab === "stock" ? "Add Item" : tab === "warehouses" ? "Add Warehouse" : "New Transfer"}
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${s.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {s.label === "Low Stock Alerts" ? (
                    <TrendingUp className="w-3 h-3 text-destructive" />
                  ) : s.trend === "up" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span className={s.label === "Low Stock Alerts" ? "text-destructive" : ""}>{s.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "stock" && <StockTab />}
        {tab === "warehouses" && <WarehouseTab />}
        {tab === "transfers" && <TransferTab />}
      </div>
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════════════
// STOCK TAB
// ═══════════════════════════════════════════════════════════
function StockTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search by SKU, name, or category..." className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock Table */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Item</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">SKU</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Warehouse</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Qty</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Price</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((item) => {
                const sc = statusConfig[item.status];
                return (
                  <tr key={item.sku} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-primary">{item.sku}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{item.warehouse}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-sm font-semibold ${item.status === "critical" ? "text-destructive" : item.status === "low" ? "text-warning" : "text-foreground"}`}>
                        {item.qty}
                      </span>
                      <p className="text-[10px] text-muted-foreground">min: {item.reorder}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-foreground">${item.price.toFixed(2)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>
                        {item.status === "critical" && <AlertTriangle className="w-3 h-3" />}
                        {item.status === "ok" && <CheckCircle2 className="w-3 h-3" />}
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-1">By Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Stock distribution across categories</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} barSize={24}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
              <Tooltip
                contentStyle={{
                  background: "hsl(222,22%,11%)",
                  border: "1px solid hsl(220,18%,18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(210,20%,92%)",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Low stock alerts */}
          <div className="mt-5 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              Critical Stock Alerts
            </h4>
            <div className="space-y-2">
              {stockItems.filter((i) => i.status === "critical").map((item) => (
                <div key={item.sku} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sku} · {item.warehouse}</p>
                  </div>
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

// ═══════════════════════════════════════════════════════════
// WAREHOUSE TAB
// ═══════════════════════════════════════════════════════════
function WarehouseTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.map((wh) => {
          const sc = statusConfig[wh.status];
          const capacityColor =
            wh.capacity >= 85 ? "bg-destructive" : wh.capacity >= 60 ? "bg-warning" : "bg-success";

          return (
            <div key={wh.id} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Warehouse className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{wh.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {wh.location}
                    </div>
                  </div>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>
                  {sc.label}
                </span>
              </div>

              {/* Capacity Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-semibold text-foreground">{wh.capacity}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${capacityColor} transition-all duration-500`}
                    style={{ width: `${wh.capacity}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2.5 rounded-lg bg-muted/50">
                  <Box className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{wh.items.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Items</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-muted/50">
                  <MapPin className="w-4 h-4 text-info mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{wh.zones}</p>
                  <p className="text-[10px] text-muted-foreground">Zones</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-muted/50">
                  <Eye className="w-4 h-4 text-warning mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground truncate">{wh.manager.split(" ")[0]}</p>
                  <p className="text-[10px] text-muted-foreground">Manager</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TRANSFER TAB
// ═══════════════════════════════════════════════════════════
function TransferTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search transfers..." className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Transfer Cards */}
      <div className="space-y-3">
        {transfers.map((tr) => {
          const sc = statusConfig[tr.status];
          return (
            <div key={tr.id} className="glass-card rounded-xl p-5 hover:bg-card/90 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Transfer Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    tr.status === "in_transit" ? "bg-info/10" : tr.status === "pending" ? "bg-warning/10" : "bg-success/10"
                  }`}>
                    <ArrowRightLeft className={`w-5 h-5 ${
                      tr.status === "in_transit" ? "text-info" : tr.status === "pending" ? "text-warning" : "text-success"
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-primary">{tr.id}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{tr.items}</p>

                    {/* Route */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{tr.from}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{tr.to}</span>
                    </div>
                  </div>
                </div>

                {/* Right side meta */}
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-muted-foreground">Requested by</p>
                  <p className="text-sm font-medium text-foreground">{tr.requester}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 justify-end">
                    <Clock className="w-3 h-3" />
                    <span>ETA: {tr.eta}</span>
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
