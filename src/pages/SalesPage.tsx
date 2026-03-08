import { useState, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useSharedData } from "@/hooks/use-shared-data";
import { useAppSettings } from "@/hooks/use-app-settings";
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
  Eye,
  ArrowUpRight,
  Clock,
  Star,
  Target,
  Plus,
  X,
  Check,
  Trash2,
  Filter,
  ArrowUp,
  ArrowDown,
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

// --- Types ---
interface Transaction {
  id: string;
  customer: string;
  items: number;
  total: number;
  method: string;
  store: string;
  rep: string;
  time: string;
  status: "completed" | "refunded" | "pending";
  date: string;
}

type Tab = "transactions" | "analytics" | "reps";
type SortKey = "time" | "total" | "customer";

// --- Initial Data ---
const initialTransactions: Transaction[] = [];

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

const statuses = ["All Status", "completed", "refunded", "pending"];
const methods = ["All Methods", "Credit Card", "Cash", "Debit Card", "Mobile Pay"];

export default function SalesPage() {
  const { storeNames, stores } = useSharedData();
  const { users } = useAppSettings();
  const dynamicStoreFilters = useMemo(() => ["All Stores", ...storeNames], [storeNames]);
  const [tab, setTab] = useState<Tab>("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [showNewSale, setShowNewSale] = useState(false);

  // Computed stats from actual transactions
  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const totalRevenue = completed.reduce((s, t) => s + t.total, 0);
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;
    return [
      { label: "Today's Revenue", value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: transactions.length > 0 ? `${transactions.length} sales` : "", trend: "up" as const, icon: DollarSign },
      { label: "Transactions", value: transactions.length.toString(), change: "", trend: "up" as const, icon: ShoppingCart },
      { label: "Avg. Ticket", value: `$${avgTicket.toFixed(2)}`, change: "", trend: "up" as const, icon: Receipt },
      { label: "Active Reps", value: users.filter(u => u.status === "active").length.toString(), change: "", trend: "up" as const, icon: Users },
    ];
  }, [transactions]);

  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((t) => { counts[t.method] = (counts[t.method] || 0) + 1; });
    const total = transactions.length;
    const colors: Record<string, string> = { "Credit Card": "hsl(172,66%,50%)", Cash: "hsl(205,80%,55%)", "Debit Card": "hsl(38,92%,50%)", "Mobile Pay": "hsl(152,60%,45%)" };
    return Object.entries(counts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      color: colors[name] || "hsl(220,10%,50%)",
    }));
  }, [transactions]);

  const addTransaction = useCallback((data: { customer: string; total: number; method: string; store: string; rep: string; items: number }) => {
    const newTxn: Transaction = {
      id: `TXN-${9202 + transactions.length}`,
      ...data,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      status: "completed",
      date: new Date().toISOString().split("T")[0],
    };
    setTransactions((prev) => [newTxn, ...prev]);
    setShowNewSale(false);
  }, [transactions.length]);

  const updateStatus = useCallback((id: string, status: Transaction["status"]) => {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "transactions", label: "Transactions", icon: Receipt },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "reps", label: "Sales Reps", icon: Users },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor transactions, track revenue, and measure rep performance.</p>
          </div>
          <button
            onClick={() => setShowNewSale(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sale
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 sm:p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium ${s.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{s.change}</span>
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* New Sale Modal */}
        {showNewSale && <NewSaleModal onAdd={addTransaction} onClose={() => setShowNewSale(false)} storeNames={storeNames} users={users} />}

        {tab === "transactions" && (
          <TransactionsTab transactions={transactions} onUpdateStatus={updateStatus} onDelete={deleteTransaction} storeFilters={dynamicStoreFilters} />
        )}
        {tab === "analytics" && <AnalyticsTab paymentBreakdown={paymentBreakdown} transactions={transactions} />}
        {tab === "reps" && <RepsTab users={users} storeNames={storeNames} />}
      </div>
    </AppLayout>
  );
}

