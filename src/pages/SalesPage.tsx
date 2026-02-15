import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  CreditCard,
  Banknote,
  Search,
  Filter,
  Eye,
  MoreHorizontal,
  ArrowUpRight,
  Clock,
  Star,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

type Tab = "transactions" | "analytics" | "reps";

const revenueData = [
  { day: "Mon", revenue: 4200, orders: 38 },
  { day: "Tue", revenue: 5100, orders: 45 },
  { day: "Wed", revenue: 3800, orders: 32 },
  { day: "Thu", revenue: 6200, orders: 52 },
  { day: "Fri", revenue: 7400, orders: 61 },
  { day: "Sat", revenue: 8900, orders: 74 },
  { day: "Sun", revenue: 5600, orders: 47 },
];

const transactions = [
  { id: "TXN-9201", customer: "John Rivera", items: 3, total: 247.50, method: "Credit Card", store: "Main HQ", rep: "Alice Chen", time: "2:34 PM", status: "completed" as const },
  { id: "TXN-9200", customer: "Sara Mitchell", items: 1, total: 89.00, method: "Cash", store: "West Store", rep: "Bob Tran", time: "2:18 PM", status: "completed" as const },
  { id: "TXN-9199", customer: "Mike Thompson", items: 5, total: 512.75, method: "Credit Card", store: "Main HQ", rep: "Alice Chen", time: "1:55 PM", status: "completed" as const },
  { id: "TXN-9198", customer: "Emily Watts", items: 2, total: 164.00, method: "Debit Card", store: "East Store", rep: "Diana Lee", time: "1:30 PM", status: "refunded" as const },
  { id: "TXN-9197", customer: "Carlos Diaz", items: 4, total: 328.20, method: "Credit Card", store: "Main HQ", rep: "Frank Kim", time: "12:45 PM", status: "completed" as const },
  { id: "TXN-9196", customer: "Linda Park", items: 1, total: 45.99, method: "Mobile Pay", store: "South Hub", rep: "Grace Wu", time: "12:10 PM", status: "completed" as const },
  { id: "TXN-9195", customer: "David Brown", items: 6, total: 689.40, method: "Credit Card", store: "West Store", rep: "Bob Tran", time: "11:42 AM", status: "completed" as const },
  { id: "TXN-9194", customer: "Rachel Green", items: 2, total: 175.00, method: "Cash", store: "Main HQ", rep: "Alice Chen", time: "11:05 AM", status: "pending" as const },
];

const salesReps = [
  { name: "Alice Chen", store: "Main HQ", sales: 142, revenue: 18420, target: 20000, avgTicket: 129.72, rating: 4.8, trend: "up" as const },
  { name: "Bob Tran", store: "West Store", sales: 118, revenue: 15890, target: 16000, avgTicket: 134.66, rating: 4.6, trend: "up" as const },
  { name: "Diana Lee", store: "East Store", sales: 95, revenue: 11200, target: 14000, avgTicket: 117.89, rating: 4.4, trend: "down" as const },
  { name: "Frank Kim", store: "Main HQ", sales: 130, revenue: 16750, target: 18000, avgTicket: 128.85, rating: 4.7, trend: "up" as const },
  { name: "Grace Wu", store: "South Hub", sales: 88, revenue: 9850, target: 12000, avgTicket: 111.93, rating: 4.3, trend: "down" as const },
];

const paymentBreakdown = [
  { name: "Credit Card", value: 58, color: "hsl(172,66%,50%)" },
  { name: "Cash", value: 22, color: "hsl(205,80%,55%)" },
  { name: "Debit Card", value: 12, color: "hsl(38,92%,50%)" },
  { name: "Mobile Pay", value: 8, color: "hsl(152,60%,45%)" },
];

const hourlyData = [
  { hour: "9AM", sales: 12 }, { hour: "10AM", sales: 18 }, { hour: "11AM", sales: 24 },
  { hour: "12PM", sales: 31 }, { hour: "1PM", sales: 28 }, { hour: "2PM", sales: 22 },
  { hour: "3PM", sales: 19 }, { hour: "4PM", sales: 26 }, { hour: "5PM", sales: 34 },
  { hour: "6PM", sales: 29 }, { hour: "7PM", sales: 15 }, { hour: "8PM", sales: 8 },
];

