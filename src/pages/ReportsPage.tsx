import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart,
  Download, Filter, Calendar, FileText, PieChart as PieIcon, ArrowUp, ArrowDown,
  Building2, Warehouse, ClipboardCheck, Activity,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

type ReportType = "overview" | "sales" | "inventory" | "operations";

const monthlyRevenue = [
  { month: "Sep", revenue: 42000, expenses: 28000, profit: 14000 },
  { month: "Oct", revenue: 48000, expenses: 30000, profit: 18000 },
  { month: "Nov", revenue: 52000, expenses: 31000, profit: 21000 },
  { month: "Dec", revenue: 61000, expenses: 35000, profit: 26000 },
  { month: "Jan", revenue: 55000, expenses: 32000, profit: 23000 },
  { month: "Feb", revenue: 58000, expenses: 33000, profit: 25000 },
];

const salesByStore = [
  { name: "Main HQ", value: 38, color: "hsl(172,66%,50%)" },
  { name: "West Store", value: 25, color: "hsl(205,80%,55%)" },
  { name: "East Store", value: 22, color: "hsl(38,92%,50%)" },
  { name: "South Hub", value: 15, color: "hsl(152,60%,45%)" },
];

const topProducts = [
  { name: "Motor 500W", units: 234, revenue: 33930 },
  { name: "PSU 750W Gold", units: 198, revenue: 23562 },
  { name: "Sensor X10", units: 312, revenue: 27768 },
  { name: "Cat6 Cable", units: 450, revenue: 15745 },
  { name: "Widget Beta", units: 520, revenue: 9620 },
];

const inventoryTrend = [
  { week: "W1", inbound: 1200, outbound: 980, stockLevel: 12400 },
  { week: "W2", inbound: 850, outbound: 1100, stockLevel: 12150 },
  { week: "W3", inbound: 1500, outbound: 900, stockLevel: 12750 },
  { week: "W4", inbound: 1100, outbound: 1200, stockLevel: 12650 },
];

const warehouseUtil = [
  { name: "Main HQ", capacity: 85, items: 4280 },
  { name: "West DC", capacity: 62, items: 2150 },
  { name: "East DC", capacity: 91, items: 5420 },
  { name: "South Hub", capacity: 34, items: 890 },
];

const approvalMetrics = [
  { month: "Sep", approved: 18, rejected: 3, pending: 2 },
  { month: "Oct", approved: 22, rejected: 4, pending: 1 },
  { month: "Nov", approved: 19, rejected: 2, pending: 3 },
  { month: "Dec", approved: 25, rejected: 5, pending: 2 },
  { month: "Jan", approved: 21, rejected: 3, pending: 4 },
  { month: "Feb", approved: 23, rejected: 3, pending: 4 },
];

const stats = [
  { label: "Total Revenue", value: "$316K", change: "+12.4%", trend: "up" as const, icon: DollarSign },
  { label: "Total Orders", value: "2,847", change: "+8.2%", trend: "up" as const, icon: ShoppingCart },
  { label: "Inventory Value", value: "$1.2M", change: "-2.1%", trend: "down" as const, icon: Package },
  { label: "Active Employees", value: "347", change: "+4", trend: "up" as const, icon: Users },
];

const tooltipStyle = {
  background: "hsl(222,22%,11%)",
  border: "1px solid hsl(220,18%,18%)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(210,20%,92%)",
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("overview");
  const [dateRange, setDateRange] = useState("6months");

  const tabs: { key: ReportType; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "sales", label: "Sales", icon: DollarSign },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "operations", label: "Operations", icon: Activity },
  ];

  const exportCSV = () => {
    const data = monthlyRevenue.map((r) => `${r.month},${r.revenue},${r.expenses},${r.profit}`).join("\n");
    const csv = `Month,Revenue,Expenses,Profit\n${data}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
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
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              Export
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
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setReportType(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${reportType === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {reportType === "overview" && (
          <div className="space-y-4 animate-fade-in">
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
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`]} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(172,66%,50%)" strokeWidth={2} fill="url(#revGradR)" />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(0,72%,51%)" strokeWidth={2} fill="url(#expGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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
            </div>

            {/* Top Products */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Top Products by Revenue</h3>
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4">
                    <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        <span className="text-sm font-semibold text-primary">${p.revenue.toLocaleString()}</span>
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
          </div>
        )}

        {/* Sales */}
        {reportType === "sales" && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-1">Profit Trend</h3>
              <p className="text-xs text-muted-foreground mb-4">Monthly profit from revenue minus expenses</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,18%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`]} />
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
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`]} />
                    <Bar dataKey="revenue" fill="hsl(172,66%,50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
            </div>
          </div>
        )}

        {/* Inventory */}
        {reportType === "inventory" && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-1">Stock Movement</h3>
              <p className="text-xs text-muted-foreground mb-4">Inbound vs outbound stock flow</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={inventoryTrend} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,18%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="inbound" fill="hsl(172,66%,50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outbound" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
          </div>
        )}

        {/* Operations */}
        {reportType === "operations" && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-1">Approval Metrics</h3>
              <p className="text-xs text-muted-foreground mb-4">Monthly approval workflow performance</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={approvalMetrics} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,18%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="approved" fill="hsl(152,60%,45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-5 text-center">
                <ClipboardCheck className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">128</p>
                <p className="text-xs text-muted-foreground">Total Approvals (6mo)</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <Activity className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">1.4 days</p>
                <p className="text-xs text-muted-foreground">Avg Resolution Time</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <Building2 className="w-8 h-8 text-info mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">4</p>
                <p className="text-xs text-muted-foreground">Active Departments</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