// --- New Sale Modal ---
function NewSaleModal({ onAdd, onClose, storeNames, users }: { onAdd: (data: any) => void; onClose: () => void; storeNames: string[]; users: { name: string; status: string }[] }) {
  const activeUsers = users.filter(u => u.status === "active");
  const [customer, setCustomer] = useState("");
  const [total, setTotal] = useState("");
  const [items, setItems] = useState("1");
  const [method, setMethod] = useState("Credit Card");
  const [store, setStore] = useState(storeNames[0] || "");
  const [rep, setRep] = useState(activeUsers[0]?.name || "");

  const handleSubmit = () => {
    if (!customer || !total) return;
    onAdd({ customer, total: parseFloat(total), items: parseInt(items), method, store, rep });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">New Sale</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Enter customer name" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total ($)</label>
              <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Items</label>
              <Input type="number" value={items} onChange={(e) => setItems(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option>Credit Card</option>
              <option>Cash</option>
              <option>Debit Card</option>
              <option>Mobile Pay</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Store</label>
              <select value={store} onChange={(e) => setStore(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                <option>Main HQ</option>
                <option>West Store</option>
                <option>East Store</option>
                <option>South Hub</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sales Rep</label>
              <select value={rep} onChange={(e) => setRep(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                {salesReps.map((r) => <option key={r.name}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!customer || !total} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Check className="w-4 h-4 inline mr-1" /> Create Sale
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Transactions Tab ---
function TransactionsTab({ transactions, onUpdateStatus, onDelete }: {
  transactions: Transaction[];
  onUpdateStatus: (id: string, status: Transaction["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [methodFilter, setMethodFilter] = useState("All Methods");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = transactions.filter((t) => {
      const matchSearch = !search || t.id.toLowerCase().includes(search.toLowerCase()) || t.customer.toLowerCase().includes(search.toLowerCase()) || t.rep.toLowerCase().includes(search.toLowerCase());
      const matchStore = storeFilter === "All Stores" || t.store === storeFilter;
      const matchStatus = statusFilter === "All Status" || t.status === statusFilter;
      const matchMethod = methodFilter === "All Methods" || t.method === methodFilter;
      return matchSearch && matchStore && matchStatus && matchMethod;
    });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "total") cmp = a.total - b.total;
      else if (sortKey === "customer") cmp = a.customer.localeCompare(b.customer);
      else cmp = a.time.localeCompare(b.time);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [transactions, search, storeFilter, statusFilter, methodFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const activeFilters = [storeFilter, statusFilter, methodFilter].filter((f) => !f.startsWith("All")).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
          <Filter className="w-4 h-4" />
          Filters
          {activeFilters > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{activeFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3 animate-fade-in">
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {defaultStores.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {methods.map((m) => <option key={m}>{m}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setStoreFilter("All Stores"); setStatusFilter("All Status"); setMethodFilter("All Methods"); }} className="text-xs text-primary hover:underline">
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => toggleSort("time")}>
                  <span className="flex items-center gap-1">Transaction {sortKey === "time" && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</span>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground hidden sm:table-cell" onClick={() => toggleSort("customer")}>
                  <span className="flex items-center gap-1">Customer {sortKey === "customer" && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</span>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Payment</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Store</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => toggleSort("total")}>
                  <span className="flex items-center justify-end gap-1">Total {sortKey === "total" && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</span>
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn) => {
                const sc = statusConfig[txn.status];
                const MethodIcon = methodIcons[txn.method] || DollarSign;
                const isExpanded = expandedTxn === txn.id;
                return (
                  <>
                    <tr
                      key={txn.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedTxn(isExpanded ? null : txn.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-primary">{txn.id}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {txn.time}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm font-medium text-foreground">{txn.customer}</p>
                        <p className="text-xs text-muted-foreground">{txn.items} item{txn.items !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MethodIcon className="w-3.5 h-3.5" />
                          {txn.method}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{txn.store}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">${txn.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${txn.id}-detail`} className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3 animate-fade-in">
                            <span className="text-xs text-muted-foreground">Rep: <span className="text-foreground font-medium">{txn.rep}</span></span>
                            <span className="text-xs text-muted-foreground">Store: <span className="text-foreground font-medium">{txn.store}</span></span>
                            <span className="text-xs text-muted-foreground">Method: <span className="text-foreground font-medium">{txn.method}</span></span>
                            <div className="ml-auto flex gap-2">
                              {txn.status === "pending" && (
                                <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(txn.id, "completed"); }} className="text-xs px-2 py-1 rounded bg-success/10 text-success font-medium hover:bg-success/20">
                                  Complete
                                </button>
                              )}
                              {txn.status === "completed" && (
                                <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(txn.id, "refunded"); }} className="text-xs px-2 py-1 rounded bg-warning/10 text-warning font-medium hover:bg-warning/20">
                                  Refund
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); onDelete(txn.id); }} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive font-medium hover:bg-destructive/20">
                                <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Analytics Tab ---
function AnalyticsTab({ paymentBreakdown, transactions }: { paymentBreakdown: { name: string; value: number; color: string }[]; transactions: Transaction[] }) {
  const revenueByDay = useMemo(() => {
    if (transactions.length === 0) return [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grouped: Record<string, { revenue: number; orders: number }> = {};
    transactions.filter(t => t.status === "completed").forEach(t => {
      const d = new Date(t.date);
      const day = days[d.getDay()];
      if (!grouped[day]) grouped[day] = { revenue: 0, orders: 0 };
      grouped[day].revenue += t.total;
      grouped[day].orders += 1;
    });
    return Object.entries(grouped).map(([day, data]) => ({ day, ...data }));
  }, [transactions]);

  const hourlyBreakdown = useMemo(() => {
    if (transactions.length === 0) return [];
    const hours: Record<string, number> = {};
    transactions.forEach(t => {
      const h = t.time.split(":")[0] || t.time;
      hours[h] = (hours[h] || 0) + 1;
    });
    return Object.entries(hours).map(([hour, sales]) => ({ hour, sales }));
  }, [transactions]);

  return (
    <div className="space-y-4 animate-fade-in">
      {transactions.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No transaction data for analytics yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-1">Revenue by Day</h3>
              <p className="text-xs text-muted-foreground mb-4">Revenue distribution across days</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(172,66%,50%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(172,66%,50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(222,22%,11%)", border: "1px solid hsl(220,18%,18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210,20%,92%)" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(172,66%,50%)" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-1">Payment Methods</h3>
              <p className="text-xs text-muted-foreground mb-4">Distribution by payment type</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                    {paymentBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(222,22%,11%)", border: "1px solid hsl(220,18%,18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210,20%,92%)" }} formatter={(value: number) => [`${value}%`]} />
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
          {hourlyBreakdown.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-1">Sales Volume by Time</h3>
              <p className="text-xs text-muted-foreground mb-4">Number of transactions by time</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyBreakdown} barSize={20}>
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
                  <Tooltip contentStyle={{ background: "hsl(222,22%,11%)", border: "1px solid hsl(220,18%,18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210,20%,92%)" }} />
                  <Bar dataKey="sales" fill="hsl(205,80%,55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Reps Tab ---
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
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Target Progress</span>
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
