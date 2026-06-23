import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart,
  ArrowUpRight, Clock, AlertTriangle, CheckCircle2, MessageSquare, FileText,
  Truck, GitBranch, Building2, Download, Loader2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";
import { useAppEvents } from "@/hooks/use-app-events";
import { useUpdater } from "@/hooks/use-updater";
import AISalesInsights from "@/components/AISalesInsights";

const colorMap = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  info: { bg: "bg-info/10", text: "text-info" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  success: { bg: "bg-success/10", text: "text-success" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { formatCurrency, settings, users } = useAppSettings();
  const { inventory, sales, stores, warehouses } = useSharedData();
  const { approvalItems, notifications } = useAppEvents();
  const { update, installUpdate, isDownloading, downloadProgress } = useUpdater();

  if (user?.role === "Sales Rep") {
    return <Navigate to="/pos" replace />;
  }

  const totalRevenue = useMemo(() => sales.reduce((s, sale) => s + sale.total, 0), [sales]);
  const lowStockAlerts = useMemo(() => inventory.filter(i => i.status === "critical" || i.status === "low"), [inventory]);
  const pendingApprovals = useMemo(() => approvalItems.filter(a => a.status === "pending"), [approvalItems]);

  const statCards = useMemo(() => [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), change: sales.length > 0 ? `${sales.length} sales` : "No sales yet", trend: "up" as const, icon: DollarSign, colorClass: colorMap.primary },
    { label: "Active Orders", value: sales.length.toString(), change: "", trend: "up" as const, icon: ShoppingCart, colorClass: colorMap.info },
    { label: "Inventory Items", value: inventory.length.toLocaleString(), change: `${lowStockAlerts.length} alerts`, trend: lowStockAlerts.length > 0 ? "down" as const : "up" as const, icon: Package, colorClass: colorMap.warning },
    { label: "Active Users", value: users.filter(u => u.status === "active").length.toString(), change: "", trend: "up" as const, icon: Users, colorClass: colorMap.success },
  ], [formatCurrency, users, totalRevenue, sales, inventory, lowStockAlerts]);

  // Build revenue data from sales
  const revenueData = useMemo(() => {
    if (sales.length === 0) return [];
    const grouped: Record<string, { revenue: number; orders: number }> = {};
    sales.forEach(sale => {
      const d = new Date(sale.date);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      if (!grouped[key]) grouped[key] = { revenue: 0, orders: 0 };
      grouped[key].revenue += sale.total;
      grouped[key].orders += 1;
    });
    return Object.entries(grouped).map(([month, data]) => ({ month, ...data }));
  }, [sales]);

  const recentActivity = useMemo(() => {
    return notifications.slice(0, 6).map(n => ({
      icon: n.type === "approval" ? CheckCircle2 : n.type === "inventory" ? AlertTriangle : n.type === "workflow" ? GitBranch : n.type === "chat" ? MessageSquare : FileText,
      title: n.title,
      time: n.time || "just now",
      color: n.type === "approval" ? "text-success" : n.type === "inventory" ? "text-warning" : "text-info",
    }));
  }, [notifications]);

  const supplyChainSummary = useMemo(() => [
    { label: "Stores", value: stores.length.toString(), icon: Building2 },
    { label: "Warehouses", value: warehouses.length.toString(), icon: Truck },
    { label: "Stock Items", value: inventory.length.toString(), icon: Package },
    { label: "Pending POs", value: pendingApprovals.filter(a => a.type === "purchase_order").length.toString(), icon: FileText },
  ], [stores, warehouses, inventory, pendingApprovals]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your organization at a glance.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Last updated: just now</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300 group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.colorClass.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.colorClass.text}`} />
                </div>
                {stat.change && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend === "up" ? "text-success" : "text-destructive"}`}>
                    {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Overview */}
          <div className="lg:col-span-2 glass-card rounded-xl p-5 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Revenue Overview</h3>
              <p className="text-xs text-muted-foreground">From recorded sales</p>
            </div>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `${settings.currencySymbol}${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(172, 66%, 40%)" strokeWidth={2} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <h4 className="font-semibold text-sm text-foreground">No sales data yet</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">Complete sales in POS to see revenue charts here.</p>
              </div>
            )}
          </div>

          {/* Inventory by Warehouse */}
          <div className="glass-card rounded-xl p-5 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Inventory by Warehouse</h3>
              <p className="text-xs text-muted-foreground">Stock distribution</p>
            </div>
            {(() => {
              const warehouseStock = warehouses.map(w => ({
                name: w.name.length > 12 ? w.name.substring(0, 12) + "…" : w.name,
                value: inventory.filter(i => i.warehouse === w.name).reduce((s, i) => s + i.qty, 0),
              }));
              return warehouseStock.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={warehouseStock} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(172, 66%, 40%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center text-center">
                  <Package className="w-12 h-12 text-muted-foreground/20 mb-3" />
                  <h4 className="font-semibold text-sm text-foreground">No warehouse stock</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">Add stock and warehouses to see the distribution chart.</p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Supply Chain + Inventory Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Organization Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {supplyChainSummary.map((s) => (
                <div key={s.label} className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                  <s.icon className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Inventory Alerts</h3>
                {lowStockAlerts.length > 0 && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">{lowStockAlerts.length} critical</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {lowStockAlerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">All stock levels are healthy.</p>}
              {lowStockAlerts.slice(0, 5).map((item) => (
                <div key={item.sku} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${item.status === "critical" ? "text-destructive" : "text-warning"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sku} · {item.warehouse}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.status === "critical" ? "text-destructive" : "text-warning"}`}>{item.qty}</p>
                    <p className="text-[10px] text-muted-foreground">/ {item.reorder} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <AISalesInsights />

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Pending Approvals</h3>
              <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">{pendingApprovals.length} pending</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingApprovals.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.requester} · {item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Update Button */}
      {update && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <button
            onClick={installUpdate}
            disabled={isDownloading}
            className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-full shadow-lg shadow-primary/30 transition-all hover:-translate-y-1"
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5 animate-bounce" />
            )}
            <div className="text-left flex flex-col">
              <span className="text-sm font-bold leading-tight">
                {isDownloading ? "Downloading..." : "Update Available"}
              </span>
              <span className="text-[10px] opacity-80 leading-tight">
                {isDownloading 
                  ? `${downloadProgress}% completed` 
                  : `Version ${update.version} is ready`}
              </span>
            </div>
          </button>
        </div>
      )}
    </AppLayout>
  );
}
