import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listProductsTool from "./tools/list-products";
import listSalesTool from "./tools/list-sales";
import listCustomersTool from "./tools/list-customers";
import lowStockTool from "./tools/low-stock";

// Build the OAuth issuer from the Supabase project ref. VITE_SUPABASE_PROJECT_ID is
// inlined at build time by Vite, so this stays import-safe (no runtime env read).
// The fallback keeps the issuer well-formed during the manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pos02-mcp",
  title: "POS02 MCP",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in user's POS02 workspace. All data is scoped by RLS to their company. Use `whoami` to verify the connection, `list_products` / `low_stock_products` for inventory, `list_customers` for CRM, and `list_sales` for recent transactions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listProductsTool, lowStockTool, listCustomersTool, listSalesTool],
});