import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useSharedData } from "@/hooks/use-shared-data";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printNode, printText } from "@/lib/print";
import { generateReceiptText } from "@/lib/receipt-text";
import ReceiptTemplate, { type ReceiptData } from "@/components/ReceiptTemplate";
import EmptyState from "@/components/EmptyState";
import TableSkeleton, { CardGridSkeleton } from "@/components/TableSkeleton";
import {
  DollarSign, ShoppingCart, TrendingUp, TrendingDown, Users, Receipt, CreditCard,
  Banknote, Search, Eye, ArrowUpRight, Clock, Star, Target, Plus, X, Check,
  Trash2, Filter, ArrowUp, ArrowDown, Loader2, Printer,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

interface Transaction {
  id: string;
  dbId: string;
  customer: string;
  items: number;
  total: number;
  method: string;
  store: string;
  storeName: string;
  rep: string;
  time: string;
  status: "completed" | "refunded" | "pending";
  date: string;
}

type Tab = "transactions" | "analytics" | "reps";
type SortKey = "time" | "total" | "customer";

const statusConfig = {
  completed: { label: "Completed", className: "bg-success/10 text-success" },
  refunded: { label: "Refunded", className: "bg-destructive/10 text-destructive" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
};

const methodIcons: Record<string, React.ElementType> = {
  "Credit Card": CreditCard, "Debit Card": CreditCard, "Cash": Banknote, "Mobile Pay": DollarSign,
};

const statuses = ["All Status", "completed", "refunded", "pending"];
const methods = ["All Methods", "Credit Card", "Cash", "Debit Card", "Mobile Pay"];

export default function SalesPage() {
  const { storeNames, stores } = useSharedData();
  const { users, hasPermission, formatCurrency } = useAppSettings();
  const { user, companyProfile } = useAuth();
  const dynamicStoreFilters = useMemo(() => ["All Stores", ...storeNames], [storeNames]);
  const [tab, setTab] = useState<Tab>("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSale, setShowNewSale] = useState(false);
  const [reprintSale, setReprintSale] = useState<ReceiptData | null>(null);
  const reprintRef = useRef<HTMLDivElement>(null);

  // Fetch from DB
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("*, sales_transaction_items(*), stores!sales_transactions_store_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (data && !error) {
        const profilesRes = await supabase.from("profiles").select("id, name");
        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.name || "Unknown"]));

        setTransactions(data.map((s: any) => ({
          id: s.transaction_number,
          dbId: s.id,
          customer: s.customer_name || "Walk-in",
          items: (s.sales_transaction_items || []).reduce((sum: number, i: any) => sum + i.qty, 0),
          total: Number(s.total),
          method: s.payment_method,
          store: s.store_id || "",
          storeName: s.stores?.name || "Unknown",
          rep: s.cashier_id ? (profileMap.get(s.cashier_id) || "Unknown") : "System",
          time: new Date(s.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          status: s.status as Transaction["status"],
          date: s.created_at,
        })));
      }
      setLoading(false);
    };
    fetchTransactions();
  }, []);

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const totalRevenue = completed.reduce((s, t) => s + t.total, 0);
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;
    return [
      { label: "Total Revenue", value: formatCurrency(totalRevenue), change: `${completed.length} sales`, trend: "up" as const, icon: DollarSign },
      { label: "Transactions", value: transactions.length.toString(), change: "", trend: "up" as const, icon: ShoppingCart },
      { label: "Avg. Ticket", value: formatCurrency(avgTicket), change: "", trend: "up" as const, icon: Receipt },
      { label: "Active Reps", value: users.filter(u => u.status === "active").length.toString(), change: "", trend: "up" as const, icon: Users },
    ];
  }, [transactions, formatCurrency, users]);

  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((t) => { counts[t.method] = (counts[t.method] || 0) + 1; });
    const total = transactions.length;
    const colors: Record<string, string> = { "Credit Card": "hsl(172,66%,50%)", Cash: "hsl(205,80%,55%)", "Debit Card": "hsl(38,92%,50%)", "Mobile Pay": "hsl(152,60%,45%)" };
    return Object.entries(counts).map(([name, count]) => ({
      name, value: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[name] || "hsl(220,10%,50%)",
    }));
  }, [transactions]);

  const updateStatus = useCallback(async (id: string, status: Transaction["status"]) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    await supabase.from("sales_transactions").update({ status: status as any }).eq("id", txn.dbId);
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    toast.success(`Transaction ${id} marked as ${status}`);
  }, [transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    // Delete items first, then transaction
    await supabase.from("sales_transaction_items").delete().eq("transaction_id", txn.dbId);
    await supabase.from("sales_transactions").delete().eq("id", txn.dbId);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast.success(`Transaction ${id} deleted`);
  }, [transactions]);

  const reprintTransaction = useCallback(async (id: string) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("*, sales_transaction_items(*)")
      .eq("id", txn.dbId)
      .single();
    if (error || !data) { toast.error("Could not load receipt"); return; }
    setReprintSale({
      id: data.transaction_number,
      total: Number(data.total),
      subtotal: Number(data.subtotal),
      tax: Number(data.tax),
      discount: Number(data.discount || 0),
      customer: data.customer_name || "Walk-in",
      method: data.payment_method,
      date: new Date(data.created_at).toLocaleString(),
      items: (data.sales_transaction_items || []).map((i: any) => ({
        name: i.name,
        qty: i.qty,
        price: Number(i.price),
        unitName: i.unit_name || undefined,
        unitFactor: Number(i.unit_factor) || 1,
      })),
    });
  }, [transactions]);

  const allTabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "transactions", label: "Transactions", icon: Receipt },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "reps", label: "Sales Reps", icon: Users },
  ];

  const tabPermMap: Record<Tab, string> = { transactions: "pages.sales.transactions", analytics: "pages.sales.analytics", reps: "pages.sales.reps" };
  const tabs = useMemo(() => allTabs.filter(t => hasPermission(tabPermMap[t.key] as any)), [hasPermission]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor transactions, track revenue, and measure rep performance.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4 sm:p-5 hover:stat-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                {s.change && (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-success">
                    <TrendingUp className="w-3 h-3" />
                    <span>{s.change}</span>
                  </div>
                )}
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

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <>
            {tab === "transactions" && (
              <TransactionsTab transactions={transactions} onUpdateStatus={updateStatus} onDelete={deleteTransaction} onReprint={reprintTransaction} storeFilters={dynamicStoreFilters} formatCurrency={formatCurrency} />
            )}
            {tab === "analytics" && <AnalyticsTab paymentBreakdown={paymentBreakdown} transactions={transactions} formatCurrency={formatCurrency} />}
            {tab === "reps" && <RepsTab users={users} storeNames={storeNames} />}
          </>
        )}
      </div>

      {reprintSale && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReprintSale(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">Reprint Receipt</h3>
              <button onClick={() => setReprintSale(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <ReceiptTemplate
              ref={reprintRef}
              sale={reprintSale}
              company={companyProfile}
              formatCurrency={formatCurrency}
              footer="Reprinted copy"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setReprintSale(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Close</button>
              <button onClick={() => {
                if (reprintSale) {
                  const text = generateReceiptText(
                    reprintSale,
                    companyProfile,
                    formatCurrency,
                    "Reprinted copy"
                  );
                  printText(text, `Receipt ${reprintSale.id}`);
                }
              }} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-1">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// --- Transactions Tab ---
function TransactionsTab({ transactions, onUpdateStatus, onDelete, onReprint, storeFilters, formatCurrency }: {
  transactions: Transaction[];
  onUpdateStatus: (id: string, status: Transaction["status"]) => void;
  onDelete: (id: string) => void;
  onReprint: (id: string) => void;
  storeFilters: string[];
  formatCurrency: (n: number) => string;
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
      const matchStore = storeFilter === "All Stores" || t.storeName === storeFilter;
      const matchStatus = statusFilter === "All Status" || t.status === statusFilter;
      const matchMethod = methodFilter === "All Methods" || t.method === methodFilter;
      return matchSearch && matchStore && matchStatus && matchMethod;
    });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "total") cmp = a.total - b.total;
      else if (sortKey === "customer") cmp = a.customer.localeCompare(b.customer);
      else cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
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
          <Filter className="w-4 h-4" />Filters
          {activeFilters > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{activeFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3 animate-fade-in">
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {storeFilters.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {methods.map((m) => <option key={m}>{m}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setStoreFilter("All Stores"); setStatusFilter("All Status"); setMethodFilter("All Methods"); }} className="text-xs text-primary hover:underline">Clear all</button>
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
                    <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedTxn(isExpanded ? null : txn.id)}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-primary">{txn.id}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {txn.time}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm font-medium text-foreground">{txn.customer}</p>
                        <p className="text-xs text-muted-foreground">{txn.items} item{txn.items !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MethodIcon className="w-3.5 h-3.5" />{txn.method}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{txn.storeName}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{formatCurrency(txn.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${txn.id}-detail`} className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3 animate-fade-in">
                            <span className="text-xs text-muted-foreground">Rep: <span className="text-foreground font-medium">{txn.rep}</span></span>
                            <span className="text-xs text-muted-foreground">Store: <span className="text-foreground font-medium">{txn.storeName}</span></span>
                            <span className="text-xs text-muted-foreground">Method: <span className="text-foreground font-medium">{txn.method}</span></span>
                            <div className="ml-auto flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); onReprint(txn.id); }} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 flex items-center gap-1">
                                <Receipt className="w-3 h-3" /> Reprint
                              </button>
                              {txn.status === "pending" && (
                                <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(txn.id, "completed"); }} className="text-xs px-2 py-1 rounded bg-success/10 text-success font-medium hover:bg-success/20">Complete</button>
                              )}
                              {txn.status === "completed" && (
                                <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(txn.id, "refunded"); }} className="text-xs px-2 py-1 rounded bg-warning/10 text-warning font-medium hover:bg-warning/20">Refund</button>
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
                <tr><td colSpan={6} className="px-4 py-12">
                  <div className="flex flex-col items-center text-center gap-2">
                    <Search className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No transactions match your filters.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Analytics Tab ---
function AnalyticsTab({ paymentBreakdown, transactions, formatCurrency }: { paymentBreakdown: { name: string; value: number; color: string }[]; transactions: Transaction[]; formatCurrency: (n: number) => string }) {
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
        <EmptyState
          icon={TrendingUp}
          title="No analytics yet"
          description="Once you record sales, charts and breakdowns will appear here automatically."
          hint="Complete a sale at POS to see revenue, payment, and hourly trends."
        />
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
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `${formatCurrency(v)}`} />
                  <Tooltip contentStyle={{ background: "hsl(222,22%,11%)", border: "1px solid hsl(220,18%,18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210,20%,92%)" }} formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
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
function RepsTab({ users, storeNames }: { users: { id: string; name: string; role: string; status: string; store: string; avatar: string }[]; storeNames: string[] }) {
  const activeReps = users.filter(u => u.status === "active");

  if (activeReps.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No active reps"
        description="Add users in the Users & Roles page to see sales rep performance here."
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeReps.map((rep) => (
          <div key={rep.id} className="glass-card rounded-xl p-5 hover:stat-glow transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {rep.avatar ? <img src={rep.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : rep.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{rep.name}</p>
                <p className="text-xs text-muted-foreground">{rep.role} · {rep.store || "Unassigned"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><div className="w-2 h-2 rounded-full bg-success" /><span>Active</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
