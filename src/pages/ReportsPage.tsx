import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData, Expense } from "@/hooks/use-shared-data";
import { useAppEvents } from "@/hooks/use-app-events";
import { useAuth } from "@/hooks/use-auth";
import { useAudit } from "@/hooks/use-audit";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart,
  Download, Calendar, FileText, PieChart as PieIcon, Printer,
  Building2, Warehouse, ClipboardCheck, Activity, GitBranch,
  Plus, Trash2, Receipt, X,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

type ReportType = "overview" | "sales" | "inventory" | "gainloss" | "eod" | "expenses" | "operations";

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Salaries", "Marketing", "Maintenance", "Logistics", "Supplies", "Other"];

const tooltipStyle = {
  background: "hsl(222,22%,11%)",
  border: "1px solid hsl(220,18%,18%)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(210,20%,92%)",
};

export default function ReportsPage() {
  const { settings, formatCurrency, users } = useAppSettings();
  const { inventory, sales, stores, warehouses, expenses, addExpense, deleteExpense } = useSharedData();
  const { approvalItems, addNotification, addApprovalItem } = useAppEvents();
  const { user } = useAuth();
  const { logAction } = useAudit();
  const [reportType, setReportType] = useState<ReportType>("overview");
  const [dateRange, setDateRange] = useState("6months");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Rent", description: "", amount: "", store: "" });

  // Total operational expenses
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    const colors = ["hsl(172,66%,50%)", "hsl(205,80%,55%)", "hsl(38,92%,50%)", "hsl(152,60%,45%)", "hsl(280,60%,55%)", "hsl(0,72%,51%)", "hsl(45,90%,55%)", "hsl(190,70%,50%)"];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [expenses]);

  // Derive revenue data from actual sales + operational expenses
  const monthlyRevenue = useMemo(() => {
    if (sales.length === 0 && expenses.length === 0) return [];
    const grouped: Record<string, { revenue: number; costOfGoods: number; opExpenses: number }> = {};
    sales.forEach(sale => {
      const d = new Date(sale.date);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      if (!grouped[key]) grouped[key] = { revenue: 0, costOfGoods: 0, opExpenses: 0 };
      grouped[key].revenue += sale.total;
      const costTotal = sale.items.reduce((s, item) => {
        const invItem = inventory.find(i => i.sku === item.sku);
        return s + (invItem?.costPrice || item.price * 0.6) * item.qty;
      }, 0);
      grouped[key].costOfGoods += costTotal;
    });
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      if (!grouped[key]) grouped[key] = { revenue: 0, costOfGoods: 0, opExpenses: 0 };
      grouped[key].opExpenses += exp.amount;
    });
    return Object.entries(grouped).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      expenses: data.costOfGoods + data.opExpenses,
      profit: data.revenue - data.costOfGoods - data.opExpenses,
    }));
  }, [sales, inventory, expenses]);

  // Sales by store
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

  // Warehouse utilization
  const warehouseUtil = useMemo(() => {
    return warehouses.map(w => ({
      name: w.name,
      capacity: w.capacity,
      items: inventory.filter(i => i.warehouse === w.name).reduce((s, i) => s + i.qty, 0),
    }));
  }, [warehouses, inventory]);

  // Approval metrics
  const approvalStats = useMemo(() => {
    const approved = approvalItems.filter(a => a.status === "approved").length;
    const rejected = approvalItems.filter(a => a.status === "rejected").length;
    const pending = approvalItems.filter(a => a.status === "pending").length;
    return { approved, rejected, pending };
  }, [approvalItems]);

  // Gain/Loss data — cost vs revenue per item + operational expenses
  const gainLossData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; cost: number; units: number }> = {};
    sales.forEach(s => s.items.forEach(item => {
      const invItem = inventory.find(i => i.sku === item.sku);
      const cost = (invItem?.costPrice || item.price * 0.6) * item.qty;
      if (!map[item.name]) map[item.name] = { name: item.name, revenue: 0, cost: 0, units: 0 };
      map[item.name].revenue += item.qty * item.price;
      map[item.name].cost += cost;
      map[item.name].units += item.qty;
    }));
    return Object.values(map).map(d => ({ ...d, profit: d.revenue - d.cost, margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue * 100) : 0 }));
  }, [sales, inventory]);

  // Net gain/loss including operational expenses
  const netGainLoss = useMemo(() => {
    const grossProfit = gainLossData.reduce((s, d) => s + d.profit, 0);
    return grossProfit - totalExpenses;
  }, [gainLossData, totalExpenses]);

  // End of Day summary — includes today's operational expenses
  const eodData = useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.date).toDateString() === today);
    const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === today);
    const totalRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);
    const totalItems = todaySales.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.qty, 0), 0);
    const totalCost = todaySales.reduce((s, sale) => s + sale.items.reduce((a, item) => {
      const invItem = inventory.find(i => i.sku === item.sku);
      return a + (invItem?.costPrice || item.price * 0.6) * item.qty;
    }, 0), 0);
    const todayOpExpenses = todayExpenses.reduce((s, e) => s + e.amount, 0);
    const byMethod: Record<string, number> = {};
    todaySales.forEach(s => { byMethod[s.method] = (byMethod[s.method] || 0) + s.total; });
    const byStaff: Record<string, { name: string; sales: number; revenue: number }> = {};
    todaySales.forEach(s => {
      if (!byStaff[s.createdBy]) byStaff[s.createdBy] = { name: s.createdBy, sales: 0, revenue: 0 };
      byStaff[s.createdBy].sales++;
      byStaff[s.createdBy].revenue += s.total;
    });
    return { sales: todaySales, totalRevenue, totalItems, totalCost, opExpenses: todayOpExpenses, profit: totalRevenue - totalCost - todayOpExpenses, byMethod, byStaff: Object.values(byStaff), count: todaySales.length, todayExpenses };
  }, [sales, inventory, expenses]);

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const totalInventoryValue = inventory.reduce((s, i) => s + i.qty * i.price, 0);
  const totalInventoryCost = inventory.reduce((s, i) => s + i.qty * (i.costPrice || 0), 0);

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
    { key: "expenses", label: "Expenses", icon: Receipt },
    { key: "gainloss", label: "Gain/Loss", icon: TrendingUp },
    { key: "eod", label: "End of Day", icon: Calendar },
    { key: "operations", label: "Operations", icon: Activity },
  ];

  const handleAddExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) return;
    addExpense({
      category: expenseForm.category,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      date: new Date().toISOString(),
      store: expenseForm.store || stores[0]?.name || "Main",
      createdBy: user?.name || "System",
      createdByRole: user?.role || "Admin",
      recurring: false,
    });
    logAction("expense.add", "Expenses", expenseForm.category, `Added expense: ${expenseForm.description} — ${formatCurrency(parseFloat(expenseForm.amount))}`);
    setExpenseForm({ category: "Rent", description: "", amount: "", store: "" });
    setShowAddExpense(false);
  };

  const exportCSV = () => {
    let csv = "";
    if (reportType === "overview" || reportType === "sales") {
      csv = "Month,Revenue,Expenses,Profit\n" + monthlyRevenue.map(r => `${r.month},${r.revenue},${r.expenses},${r.profit}`).join("\n");
    } else if (reportType === "inventory") {
      csv = "SKU,Name,Category,Warehouse,Qty,CostPrice,SellingPrice,Value\n" + inventory.map(i => `${i.sku},${i.name},${i.category},${i.warehouse},${i.qty},${i.costPrice || 0},${i.price},${i.qty * i.price}`).join("\n");
    } else if (reportType === "gainloss") {
      csv = "Product,Revenue,Cost,Profit,Margin%\n" + gainLossData.map(d => `${d.name},${d.revenue},${d.cost},${d.profit},${d.margin.toFixed(1)}`).join("\n")
        + `\n\nOperational Expenses\nCategory,Amount\n` + expensesByCategory.map(e => `${e.name},${e.value}`).join("\n")
        + `\n\nNet Gain/Loss,${netGainLoss}`;
    } else if (reportType === "expenses") {
      csv = "ID,Date,Category,Description,Amount,Store,By\n" + expenses.map(e => `${e.id},${new Date(e.date).toLocaleDateString()},${e.category},${e.description},${e.amount},${e.store},${e.createdBy}`).join("\n");
    } else if (reportType === "eod") {
      csv = `End of Day Report - ${new Date().toLocaleDateString()}\nTotal Sales,${eodData.count}\nTotal Revenue,${eodData.totalRevenue}\nCost of Goods,${eodData.totalCost}\nOperational Expenses,${eodData.opExpenses}\nNet Profit,${eodData.profit}`;
    } else {
      csv = `Approved,${approvalStats.approved}\nRejected,${approvalStats.rejected}\nPending,${approvalStats.pending}`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    logAction("report.export", "Reports", reportType, `Exported ${reportType} report as CSV`);
  };

  const printReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    let bodyContent = "";
    const headerHtml = `<h1>${settings.appName}</h1><p class="subtitle">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report — Generated ${new Date().toLocaleDateString()} by ${user?.name || "System"}</p>`;
    const statsHtml = `<div class="stat-grid">${stats.map(s => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}</div>`;

    if (reportType === "gainloss") {
      const grossProfit = gainLossData.reduce((s, d) => s + d.profit, 0);
      const totalRev = gainLossData.reduce((s, d) => s + d.revenue, 0);
      const totalCost = gainLossData.reduce((s, d) => s + d.cost, 0);
      bodyContent = `${headerHtml}
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value">${formatCurrency(totalRev)}</div><div class="stat-label">Total Revenue</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(totalCost)}</div><div class="stat-label">Cost of Goods</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(totalExpenses)}</div><div class="stat-label">Operational Expenses</div></div>
          <div class="stat-card"><div class="stat-value ${netGainLoss >= 0 ? '' : 'loss'}">${formatCurrency(netGainLoss)}</div><div class="stat-label">Net ${netGainLoss >= 0 ? 'Gain' : 'Loss'}</div></div>
        </div>
        <h3>Product Breakdown</h3>
        <table><thead><tr><th>Product</th><th>Units</th><th>Revenue</th><th>Cost</th><th>Gross Profit</th><th>Margin</th></tr></thead><tbody>
        ${gainLossData.map(d => `<tr><td>${d.name}</td><td>${d.units}</td><td>${formatCurrency(d.revenue)}</td><td>${formatCurrency(d.cost)}</td><td class="${d.profit >= 0 ? '' : 'loss'}">${formatCurrency(d.profit)}</td><td>${d.margin.toFixed(1)}%</td></tr>`).join("")}
        </tbody></table>
        ${expenses.length > 0 ? `<h3>Operational Expenses</h3>
        <table><thead><tr><th>Category</th><th>Description</th><th>Amount</th><th>Store</th><th>Date</th><th>By</th></tr></thead><tbody>
        ${expenses.map(e => `<tr><td>${e.category}</td><td>${e.description}</td><td>${formatCurrency(e.amount)}</td><td>${e.store}</td><td>${new Date(e.date).toLocaleDateString()}</td><td>${e.createdBy}</td></tr>`).join("")}
        </tbody></table>` : ''}
        <div class="stat-grid" style="margin-top:20px">
          <div class="stat-card"><div class="stat-value">${formatCurrency(grossProfit)}</div><div class="stat-label">Gross Profit</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(totalExpenses)}</div><div class="stat-label">− Expenses</div></div>
          <div class="stat-card" style="grid-column:span 2"><div class="stat-value ${netGainLoss >= 0 ? '' : 'loss'}" style="font-size:28px">${formatCurrency(netGainLoss)}</div><div class="stat-label">NET ${netGainLoss >= 0 ? 'GAIN' : 'LOSS'}</div></div>
        </div>`;
    } else if (reportType === "eod") {
      bodyContent = `${headerHtml}
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value">${eodData.count}</div><div class="stat-label">Transactions</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(eodData.totalRevenue)}</div><div class="stat-label">Revenue</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(eodData.totalCost)}</div><div class="stat-label">Cost of Goods</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(eodData.opExpenses)}</div><div class="stat-label">Op. Expenses</div></div>
        </div>
        <div class="stat-grid">
          <div class="stat-card" style="grid-column:span 4"><div class="stat-value ${eodData.profit >= 0 ? '' : 'loss'}" style="font-size:28px">${formatCurrency(eodData.profit)}</div><div class="stat-label">Net Profit (Revenue − COGS − Expenses)</div></div>
        </div>
        <h3>Payment Methods</h3>
        <table><thead><tr><th>Method</th><th>Amount</th></tr></thead><tbody>
        ${Object.entries(eodData.byMethod).map(([m, v]) => `<tr><td>${m}</td><td>${formatCurrency(v)}</td></tr>`).join("")}
        </tbody></table>
        <h3>Staff Performance</h3>
        <table><thead><tr><th>Staff</th><th>Sales</th><th>Revenue</th></tr></thead><tbody>
        ${eodData.byStaff.map(s => `<tr><td>${s.name}</td><td>${s.sales}</td><td>${formatCurrency(s.revenue)}</td></tr>`).join("")}
        </tbody></table>
        <h3>Transaction Detail</h3>
        <table><thead><tr><th>#</th><th>Customer</th><th>Method</th><th>Items</th><th>Total</th><th>By</th></tr></thead><tbody>
        ${eodData.sales.map((s, i) => `<tr><td>${i + 1}</td><td>${s.customer}</td><td>${s.method}</td><td>${s.items.length}</td><td>${formatCurrency(s.total)}</td><td>${s.createdBy}</td></tr>`).join("")}
        </tbody></table>`;
    } else if (reportType === "inventory") {
      bodyContent = `${headerHtml}
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value">${inventory.length}</div><div class="stat-label">Total SKUs</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(totalInventoryValue)}</div><div class="stat-label">Retail Value</div></div>
          <div class="stat-card"><div class="stat-value">${formatCurrency(totalInventoryCost)}</div><div class="stat-label">Cost Value</div></div>
          <div class="stat-card"><div class="stat-value">${inventory.filter(i => i.status === "critical" || i.status === "low").length}</div><div class="stat-label">Low Stock</div></div>
        </div>
        <table><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Warehouse</th><th>Qty</th><th>Cost</th><th>Price</th><th>Value</th><th>Status</th></tr></thead><tbody>
        ${inventory.map(i => `<tr><td>${i.sku}</td><td>${i.name}</td><td>${i.category}</td><td>${i.warehouse}</td><td>${i.qty}</td><td>${formatCurrency(i.costPrice || 0)}</td><td>${formatCurrency(i.price)}</td><td>${formatCurrency(i.qty * i.price)}</td><td class="${i.status === 'critical' ? 'loss' : ''}">${i.status}</td></tr>`).join("")}
        </tbody></table>`;
    } else if (reportType === "sales") {
      bodyContent = `${headerHtml}${statsHtml}
        <h3>All Sales</h3>
        <table><thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Items</th><th>Method</th><th>Total</th><th>By</th></tr></thead><tbody>
        ${sales.map(s => `<tr><td>${s.id}</td><td>${new Date(s.date).toLocaleDateString()}</td><td>${s.customer}</td><td>${s.items.length}</td><td>${s.method}</td><td>${formatCurrency(s.total)}</td><td>${s.createdBy}</td></tr>`).join("")}
        </tbody></table>`;
    } else {
      bodyContent = `${headerHtml}${statsHtml}`;
    }

    win.document.write(`
      <html><head><title>${settings.appName} - ${reportType} Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h3 { font-size: 16px; margin: 20px 0 8px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0; }
        .stat-card { border: 1px solid #eee; border-radius: 8px; padding: 16px; }
        .stat-value { font-size: 22px; font-weight: 700; }
        .stat-label { font-size: 12px; color: #666; }
        .loss { color: #dc2626; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      ${bodyContent}
      <div class="footer">Generated by ${settings.appName} · ${new Date().toLocaleString()} · Printed by ${user?.name || "System"}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
    logAction("report.print", "Reports", reportType, `Printed ${reportType} report`);
  };

  const submitReportForApproval = () => {
    addApprovalItem({
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report Review`,
      type: "workflow",
      sourceId: `RPT-${Date.now()}`,
      requester: user?.name || "You",
      department: "Reports",
      amount: null,
      description: `${reportType} report generated on ${new Date().toLocaleDateString()} — requires manager sign-off`,
      priority: "medium",
    });
    addNotification({ type: "workflow", title: `Report submitted for approval`, message: `${reportType} report sent to workflow`, link: "/approvals", targetRoles: ["Manager", "Admin", "Super Admin"] });
    logAction("report.submit_approval", "Reports", reportType, `Submitted ${reportType} report for approval`);
  };

  const hasData = sales.length > 0 || inventory.length > 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Analytics, insights, and performance metrics across all modules.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
            <button onClick={submitReportForApproval} className="flex items-center gap-2 px-3 py-2 bg-info/10 text-info rounded-lg text-sm font-medium hover:bg-info/20 transition-colors">
              <GitBranch className="w-4 h-4" />Workflow
            </button>
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
                  <p className="text-xs text-muted-foreground mb-4">Monthly profit from revenue minus cost</p>
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
                <div className="glass-card rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Recent Sales</h3>
                    <span className="text-xs text-muted-foreground">{sales.length} total</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">ID</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Customer</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Method</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Total</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 hidden md:table-cell">By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.slice(0, 20).map(s => (
                          <tr key={s.id} className="border-b border-border/50">
                            <td className="px-3 py-2 text-xs font-mono text-primary">{s.id}</td>
                            <td className="px-3 py-2 text-sm text-foreground">{s.customer}</td>
                            <td className="px-3 py-2 text-sm text-muted-foreground hidden sm:table-cell">{s.method}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-foreground text-right">{formatCurrency(s.total)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{s.createdBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

        {/* Inventory Report */}
        {hasData && reportType === "inventory" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{inventory.length}</p>
                <p className="text-xs text-muted-foreground">Total SKUs</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalInventoryValue)}</p>
                <p className="text-xs text-muted-foreground">Retail Value</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalInventoryCost)}</p>
                <p className="text-xs text-muted-foreground">Cost Value</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalInventoryValue - totalInventoryCost)}</p>
                <p className="text-xs text-muted-foreground">Potential Margin</p>
              </div>
            </div>
            {warehouseUtil.length > 0 && (
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
            )}
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Full Inventory List</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">SKU</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Warehouse</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Qty</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 hidden md:table-cell">Cost</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Price</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(i => (
                      <tr key={i.sku} className="border-b border-border/50">
                        <td className="px-3 py-2 text-xs font-mono text-primary">{i.sku}</td>
                        <td className="px-3 py-2 text-sm text-foreground">{i.name}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground hidden sm:table-cell">{i.warehouse}</td>
                        <td className="px-3 py-2 text-sm text-right font-semibold text-foreground">{i.qty}</td>
                        <td className="px-3 py-2 text-sm text-right text-muted-foreground hidden md:table-cell">{formatCurrency(i.costPrice || 0)}</td>
                        <td className="px-3 py-2 text-sm text-right text-foreground">{formatCurrency(i.price)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${i.status === "critical" ? "bg-destructive/10 text-destructive" : i.status === "low" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{i.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Gain/Loss */}
        {hasData && reportType === "gainloss" && (
          <div className="space-y-4 animate-fade-in">
            {gainLossData.length > 0 ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-foreground">{formatCurrency(gainLossData.reduce((s, d) => s + d.revenue, 0))}</p>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-foreground">{formatCurrency(gainLossData.reduce((s, d) => s + d.cost, 0))}</p>
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    {(() => {
                      const net = gainLossData.reduce((s, d) => s + d.profit, 0);
                      return <p className={`text-xl font-bold ${net >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(net)}</p>;
                    })()}
                    <p className="text-xs text-muted-foreground">Net {gainLossData.reduce((s, d) => s + d.profit, 0) >= 0 ? "Gain" : "Loss"}</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    {(() => {
                      const rev = gainLossData.reduce((s, d) => s + d.revenue, 0);
                      const prof = gainLossData.reduce((s, d) => s + d.profit, 0);
                      return <p className="text-xl font-bold text-foreground">{rev > 0 ? ((prof / rev) * 100).toFixed(1) : 0}%</p>;
                    })()}
                    <p className="text-xs text-muted-foreground">Avg Margin</p>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-1">Profit by Product</h3>
                  <p className="text-xs text-muted-foreground mb-4">Revenue vs Cost breakdown</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={gainLossData.slice(0, 10)} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,18%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(220,10%,50%)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `${settings.currencySymbol}${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(172,66%,50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4">Detailed Gain/Loss</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Product</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Units</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Revenue</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Cost</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Profit</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gainLossData.map(d => (
                          <tr key={d.name} className="border-b border-border/50">
                            <td className="px-3 py-2 text-sm font-medium text-foreground">{d.name}</td>
                            <td className="px-3 py-2 text-sm text-right text-muted-foreground">{d.units}</td>
                            <td className="px-3 py-2 text-sm text-right text-foreground">{formatCurrency(d.revenue)}</td>
                            <td className="px-3 py-2 text-sm text-right text-muted-foreground">{formatCurrency(d.cost)}</td>
                            <td className={`px-3 py-2 text-sm text-right font-semibold ${d.profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(d.profit)}</td>
                            <td className="px-3 py-2 text-sm text-right text-muted-foreground">{d.margin.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card rounded-xl p-10 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sales data. Complete POS sales to see gain/loss analysis.</p>
              </div>
            )}
          </div>
        )}

        {/* End of Day */}
        {hasData && reportType === "eod" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{eodData.count}</p>
                <p className="text-xs text-muted-foreground">Today's Transactions</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{formatCurrency(eodData.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{eodData.totalItems}</p>
                <p className="text-xs text-muted-foreground">Items Sold</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className={`text-xl font-bold ${eodData.profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(eodData.profit)}</p>
                <p className="text-xs text-muted-foreground">Today's Profit</p>
              </div>
            </div>

            {eodData.count > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground mb-4">Payment Methods</h3>
                    <div className="space-y-3">
                      {Object.entries(eodData.byMethod).map(([method, amount]) => (
                        <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium text-foreground capitalize">{method}</span>
                          <span className="text-sm font-semibold text-primary">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground mb-4">Staff Performance</h3>
                    <div className="space-y-3">
                      {eodData.byStaff.map(s => (
                        <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="text-sm font-medium text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.sales} sale{s.sales > 1 ? "s" : ""}</p>
                          </div>
                          <span className="text-sm font-semibold text-primary">{formatCurrency(s.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4">Today's Transactions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">ID</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Customer</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Method</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Total</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eodData.sales.map(s => (
                          <tr key={s.id} className="border-b border-border/50">
                            <td className="px-3 py-2 text-xs font-mono text-primary">{s.id}</td>
                            <td className="px-3 py-2 text-sm text-foreground">{s.customer}</td>
                            <td className="px-3 py-2 text-sm text-muted-foreground hidden sm:table-cell">{s.method}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-foreground text-right">{formatCurrency(s.total)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{s.createdBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card rounded-xl p-10 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sales today yet. Complete POS transactions to see end-of-day summary.</p>
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
