import { useState } from "react";
import { Copy, Check, Bot, Sparkles, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";

const mcpUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

export default function ConnectPage() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <Sparkles className="w-3.5 h-3.5" /> Agent integrations
          </div>
          <h1 className="text-2xl font-bold text-foreground">Connect an AI assistant</h1>
          <p className="text-sm text-muted-foreground">
            Let ChatGPT or Claude access your workspace to look up products, customers, sales, and low stock — all scoped to your account.
          </p>
        </header>

        <Card className="p-5 space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your MCP server URL</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono px-3 py-2.5 rounded-lg bg-muted/60 text-foreground break-all">
              {mcpUrl}
            </code>
            <Button onClick={copy} variant={copied ? "secondary" : "default"} className="shrink-0">
              {copied ? <><Check className="w-4 h-4 mr-1.5" /> Copied</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this URL into your assistant when it asks for a connector or MCP server URL. You'll sign in once with your account to authorize it.
          </p>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Connect from ChatGPT</h2>
              <p className="text-xs text-muted-foreground">Requires ChatGPT Developer mode.</p>
            </div>
          </div>
          <ol className="space-y-2.5 text-sm text-foreground list-decimal pl-5">
            <li>
              Open{" "}
              <a
                href="https://chatgpt.com/#settings/Connectors/Advanced"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                ChatGPT connector settings <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and enable <strong>Developer mode</strong> (read the risk notice shown there).
            </li>
            <li>In the chat composer's <strong>+</strong> menu, turn on <strong>Developer mode</strong>.</li>
            <li>Click <strong>Add sources</strong>, then <strong>Connect more</strong>.</li>
            <li>Give the connector a name and paste the MCP URL above.</li>
            <li>Ask ChatGPT to use your workspace (e.g. "list my low-stock products").</li>
          </ol>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Connect from Claude</h2>
              <p className="text-xs text-muted-foreground">Uses Claude custom connectors.</p>
            </div>
          </div>
          <ol className="space-y-2.5 text-sm text-foreground list-decimal pl-5">
            <li>
              Open{" "}
              <a
                href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Claude custom connectors <ExternalLink className="w-3 h-3" />
              </a>
              .
            </li>
            <li>Give the connector a name and paste the MCP URL above.</li>
            <li>Enable the connector from the chat composer, then ask Claude to use your workspace.</li>
          </ol>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Your assistant will discover the available tools automatically after connecting. All data stays scoped to your account.
        </p>
      </div>
    </AppLayout>
  );
}