const stats = [
  { label: "Today's Revenue", value: "$12,480", change: "+12.4%", trend: "up" as const, icon: DollarSign },
  { label: "Transactions", value: "94", change: "+8", trend: "up" as const, icon: ShoppingCart },
  { label: "Avg. Ticket", value: "$132.77", change: "+$4.20", trend: "up" as const, icon: Receipt },
  { label: "Active Reps", value: "5", change: "0", trend: "up" as const, icon: Users },
];

const statusConfig = {
  completed: { label: "Completed", className: "bg-success/10 text-success" },
  refunded: { label: "Refunded", className: "bg-destructive/10 text-destructive" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
};

const methodIcons: Record<string, React.ElementType> = {
  "Credit Card": CreditCard,
  "Debit Card": CreditCard,
  "Cash": Banknote,
  "Mobile Pay": DollarSign,
};

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>("transactions");

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "transactions", label: "Transactions", icon: Receipt },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "reps", label: "Sales Reps", icon: Users },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor transactions, track revenue, and measure rep performance.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <ShoppingCart className="w-4 h-4" />
            New Sale
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${s.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{s.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "transactions" && <TransactionsTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "reps" && <RepsTab />}
      </div>
    </AppLayout>
  );
}

function TransactionsTab() {
  const [search, setSearch] = useState("");
  const filtered = transactions.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.rep.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Transaction</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Customer</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Payment</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Store</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Rep</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Total</th>
              <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((txn) => {
              const sc = statusConfig[txn.status];
              const MethodIcon = methodIcons[txn.method] || DollarSign;
              return (
                <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-3">
                    <p className="text-xs font-mono text-primary">{txn.id}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {txn.time}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground">{txn.customer}</p>
                    <p className="text-xs text-muted-foreground">{txn.items} item{txn.items !== 1 ? "s" : ""}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MethodIcon className="w-3.5 h-3.5" />
                      {txn.method}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{txn.store}</td>
                  <td className="px-5 py-3 text-sm text-foreground">{txn.rep}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-foreground">${txn.total.toFixed(2)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>
                      {sc.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-1">Weekly Revenue</h3>
          <p className="text-xs text-muted-foreground mb-4">Revenue trend over the past 7 days</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(172,66%,50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(172,66%,50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  background: "hsl(222,22%,11%)",
                  border: "1px solid hsl(220,18%,18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(210,20%,92%)",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(172,66%,50%)" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-1">Payment Methods</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution by payment type</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={paymentBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                stroke="none"
              >
                {paymentBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(222,22%,11%)",
                  border: "1px solid hsl(220,18%,18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(210,20%,92%)",
                }}
                formatter={(value: number) => [`${value}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {paymentBreakdown.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-muted-foreground">{p.name}</span>
                </div>
                <span className="font-semibold text-foreground">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Sales */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-1">Hourly Sales Volume</h3>
        <p className="text-xs text-muted-foreground mb-4">Number of transactions per hour today</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyData} barSize={20}>
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
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
            <Bar dataKey="sales" fill="hsl(205,80%,55%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RepsTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {salesReps.map((rep) => {
          const progress = Math.round((rep.revenue / rep.target) * 100);
          const progressColor = progress >= 90 ? "bg-success" : progress >= 70 ? "bg-warning" : "bg-destructive";

          return (
            <div key={rep.name} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {rep.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{rep.name}</h3>
                    <p className="text-xs text-muted-foreground">{rep.store}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  <span className="font-semibold text-foreground">{rep.rating}</span>
                </div>
              </div>

              {/* Target Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" /> Target Progress
                  </span>
                  <span className="font-semibold text-foreground">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${progressColor} transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>${rep.revenue.toLocaleString()}</span>
                  <span>${rep.target.toLocaleString()}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-sm font-bold text-foreground">{rep.sales}</p>
                  <p className="text-[10px] text-muted-foreground">Sales</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-sm font-bold text-foreground">${rep.avgTicket.toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Ticket</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className={`flex items-center justify-center gap-0.5 text-sm font-bold ${rep.trend === "up" ? "text-success" : "text-destructive"}`}>
                    {rep.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Trend</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
