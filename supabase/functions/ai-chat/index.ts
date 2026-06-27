import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json().catch(() => ({ messages: [] }));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    // ── Fetch all page data in parallel ──────────────────────────────────────
    const [
      salesRes, itemsRes, inventoryRes, expensesRes,
      customersRes, invoicesRes, invoiceItemsRes,
      suppliersRes, purchaseOrdersRes, stockTransfersRes, stockAdjRes,
      workflowsRes, approvalsRes,
      usersRes, rolesRes, departmentsRes, storesRes, warehousesRes,
      documentsRes, appSettingsRes, generatedReportsRes,
      salesReturnsRes, loyaltyRes,
    ] = await Promise.all([
      // ── Sales ──
      supabase.from("sales_transactions")
        .select("total, payment_method, created_at, status, discount")
        .order("created_at", { ascending: false }).limit(300),
      supabase.from("sales_transaction_items")
        .select("name, qty, total").limit(800),

      // ── Inventory ──
      supabase.from("inventory_items")
        .select("name, qty, reorder_point, status, price, category_id, warehouse_id")
        .order("qty", { ascending: true }).limit(200),
      supabase.from("expenses")
        .select("amount, category, date, description")
        .order("date", { ascending: false }).limit(300),

      // ── Customers ──
      supabase.from("customers")
        .select("name, email, phone, loyalty_points, total_spent, created_at")
        .order("total_spent", { ascending: false }).limit(200),

      // ── Invoices ──
      supabase.from("invoices")
        .select("status, total, due_date, created_at, customer_id")
        .order("created_at", { ascending: false }).limit(200),
      supabase.from("invoice_items")
        .select("name, qty, price, total").limit(500),

      // ── Supply Chain ──
      supabase.from("suppliers")
        .select("name, email, phone, status, category").limit(100),
      supabase.from("purchase_orders")
        .select("status, total_amount, created_at, supplier_id, expected_delivery")
        .order("created_at", { ascending: false }).limit(150),
      supabase.from("stock_transfers")
        .select("status, created_at, from_warehouse_id, to_warehouse_id")
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("stock_adjustments")
        .select("reason, qty_change, created_at").limit(100),

      // ── Workflows / Approvals ──
      supabase.from("workflows")
        .select("name, status, created_at, type").limit(100),
      supabase.from("approvals")
        .select("status, type, created_at, resolved_at").limit(200),

      // ── Organization / Users ──
      supabase.from("profiles")
        .select("name, email, status, created_at").limit(200),
      supabase.from("roles")
        .select("name, description").limit(50),
      supabase.from("departments")
        .select("name").limit(50),
      supabase.from("stores")
        .select("name, status, city").limit(50),
      supabase.from("warehouses")
        .select("name, location, status").limit(50),

      // ── Documents ──
      supabase.from("documents")
        .select("name, type, created_at, status").limit(100),

      // ── App Settings ──
      supabase.from("app_settings")
        .select("key, value").limit(50),

      // ── Reports ──
      supabase.from("generated_reports")
        .select("name, type, created_at").order("created_at", { ascending: false }).limit(30),

      // ── Sales Returns ──
      supabase.from("sales_returns")
        .select("total, reason, status, created_at").limit(100),

      // ── Loyalty ──
      supabase.from("loyalty_transactions")
        .select("points, type, created_at").limit(100),
    ]);

    // ── Process Sales ──────────────────────────────────────────────────────────
    const sales = salesRes.data ?? [];
    const items = itemsRes.data ?? [];
    const inventory = inventoryRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    const totalRevenue = sales.reduce((s, t) => s + Number(t.total || 0), 0);
    const completedSales = sales.filter((t) => t.status === "completed").length;
    const totalDiscount = sales.reduce((s, t) => s + Number(t.discount || 0), 0);

    const topProducts = Object.values(
      items.reduce((acc: Record<string, { name: string; qty: number; revenue: number }>, item) => {
        if (!acc[item.name]) acc[item.name] = { name: item.name, qty: 0, revenue: 0 };
        acc[item.name].qty += Number(item.qty || 0);
        acc[item.name].revenue += Number(item.total || 0);
        return acc;
      }, {})
    ).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    const lowStock = inventory
      .filter((i) => i.status === "critical" || i.status === "low" || Number(i.qty) <= Number(i.reorder_point || 0))
      .slice(0, 12)
      .map((i) => ({ name: i.name, qty: Number(i.qty || 0), reorderPoint: Number(i.reorder_point || 0), status: i.status }));

    const expenseByCategory = expenses.reduce((acc: Record<string, number>, row) => {
      const key = row.category || "Other";
      acc[key] = (acc[key] || 0) + Number(row.amount || 0);
      return acc;
    }, {});

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    // ── Process Customers ─────────────────────────────────────────────────────
    const customers = customersRes.data ?? [];
    const topCustomers = customers.slice(0, 10).map((c) => ({
      name: c.name, loyaltyPoints: Number(c.loyalty_points || 0), totalSpent: Number(c.total_spent || 0),
    }));

    // ── Process Invoices ──────────────────────────────────────────────────────
    const invoices = invoicesRes.data ?? [];
    const invoiceSummary = {
      total: invoices.length,
      paid: invoices.filter((i) => i.status === "paid").length,
      pending: invoices.filter((i) => i.status === "pending" || i.status === "sent").length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
      totalValue: invoices.reduce((s, i) => s + Number(i.total || 0), 0),
      overdueValue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.total || 0), 0),
    };

    // ── Process Supply Chain ──────────────────────────────────────────────────
    const suppliers = suppliersRes.data ?? [];
    const purchaseOrders = purchaseOrdersRes.data ?? [];
    const stockTransfers = stockTransfersRes.data ?? [];
    const stockAdjustments = stockAdjRes.data ?? [];

    const poSummary = {
      total: purchaseOrders.length,
      pending: purchaseOrders.filter((o) => o.status === "pending").length,
      approved: purchaseOrders.filter((o) => o.status === "approved").length,
      received: purchaseOrders.filter((o) => o.status === "received").length,
      totalValue: purchaseOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    };

    // ── Process Workflows / Approvals ─────────────────────────────────────────
    const workflows = workflowsRes.data ?? [];
    const approvals = approvalsRes.data ?? [];
    const approvalSummary = {
      total: approvals.length,
      pending: approvals.filter((a) => a.status === "pending").length,
      approved: approvals.filter((a) => a.status === "approved").length,
      rejected: approvals.filter((a) => a.status === "rejected").length,
    };

    // ── Process Organization / Users ──────────────────────────────────────────
    const users = usersRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const departments = departmentsRes.data ?? [];
    const stores = storesRes.data ?? [];
    const warehouses = warehousesRes.data ?? [];

    // ── Process Documents ─────────────────────────────────────────────────────
    const documents = documentsRes.data ?? [];

    // ── Process App Settings ──────────────────────────────────────────────────
    const appSettings = (appSettingsRes.data ?? []).reduce((acc: Record<string, string>, s: { key: string; value: string }) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    // ── Process Reports ───────────────────────────────────────────────────────
    const generatedReports = generatedReportsRes.data ?? [];

    // ── Process Returns + Loyalty ─────────────────────────────────────────────
    const salesReturns = salesReturnsRes.data ?? [];
    const totalReturnsValue = salesReturns.reduce((s, r) => s + Number(r.total || 0), 0);
    const loyaltyTx = loyaltyRes.data ?? [];
    const totalLoyaltyPointsIssued = loyaltyTx.filter((l) => l.type === "earn").reduce((s, l) => s + Number(l.points || 0), 0);

    // ── Build full live context ───────────────────────────────────────────────
    const liveDataContext = {
      generatedAt: new Date().toISOString(),

      // Sales
      sales: {
        totalTransactions: sales.length,
        completedSales,
        totalRevenue,
        averageTransaction: sales.length > 0 ? totalRevenue / sales.length : 0,
        totalDiscountsGiven: totalDiscount,
        paymentMethods: sales.reduce((acc: Record<string, number>, t) => {
          const key = t.payment_method || "unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        topProducts,
        returnsTotal: totalReturnsValue,
        returnsCount: salesReturns.length,
      },

      // Inventory
      inventory: {
        totalItems: inventory.length,
        lowStockItems: lowStock,
        criticalCount: inventory.filter((i) => i.status === "critical").length,
        lowCount: inventory.filter((i) => i.status === "low").length,
        okCount: inventory.filter((i) => i.status === "ok").length,
        stockAdjustmentsCount: stockAdjustments.length,
      },

      // Expenses
      expenses: {
        total: totalExpenses,
        byCategory: expenseByCategory,
        count: expenses.length,
        netProfit: totalRevenue - totalExpenses,
      },

      // Customers
      customers: {
        total: customers.length,
        topBySpend: topCustomers,
        totalLoyaltyPointsIssued,
      },

      // Invoices
      invoices: invoiceSummary,

      // Supply Chain
      supply: {
        suppliersCount: suppliers.length,
        activeSuppliers: suppliers.filter((s: { status?: string }) => s.status === "active").length,
        purchaseOrders: poSummary,
        stockTransfersCount: stockTransfers.length,
        pendingTransfers: stockTransfers.filter((t) => t.status === "pending").length,
      },

      // Workflows
      workflows: {
        total: workflows.length,
        active: workflows.filter((w) => w.status === "active").length,
        completed: workflows.filter((w) => w.status === "completed").length,
      },

      // Approvals
      approvals: approvalSummary,

      // Organization
      organization: {
        usersCount: users.length,
        activeUsers: users.filter((u: { status?: string }) => u.status === "active").length,
        rolesCount: roles.length,
        roles: roles.map((r: { name: string }) => r.name),
        departmentsCount: departments.length,
        storesCount: stores.length,
        warehousesCount: warehouses.length,
      },

      // Documents
      documents: {
        total: documents.length,
        byType: documents.reduce((acc: Record<string, number>, d: { type?: string }) => {
          const key = d.type || "unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },

      // Settings
      settings: {
        appName: appSettings["appName"] || "POS System",
        currency: appSettings["currency"] || "NGN",
        timezone: appSettings["timezone"] || "Africa/Lagos",
      },

      // Reports
      reports: {
        totalGenerated: generatedReports.length,
        recent: generatedReports.slice(0, 5).map((r: { name?: string; type?: string; created_at?: string }) => ({ name: r.name, type: r.type })),
      },

      // Errors
      errors: [
        salesRes.error, itemsRes.error, inventoryRes.error, expensesRes.error,
        customersRes.error, invoicesRes.error, suppliersRes.error, purchaseOrdersRes.error,
        workflowsRes.error, approvalsRes.error, usersRes.error, documentsRes.error,
      ].filter(Boolean).map((e) => (e as { message?: string }).message || "Unknown database error"),
    };

    const sanitizedMessages = Array.isArray(messages)
      ? messages
          .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .slice(-20)
      : [];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an intelligent business assistant for a comprehensive retail/wholesale management platform. You have full access to live data across all modules: Sales, Inventory, Customers, Invoices, Supply Chain (suppliers, purchase orders, stock transfers), Workflows, Approvals, Organization (users, roles, departments, stores, warehouses), Documents, Reports, and App Settings. Be concise, data-driven, and actionable. Use markdown formatting for clarity. When answering, cite specific numbers from the live data wherever possible.`,
          },
          {
            role: "system",
            content: `LIVE BUSINESS SNAPSHOT (generated at ${liveDataContext.generatedAt}):\n\n${JSON.stringify(liveDataContext, null, 2)}`,
          },
          ...sanitizedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
