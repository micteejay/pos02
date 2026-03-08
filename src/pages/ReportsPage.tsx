import { useState, useMemo, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";
import { useAppEvents } from "@/hooks/use-app-events";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart,
  Download, Calendar, FileText, PieChart as PieIcon, Printer,
  Building2, Warehouse, ClipboardCheck, Activity,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

type ReportType = "overview" | "sales" | "inventory" | "operations";

const tooltipStyle = {
  background: "hsl(222,22%,11%)",
  border: "1px solid hsl(220,18%,18%)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(210,20%,92%)",
};

export default function ReportsPage() {
  const { settings, formatCurrency, users } = useAppSettings();
  const { inventory, sales, stores, warehouses } = useSharedData();
  const { approvalItems } = useAppEvents();
  const [reportType, setReportType] = useState<ReportType>("overview");
  const [dateRange, setDateRange] = useState("6months");
  const printRef = useRef<HTMLDivElement>(null);

  // Derive revenue data from actual sales
  const monthlyRevenue = useMemo(() => {
    if (sales.length === 0) return [];
    const grouped: Record<string, { revenue: number; expenses: number }> = {};
    sales.forEach(sale => {
      const d = new Date(sale.date);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      if (!grouped[key]) grouped[key] = { revenue: 0, expenses: 0 };
      grouped[key].revenue += sale.total;
      grouped[key].expenses += sale.total * 0.6; // estimate
    });
    return Object.entries(grouped).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
    }));
  }, [sales]);

  // Derive sales by store from actual sales
  const salesByStore = useMemo(() => {
    if (sales.length === 0) return [];
    const counts: Record<string, number> = {};
    sales.forEach(s => { counts[s.store] = (counts[s.store] || 0) + s.total; });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    const colors = ["hsl(172,66%,50%)", "hsl(205,80%,55%)", "hsl(38,92%,50%)", "hsl(152,60%,45%)"];
    return Object.entries(counts).map(([name, value], i) => ({
      name, value: total > 0 ? Math.round((value / total) * 100) : 0, color: colors[i % colors.length],
    }));
  }, [sales]);

  // Top products from sales
  const topProducts = useMemo(() => {
    if (sales.length === 0) return [];
    const map: Record<string, { units: number; revenue: number }> = {};
    sales.forEach(s => s.items.forEach(item => {
      if (!map[item.name]) map[item.name] = { units: 0, revenue: 0 };
      map[item.name].units += item.qty;
      map[item.name].revenue += item.qty * item.price;
    }));
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  // Warehouse utilization from org data
  const warehouseUtil = useMemo(() => {
    return warehouses.map(w => ({
      name: w.name,
      capacity: w.capacity,
      items: inventory.filter(i => i.warehouse === w.name).reduce((s, i) => s + i.qty, 0),
    }));
  }, [warehouses, inventory]);

  // Approval metrics from actual data
  const approvalStats = useMemo(() => {
    const approved = approvalItems.filter(a => a.status === "approved").length;
    const rejected = approvalItems.filter(a => a.status === "rejected").length;
    const pending = approvalItems.filter(a => a.status === "pending").length;
    return { approved, rejected, pending };
  }, [approvalItems]);

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const totalInventoryValue = inventory.reduce((s, i) => s + i.qty * i.price, 0);

  const stats = useMemo(() => [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), change: sales.length > 0 ? `${sales.length} sales` : "—", trend: "up" as const, icon: DollarSign },
    { label: "Total Orders", value: sales.length.toLocaleString(), change: "", trend: "up" as const, icon: ShoppingCart },
    { label: "Inventory Value", value: formatCurrency(totalInventoryValue), change: `${inventory.length} items`, trend: "up" as const, icon: Package },
    { label: "Active Users", value: users.filter(u => u.status === "active").length.toString(), change: "", trend: "up" as const, icon: Users },
  ], [formatCurrency, totalRevenue, sales, totalInventoryValue, inventory, users]);

  const tabs: { key: ReportType; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "sales", label: "Sales", icon: DollarSign },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "operations", label: "Operations", icon: Activity },
  ];

  const exportCSV = () => {
    let csv = "";
    if (reportType === "overview" || reportType === "sales") {
      csv = "Month,Revenue,Expenses,Profit\n" + monthlyRevenue.map(r => `${r.month},${r.revenue},${r.expenses},${r.profit}`).join("\n");
    } else if (reportType === "inventory") {
      csv = "Warehouse,Items,Capacity\n" + warehouseUtil.map(r => `${r.name},${r.items},${r.capacity}%`).join("\n");
    } else {
      csv = `Approved,${approvalStats.approved}\nRejected,${approvalStats.rejected}\nPending,${approvalStats.pending}`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${settings.appName} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0; }
        .stat-card { border: 1px solid #eee; border-radius: 8px; padding: 16px; }
        .stat-value { font-size: 22px; font-weight: 700; }
        .stat-label { font-size: 12px; color: #666; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
      </style></head><body>
      <h1>${settings.appName}</h1>
      <p class="subtitle">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report — Generated ${new Date().toLocaleDateString()}</p>
      <div class="stat-grid">
        ${stats.map(s => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}
      </div>
      <div class="footer">Generated by ${settings.appName} · ${new Date().toLocaleString()}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const hasData = sales.length > 0 || inventory.length > 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in" ref={printRef}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Analytics, insights, and performance metrics across all modules.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
            <button onClick={printReport} className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
              <Printer className="w-4 h-4" />Print
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />Export
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 sm:p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                {s.change && (
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    {s.change}
                  </div>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setReportType(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${reportType === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {!hasData && (
          <div className="glass-card rounded-xl p-10 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">No data to report</h3>
            <p className="text-sm text-muted-foreground mt-1">Add inventory items and complete sales to generate reports.</p>
          </div>
        )}

        {/* Overview */}
        {hasData && reportType === "overview" && (
          <div className="space-y-4 animate-fade-in">
            {monthlyRevenue.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 glass-card rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-1">Revenue vs Expenses</h3>
                  <p className="text-xs text-muted-foreground mb-4">Monthly financial performance</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyRevenue}>
                      <defs>
                        <linearGradient id="revGradR" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(172,66%,50%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(172,66%,50%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(0,72%,51%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(0,72%,51%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,18%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `${settings.currencySymbol}${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(172,66%,50%)" strokeWidth={2} fill="url(#revGradR)" />
                      <Area type="monotone" dataKey="expenses" stroke="hsl(0,72%,51%)" strokeWidth={2} fill="url(#expGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {salesByStore.length > 0 && (
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground mb-1">Sales by Store</h3>
                    <p className="text-xs text-muted-foreground mb-4">Revenue distribution</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={salesByStore} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                          {salesByStore.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {salesByStore.map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                            <span className="text-muted-foreground">{s.name}</span>
                          </div>
                          <span className="font-semibold text-foreground">{s.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {topProducts.length > 0 && (
              <div className="glass-card rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Top Products by Revenue</h3>
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          <span className="text-sm font-semibold text-primary">{formatCurrency(p.revenue)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">{p.units} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sales */}
        {hasData && reportType === "sales" && (
          <div className="space-y-4 animate-fade-in">
            {monthlyRevenue.length > 0 ? (
              <>
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-1">Profit Trend</h3>
                  <p className="text-xs text-muted-foreground mb-4">Monthly profit from revenue minus expenses</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,18%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `${settings.currencySymbol}${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                      <Line type="monotone" dataKey="profit" stroke="hsl(152,60%,45%)" strokeWidth={3} dot={{ fill: "hsl(152,60%,45%)", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground mb-4">Revenue Breakdown</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyRevenue} barSize={20}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `${settings.currencySymbol}${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                        <Bar dataKey="revenue" fill="hsl(172,66%,50%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {salesByStore.length > 0 && (
                    <div className="glass-card rounded-xl p-5">
                      <h3 className="font-semibold text-foreground mb-4">Store Comparison</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={salesByStore} layout="vertical" barSize={16}>
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" width={80} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`]} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {salesByStore.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="glass-card rounded-xl p-10 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sales data yet. Complete sales in POS to see charts.</p>
              </div>
            )}
          </div>
        )}

        {/* Inventory */}
        {hasData && reportType === "inventory" && (
          <div className="space-y-4 animate-fade-in">
            {warehouseUtil.length > 0 ? (
              <div className="glass-card rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Warehouse Utilization</h3>
                <div className="space-y-4">
                  {warehouseUtil.map((wh) => (
                    <div key={wh.name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{wh.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{wh.items.toLocaleString()} items</span>
                          <span className={`text-xs font-semibold ${wh.capacity > 85 ? "text-destructive" : wh.capacity > 70 ? "text-warning" : "text-success"}`}>{wh.capacity}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${wh.capacity > 85 ? "bg-destructive" : wh.capacity > 70 ? "bg-warning" : "bg-primary"}`} style={{ width: `${wh.capacity}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-10 text-center">
                <Warehouse className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No warehouses configured. Add warehouses in Organization.</p>
              </div>
            )}
          </div>
        )}

        {/* Operations */}
        {hasData && reportType === "operations" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-5 text-center">
                <ClipboardCheck className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{approvalStats.approved}</p>
                <p className="text-xs text-muted-foreground">Total Approved</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <Activity className="w-8 h-8 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{approvalStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <Building2 className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{approvalStats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
