import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    // Fetch recent sales data
    const { data: sales } = await supabase
      .from("sales_transactions")
      .select("total, payment_method, created_at, customer_name, status, subtotal, tax, discount")
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch top selling items
    const { data: items } = await supabase
      .from("sales_transaction_items")
      .select("name, qty, total, price")
      .limit(500);

    // Fetch inventory alerts
    const { data: lowStock } = await supabase
      .from("inventory_items")
      .select("name, qty, reorder_point, status, price")
      .in("status", ["critical", "low"])
      .limit(50);

    // Fetch expenses summary
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount, category, date")
      .order("date", { ascending: false })
      .limit(100);

    const salesSummary = sales?.length ? {
      totalTransactions: sales.length,
      totalRevenue: sales.reduce((s, t) => s + (t.total || 0), 0),
      avgTransaction: sales.reduce((s, t) => s + (t.total || 0), 0) / sales.length,
      totalTax: sales.reduce((s, t) => s + (t.tax || 0), 0),
      totalDiscount: sales.reduce((s, t) => s + (t.discount || 0), 0),
      paymentMethods: sales.reduce((acc: Record<string, number>, t) => {
        acc[t.payment_method] = (acc[t.payment_method] || 0) + 1;
        return acc;
      }, {}),
    } : null;

    const topProducts = items?.length
      ? Object.values(items.reduce((acc: Record<string, { name: string; qty: number; revenue: number }>, i) => {
          if (!acc[i.name]) acc[i.name] = { name: i.name, qty: 0, revenue: 0 };
          acc[i.name].qty += i.qty;
          acc[i.name].revenue += i.total;
          return acc;
        }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
      : [];

    const expenseSummary = expenses?.length ? {
      total: expenses.reduce((s, e) => s + (e.amount || 0), 0),
      byCategory: expenses.reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {}),
    } : null;

    const dataContext = JSON.stringify({
      salesSummary,
      topProducts,
      lowStockItems: lowStock?.length || 0,
      lowStockDetails: lowStock?.slice(0, 10),
      expenseSummary,
    });

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
            content: `You are a business analytics AI. Analyze the provided business data and generate a concise, actionable insights report. Use markdown formatting with headers, bullet points, and bold text. Focus on:
1. **Revenue Performance** - Key metrics and trends
2. **Top Products** - Best sellers by revenue and volume
3. **Inventory Alerts** - Critical stock situations
4. **Expense Overview** - Cost analysis
5. **Recommendations** - 3-5 actionable suggestions

Keep the report under 500 words. Use emojis sparingly for visual appeal.`
          },
          {
            role: "user",
            content: `Analyze this business data and provide insights:\n\n${dataContext}`
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-sales-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
