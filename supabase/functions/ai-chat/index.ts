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

    const [salesRes, itemsRes, inventoryRes, expensesRes] = await Promise.all([
      supabase
        .from("sales_transactions")
        .select("total, payment_method, created_at, status")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("sales_transaction_items")
        .select("name, qty, total")
        .limit(800),
      supabase
        .from("inventory_items")
        .select("name, qty, reorder_point, status, price")
        .order("qty", { ascending: true })
        .limit(200),
      supabase
        .from("expenses")
        .select("amount, category, date")
        .order("date", { ascending: false })
        .limit(300),
    ]);

    const sales = salesRes.data ?? [];
    const items = itemsRes.data ?? [];
    const inventory = inventoryRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    const totalRevenue = sales.reduce((sum, txn) => sum + Number(txn.total || 0), 0);
    const completedSales = sales.filter((txn) => txn.status === "completed").length;

    const topProducts = Object.values(
      items.reduce((acc: Record<string, { name: string; qty: number; revenue: number }>, item) => {
        if (!acc[item.name]) {
          acc[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        acc[item.name].qty += Number(item.qty || 0);
        acc[item.name].revenue += Number(item.total || 0);
        return acc;
      }, {})
    )
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const lowStock = inventory
      .filter((item) => item.status === "critical" || item.status === "low" || Number(item.qty) <= Number(item.reorder_point || 0))
      .slice(0, 12)
      .map((item) => ({
        name: item.name,
        qty: Number(item.qty || 0),
        reorderPoint: Number(item.reorder_point || 0),
        status: item.status,
      }));

    const expenseByCategory = expenses.reduce((acc: Record<string, number>, row) => {
      const key = row.category || "Other";
      acc[key] = (acc[key] || 0) + Number(row.amount || 0);
      return acc;
    }, {});

    const liveDataContext = {
      generatedAt: new Date().toISOString(),
      counts: {
        transactions: sales.length,
        completedSales,
        inventoryItems: inventory.length,
        expenses: expenses.length,
      },
      revenue: {
        totalRevenue,
        averageTransaction: sales.length > 0 ? totalRevenue / sales.length : 0,
      },
      paymentMethods: sales.reduce((acc: Record<string, number>, txn) => {
        const key = txn.payment_method || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      topProducts,
      lowStock,
      expensesByCategory: expenseByCategory,
      errors: [salesRes.error, itemsRes.error, inventoryRes.error, expensesRes.error]
        .filter(Boolean)
        .map((err) => (err as { message?: string }).message || "Unknown database error"),
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
            content: `You are an intelligent business assistant for a retail/wholesale management platform. You help users with inventory, sales insights, operations, and workflow guidance. Be concise, data-driven, and actionable. Use markdown formatting for clarity.`,
          },
          {
            role: "system",
            content: `Use this LIVE business snapshot (JSON) from the database for your answers. If data is missing, say so clearly and provide best-practice guidance.\n\n${JSON.stringify(liveDataContext)}`,
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
