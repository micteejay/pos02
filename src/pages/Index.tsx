import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import AppLayout from "@/components/AppLayout";

const revenueData = [
  { month: "Jul", revenue: 42000, orders: 320 },
  { month: "Aug", revenue: 48000, orders: 380 },
  { month: "Sep", revenue: 45000, orders: 350 },
  { month: "Oct", revenue: 55000, orders: 420 },
  { month: "Nov", revenue: 52000, orders: 400 },
  { month: "Dec", revenue: 68000, orders: 510 },
  { month: "Jan", revenue: 62000, orders: 480 },
  { month: "Feb", revenue: 71000, orders: 540 },
];

const departmentData = [
  { dept: "Sales", value: 85 },
  { dept: "Support", value: 72 },
  { dept: "Inventory", value: 91 },
  { dept: "HR", value: 68 },
  { dept: "Finance", value: 78 },
];

const statCards = [
  {
    label: "Total Revenue",
    value: "$71,240",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
    color: "primary",
  },
  {
    label: "Active Orders",
    value: "540",
    change: "+8.2%",
    trend: "up" as const,
    icon: ShoppingCart,
    color: "info",
  },
  {
    label: "Inventory Items",
    value: "12,847",
    change: "-2.1%",
    trend: "down" as const,
    icon: Package,
    color: "warning",
  },
  {
    label: "Active Users",
    value: "284",
    change: "+5.7%",
    trend: "up" as const,
    icon: Users,
    color: "success",
  },
];

const recentActivity = [
  {
    icon: CheckCircle2,
    title: "Purchase Order #4521 approved",
    time: "2 min ago",
    color: "text-success",
  },
  {
    icon: AlertTriangle,
    title: "Low stock alert: Widget-A (12 remaining)",
    time: "15 min ago",
    color: "text-warning",
  },
  {
    icon: MessageSquare,
    title: "New message in #sales-team",
    time: "32 min ago",
    color: "text-info",
  },
  {
    icon: FileText,
    title: "Invoice INV-2024-089 generated",
    time: "1 hr ago",
    color: "text-primary",
  },
  {
    icon: Users,
    title: "3 new users onboarded",
    time: "2 hrs ago",
    color: "text-muted-foreground",
  },
];

const pendingApprovals = [
  { id: "WF-4521", type: "Purchase Order", amount: "$12,450", requester: "Sarah Chen", urgency: "high" },
  { id: "WF-4518", type: "Expense Report", amount: "$2,340", requester: "Mike Ross", urgency: "medium" },
  { id: "WF-4515", type: "Stock Transfer", amount: "500 units", requester: "Lisa Park", urgency: "low" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back. Here's your organization at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Last updated: just now</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trend === "up" ? "text-success" : "text-destructive"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Revenue Overview</h3>
                <p className="text-xs text-muted-foreground">Monthly revenue & order trends</p>
              </div>
              <button className="text-xs text-primary flex items-center gap-1 hover:underline">
                View Report <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
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
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 91%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(172, 66%, 40%)"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Department Performance */}
          <div className="glass-card rounded-xl p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Department KPIs</h3>
              <p className="text-xs text-muted-foreground">Performance scores</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={departmentData} layout="vertical" barSize={14}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" width={60} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 91%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(172, 66%, 40%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
              <button className="text-xs text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
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

          {/* Pending Approvals */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Pending Approvals</h3>
              <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">
                {pendingApprovals.length} pending
              </span>
            </div>
            <div className="space-y-3">
              {pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-primary">{item.id}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.urgency === "high"
                            ? "bg-destructive"
                            : item.urgency === "medium"
                            ? "bg-warning"
                            : "bg-success"
                        }`}
                      />
                    </div>
                    <p className="text-sm text-foreground mt-0.5">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.requester} · {item.amount}</p>
                  </div>
                  <button className="text-xs text-primary font-medium hover:underline shrink-0">
                    Review
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
