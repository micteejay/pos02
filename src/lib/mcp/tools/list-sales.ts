import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_sales",
  title: "List recent sales",
  description: "List recent sales (transactions) for the signed-in user's company, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(25).describe("Max number of sales to return."),
    since: z.string().datetime().optional().describe("ISO timestamp; only return sales created at or after this time."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, since }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx).from("sales").select("*").order("created_at", { ascending: false }).limit(limit ?? 25);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { sales: data ?? [] },
    };
  },
});