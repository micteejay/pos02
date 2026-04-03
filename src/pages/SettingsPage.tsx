import { useState, useMemo, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import { useAudit } from "@/hooks/use-audit";
import { toast } from "sonner";
import {
  Settings, Palette, Shield, Plug, Receipt, Image, Sun, Moon, Globe, Bell, Lock, Key, Save, Upload, Check, Monitor, DollarSign, X, Building2, GitBranch, GripVertical, Plus, Trash2, ArrowUp, ArrowDown,
} from "lucide-react";

type Tab = "general" | "receipt" | "integrations" | "security" | "workflows";

interface WorkflowStage {
  id: string;
  name: string;
  role: string;
  description: string;
}

interface WorkflowConfig {
  purchase_order: WorkflowStage[];
  stock_transfer: WorkflowStage[];
  expense: WorkflowStage[];
  discount: WorkflowStage[];
  document: WorkflowStage[];
  workflow: WorkflowStage[];
  general: WorkflowStage[];
}

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
];

interface ReceiptPreviewProps {
  style: string;
  settings: ReturnType<typeof useAppSettings>["settings"];
  formatCurrency: (n: number) => string;
}

function ReceiptPreview({ style, settings, formatCurrency }: ReceiptPreviewProps) {
  const items = [
    { name: "Widget Alpha", qty: 2, price: 24.99 },
    { name: "Sensor X10", qty: 1, price: 89.00 },
    { name: "USB Hub 7-Port", qty: 3, price: 29.99 },
  ];
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * (settings.taxRate / 100);
  const total = subtotal + tax;

  const isModern = style === "modern";
  const isMinimal = style === "minimal";
  const isBranded = style === "branded";
  const isCompact = style === "compact";
  const isThermal = style === "thermal";
  const isInvoice = style === "invoice";

  if (isInvoice) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 text-[10px] leading-relaxed max-w-[320px] mx-auto font-sans">
        <div className="flex justify-between items-start mb-4">
          <div><p className="font-bold text-foreground text-sm">{settings.receiptHeader || settings.appName}</p><p className="text-muted-foreground">123 Main St, Metro City</p></div>
          <div className="text-right"><p className="text-lg font-bold text-primary">INVOICE</p><p className="text-muted-foreground">INV-2026-0301</p><p className="text-muted-foreground">Mar 03, 2026</p></div>
        </div>
        <div className="border-t border-border pt-2 mb-3"><p className="font-semibold text-foreground mb-1">Bill To:</p><p className="text-muted-foreground">Walk-in Customer</p></div>
        <table className="w-full mb-3"><thead><tr className="border-b border-border"><th className="text-left py-1 text-muted-foreground font-medium">Item</th><th className="text-center py-1 text-muted-foreground font-medium">Qty</th><th className="text-right py-1 text-muted-foreground font-medium">Price</th><th className="text-right py-1 text-muted-foreground font-medium">Total</th></tr></thead>
        <tbody>{items.map((item, i) => (<tr key={i} className="border-b border-border/50"><td className="py-1 text-foreground">{item.name}</td><td className="py-1 text-center text-muted-foreground">{item.qty}</td><td className="py-1 text-right text-muted-foreground">{formatCurrency(item.price)}</td><td className="py-1 text-right text-foreground">{formatCurrency(item.qty * item.price)}</td></tr>))}</tbody></table>
        <div className="border-t border-border pt-2 space-y-0.5">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Tax ({settings.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
          <div className="flex justify-between font-bold text-foreground text-xs mt-1 pt-1 border-t border-border"><span>Total Due</span><span>{formatCurrency(total)}</span></div>
        </div>
        <div className="mt-3 pt-2 border-t border-border text-center text-muted-foreground"><p>{settings.receiptFooter}</p></div>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-4 font-mono text-[10px] leading-relaxed max-w-[280px] mx-auto ${isThermal ? "bg-amber-50 dark:bg-amber-950/20 border-dashed" : ""}`}>
      {(isModern || isBranded) && <div className="h-1 rounded-full bg-primary mb-3" />}
      <div className={`${isMinimal ? "text-left" : "text-center"} mb-3`}>
        {!isMinimal && !isCompact && (
          <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ${isMinimal ? "" : "mx-auto"} mb-1`}>
            {settings.appName.charAt(0)}
          </div>
        )}
        <p className="font-bold text-foreground text-xs">{settings.receiptHeader || settings.appName}</p>
        {!isCompact && <p className="text-muted-foreground">123 Main St, Metro City</p>}
        <p className="text-muted-foreground">Tel: (555) 123-4567</p>
      </div>
      {!isMinimal && <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border mb-2`} />}
      <div className="flex justify-between text-muted-foreground mb-1"><span>Date: Mar 03, 2026</span><span>TXN-9301</span></div>
      <div className="flex justify-between text-muted-foreground mb-2"><span>Cashier: Sarah C.</span><span>14:32</span></div>
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border my-2`} />
      {items.map((item, i) => (<div key={i} className="flex justify-between text-foreground"><span>{item.name} ×{item.qty}</span><span>{formatCurrency(item.qty * item.price)}</span></div>))}
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border my-2`} />
      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
      <div className="flex justify-between text-muted-foreground"><span>Tax ({settings.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
      {(isModern || isBranded) && <div className="h-px bg-primary/30 my-1" />}
      <div className="flex justify-between font-bold text-foreground text-xs mt-1"><span>TOTAL</span><span>{formatCurrency(total)}</span></div>
      <div className="flex justify-between text-muted-foreground mt-1"><span>Payment</span><span>Credit Card</span></div>
      <div className={`border-t ${isThermal ? "border-dashed" : ""} border-border mt-3 pt-2 text-center`}>
        {settings.showQRCode && !isCompact && (<div className="w-12 h-12 mx-auto mb-2 border border-border rounded flex items-center justify-center text-[8px] text-muted-foreground">QR</div>)}
        <p className="text-muted-foreground">{settings.receiptFooter}</p>
        {!isCompact && <p className="text-muted-foreground mt-1 text-[9px]">{settings.receiptReturnPolicy}</p>}
      </div>
      {isBranded && <div className="h-1 rounded-full bg-primary mt-3" />}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, formatCurrency, integrations, connectIntegration, disconnectIntegration, hasPermission } = useAppSettings();
  const { companyProfile } = useAuth();
  const { logAction } = useAudit();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    logAction("settings.update", "Settings", "all", "Settings saved");
    toast.success("Settings saved successfully");
    setTimeout(() => setSaved(false), 2000);
  };

  // Real active sessions
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  useEffect(() => {
    if (activeTab !== "security") return;
    const { user } = companyProfile ? { user: { id: "" } } : { user: null };
    supabase.from("user_sessions").select("*").order("started_at", { ascending: false }).limit(20).then(({ data }) => {
      if (data) setActiveSessions(data);
    });
  }, [activeTab]);

  const receiptStyles = [
    { id: "classic", name: "Classic", description: "Traditional receipt with clean lines" },
    { id: "modern", name: "Modern", description: "Sleek with accent bars and rounded elements" },
    { id: "minimal", name: "Minimal", description: "Clean and simple, essentials only" },
    { id: "branded", name: "Branded", description: "Bold branding with accent colors" },
    { id: "compact", name: "Compact", description: "Space-saving for narrow paper" },
    { id: "thermal", name: "Thermal", description: "Classic thermal printer style" },
    { id: "invoice", name: "Invoice", description: "Full invoice format with billing details" },
  ];

  const allTabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "general", label: "General", icon: Settings },
    { key: "receipt", label: "Receipt Design", icon: Receipt },
    { key: "workflows", label: "Workflows", icon: GitBranch },
    { key: "integrations", label: "Integrations", icon: Plug },
    { key: "security", label: "Security", icon: Shield },
  ];

  const tabPermMap: Record<Tab, string> = { general: "pages.settings.general", receipt: "pages.settings.receipt", workflows: "pages.settings.general", integrations: "pages.settings.integrations", security: "pages.settings.security" };

  // Workflow stages config
  const availableRoles = ["super_admin", "admin", "manager", "sales_rep", "warehouse_staff", "viewer"];
  const roleLabels: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", manager: "Manager", sales_rep: "Sales Rep", warehouse_staff: "Warehouse Staff", viewer: "Viewer" };

  const defaultWorkflowConfig: WorkflowConfig = {
    purchase_order: [
      { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews the purchase order" },
      { id: "2", name: "Admin Approval", role: "admin", description: "Admin gives final approval" },
    ],
    stock_transfer: [
      { id: "1", name: "Warehouse Check", role: "warehouse_staff", description: "Warehouse staff verifies stock" },
      { id: "2", name: "Manager Approval", role: "manager", description: "Manager approves transfer" },
    ],
    expense: [
      { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews expense" },
      { id: "2", name: "Admin Approval", role: "admin", description: "Admin approves expense" },
    ],
    discount: [
      { id: "1", name: "Manager Approval", role: "manager", description: "Manager approves discount request" },
    ],
    document: [
      { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews document" },
      { id: "2", name: "Admin Approval", role: "admin", description: "Admin gives final approval" },
    ],
    workflow: [
      { id: "1", name: "Manager Review", role: "manager", description: "Manager reviews workflow request" },
      { id: "2", name: "Admin Approval", role: "admin", description: "Admin approves workflow" },
    ],
    general: [
      { id: "1", name: "Manager Approval", role: "manager", description: "Manager reviews and approves" },
    ],
  };

  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>(defaultWorkflowConfig);
  const [activeWorkflowType, setActiveWorkflowType] = useState<keyof WorkflowConfig>("purchase_order");

  // Load workflow config from app_settings
  useEffect(() => {
    if (activeTab !== "workflows") return;
    supabase.from("app_settings").select("*").eq("key", "workflow_stages").single().then(({ data }) => {
      if (data?.value) {
        try {
          const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          setWorkflowConfig(prev => ({ ...prev, ...val }));
        } catch {}
      }
    });
  }, [activeTab]);

  const saveWorkflowConfig = async (config: WorkflowConfig) => {
    setWorkflowConfig(config);
    await supabase.from("app_settings").upsert({ key: "workflow_stages", value: config as any, updated_by: null }, { onConflict: "key" });
    toast.success("Workflow stages saved");
    logAction("settings.update", "Settings", "workflow_stages", "Updated workflow approval stages");
  };

  const moveStage = (dir: "up" | "down", index: number) => {
    const stages = [...workflowConfig[activeWorkflowType]];
    const swapIdx = dir === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= stages.length) return;
    [stages[index], stages[swapIdx]] = [stages[swapIdx], stages[index]];
    const updated = { ...workflowConfig, [activeWorkflowType]: stages };
    saveWorkflowConfig(updated);
  };

  const addStage = () => {
    const stages = [...workflowConfig[activeWorkflowType]];
    stages.push({ id: Date.now().toString(), name: "New Stage", role: "manager", description: "" });
    const updated = { ...workflowConfig, [activeWorkflowType]: stages };
    saveWorkflowConfig(updated);
  };

  const removeStage = (index: number) => {
    const stages = [...workflowConfig[activeWorkflowType]];
    stages.splice(index, 1);
    const updated = { ...workflowConfig, [activeWorkflowType]: stages };
    saveWorkflowConfig(updated);
  };

  const updateStage = (index: number, updates: Partial<WorkflowStage>) => {
    const stages = [...workflowConfig[activeWorkflowType]];
    stages[index] = { ...stages[index], ...updates };
    const updated = { ...workflowConfig, [activeWorkflowType]: stages };
    setWorkflowConfig(updated);
  };

  const saveStagesDebounced = () => {
    saveWorkflowConfig(workflowConfig);
  };
  const tabs = useMemo(() => allTabs.filter(t => hasPermission(tabPermMap[t.key] as any)), [hasPermission]);

  const [configModal, setConfigModal] = useState<typeof integrations[0] | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [intCategoryFilter, setIntCategoryFilter] = useState("all");

  const openConfig = (integration: typeof integrations[0]) => {
    setConfigModal(integration);
    setConfigValues(integration.configValues || {});
  };

  const saveConfig = () => {
    if (configModal) {
      connectIntegration(configModal.name, configValues);
      logAction("integration.connect", "Settings", configModal.name, `Connected integration: ${configModal.name}`);
      setConfigModal(null);
    }
  };

  const intCategories = [
    { key: "all", label: "All" },
    { key: "payment", label: "Payment" },
    { key: "communication", label: "Communication" },
    { key: "accounting", label: "Accounting" },
    { key: "other", label: "Other" },
  ];

  const filteredIntegrations = intCategoryFilter === "all"
    ? integrations
    : integrations.filter(i => i.category === intCategoryFilter);

  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure system preferences, integrations, and security</p>
          </div>
          <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.key === "integrations" && connectedCount > 0 && (
                <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full">{connectedCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Profile Summary */}
            {companyProfile && (
              <div className="glass-card rounded-xl p-6 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Company Profile</h3>
                  <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full">From Setup</span>
                </div>
                <div className="flex items-center gap-4">
                  {companyProfile.logoUrl ? (
                    <img src={companyProfile.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{companyProfile.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{companyProfile.name}</p>
                    <p className="text-xs text-muted-foreground">{companyProfile.industry} · {companyProfile.businessType} {companyProfile.rcNumber && `· RC: ${companyProfile.rcNumber}`}</p>
                    <p className="text-xs text-muted-foreground">{companyProfile.phone} · {companyProfile.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* App Logo & Name */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">App Branding</h3>
              </div>
              <div className="flex items-center gap-6 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{settings.appName.charAt(0)}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />Upload Logo
                    <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || file.size > 2 * 1024 * 1024) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => updateSettings({ logoUrl: ev.target?.result as string });
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  <p className="text-[10px] text-muted-foreground">PNG, SVG, JPG up to 2MB</p>
                  {settings.logoUrl && (
                    <button onClick={() => updateSettings({ logoUrl: "" })} className="text-[10px] text-destructive hover:underline">Remove logo</button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Application Name</label>
                <Input value={settings.appName} onChange={(e) => updateSettings({ appName: e.target.value })} className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">Changes the name across the entire app — sidebar, mobile header, receipts</p>
              </div>
            </div>

            {/* Theme */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([{ key: "light" as const, label: "Light", icon: Sun }, { key: "dark" as const, label: "Dark", icon: Moon }, { key: "system" as const, label: "System", icon: Monitor }]).map((t) => (
                  <button key={t.key} onClick={() => setTheme(t.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === t.key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                    <t.icon className={`w-5 h-5 ${theme === t.key ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${theme === t.key ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency & Tax */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Currency & Tax</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <select value={settings.currency} onChange={(e) => {
                    const c = currencies.find(c => c.code === e.target.value);
                    if (c) updateSettings({ currency: c.code, currencySymbol: c.symbol });
                  }} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">Affects currency display in POS, Sales, Reports, and Dashboard</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tax Rate (%)</label>
                  <Input type="number" min={0} max={100} value={settings.taxRate} onChange={(e) => updateSettings({ taxRate: Number(e.target.value) })} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Business Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Language</label>
                  <select value={settings.language} onChange={(e) => updateSettings({ language: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="ar">Arabic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                  <select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option>UTC-05:00 Eastern</option><option>UTC-06:00 Central</option><option>UTC-07:00 Mountain</option><option>UTC-08:00 Pacific</option><option>UTC+00:00 GMT</option><option>UTC+01:00 CET</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="glass-card rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([{ key: "notifyEmail" as const, label: "Email", desc: "Receive updates via email" }, { key: "notifyPush" as const, label: "Push", desc: "Browser push notifications" }, { key: "notifySms" as const, label: "SMS Alerts", desc: "Critical alerts via SMS" }]).map((n) => (
                  <div key={n.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div><p className="text-sm font-medium text-foreground">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
                    <button onClick={() => updateSettings({ [n.key]: !settings[n.key] })} className={`w-10 h-6 rounded-full transition-colors relative ${settings[n.key] ? "bg-primary" : "bg-muted"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${settings[n.key] ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Receipt Design Tab */}
        {activeTab === "receipt" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {receiptStyles.map((style) => (
                <button key={style.id} onClick={() => updateSettings({ receiptStyle: style.id })}
                  className={`glass-card rounded-xl p-3 text-left transition-all ${settings.receiptStyle === style.id ? "border-primary ring-1 ring-primary/30" : "hover:border-muted-foreground/30"}`}>
                  <h4 className="text-sm font-semibold text-foreground">{style.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{style.description}</p>
                  {settings.receiptStyle === style.id && <div className="mt-2 flex items-center gap-1 text-primary text-[10px] font-medium"><Check className="w-3 h-3" /> Active</div>}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Live Preview</h3>
                <ReceiptPreview style={settings.receiptStyle} settings={settings} formatCurrency={formatCurrency} />
              </div>
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Receipt Content</h3>
                  <div className="space-y-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Header Text</label><Input value={settings.receiptHeader} onChange={(e) => updateSettings({ receiptHeader: e.target.value })} className="mt-1" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Footer Message</label><Input value={settings.receiptFooter} onChange={(e) => updateSettings({ receiptFooter: e.target.value })} className="mt-1" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Return Policy Note</label><Input value={settings.receiptReturnPolicy} onChange={(e) => updateSettings({ receiptReturnPolicy: e.target.value })} className="mt-1" /></div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Print Settings</h3>
                  <div className="space-y-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Paper Width</label>
                      <select value={settings.paperWidth} onChange={(e) => updateSettings({ paperWidth: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                        <option>80mm (Standard)</option><option>58mm (Compact)</option><option>A4 (Full Page)</option>
                      </select>
                    </div>
                    <div><label className="text-xs font-medium text-muted-foreground">Font Size</label>
                      <select value={settings.fontSize} onChange={(e) => updateSettings({ fontSize: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                        <option>Small</option><option>Medium</option><option>Large</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Show QR Code</p><p className="text-xs text-muted-foreground">Add scannable QR code</p></div>
                      <button onClick={() => updateSettings({ showQRCode: !settings.showQRCode })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.showQRCode ? "bg-primary" : "bg-muted"}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${settings.showQRCode ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="space-y-4">
            {connectedCount > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm text-foreground"><span className="font-semibold text-primary">{connectedCount}</span> integration{connectedCount > 1 ? "s" : ""} active — connected services are available across POS, Sales, Invoices, and Notifications.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {intCategories.map(c => (
                <button key={c.key} onClick={() => setIntCategoryFilter(c.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${intCategoryFilter === c.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map((int) => (
                <div key={int.name} className={`glass-card rounded-xl p-5 transition-colors ${int.connected ? "border-success/30" : "hover:border-primary/30"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">{int.icon}</div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{int.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{int.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${int.connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {int.connected ? "Connected" : "Not Connected"}
                    </span>
                    <div className="flex items-center gap-2">
                      {int.connected && (
                        <button onClick={() => openConfig(int)} className="text-xs text-muted-foreground hover:text-foreground">
                          Configure
                        </button>
                      )}
                      <button onClick={() => int.connected ? disconnectIntegration(int.name) : openConfig(int)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${int.connected ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                        {int.connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integration Config Modal */}
        {configModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfigModal(null)}>
            <div className="glass-card rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{configModal.icon}</span>
                  <h3 className="text-lg font-semibold text-foreground">{configModal.connected ? "Configure" : "Connect"} {configModal.name}</h3>
                </div>
                <button onClick={() => setConfigModal(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{configModal.description}. Enter your credentials to connect.</p>
              <div className="space-y-3">
                {configModal.configFields.map((field) => (
                  <div key={field}>
                    <label className="text-xs font-medium text-muted-foreground">{field}</label>
                    <Input
                      type={field.toLowerCase().includes("secret") || field.toLowerCase().includes("password") || field.toLowerCase().includes("token") ? "password" : "text"}
                      value={configValues[field] || ""}
                      onChange={(e) => setConfigValues(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={`Enter ${field.toLowerCase()}`}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setConfigModal(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button onClick={saveConfig} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> {configModal.connected ? "Update" : "Connect"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-3">Credentials are stored locally. Enable Lovable Cloud for production use.</p>
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === "workflows" && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Approval Stage Configuration</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-5">Define the approval stages for each workflow type. Each stage requires a specific role to approve. Admins and Super Admins can always approve any stage.</p>

              {/* Workflow type selector */}
              <div className="flex flex-wrap gap-2 mb-6">
                {([
                  { key: "purchase_order" as const, label: "Purchase Orders" },
                  { key: "stock_transfer" as const, label: "Stock Transfers" },
                  { key: "expense" as const, label: "Expenses" },
                  { key: "general" as const, label: "General" },
                ]).map((wt) => (
                  <button key={wt.key} onClick={() => setActiveWorkflowType(wt.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeWorkflowType === wt.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {wt.label}
                    <span className="ml-2 text-[10px] opacity-70">({workflowConfig[wt.key].length} stages)</span>
                  </button>
                ))}
              </div>

              {/* Stages list */}
              <div className="space-y-3">
                {workflowConfig[activeWorkflowType].map((stage, index) => (
                  <div key={stage.id} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border group">
                    {/* Stage number & reorder */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{index + 1}</span>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveStage("up", index)} disabled={index === 0}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground hover:text-foreground">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveStage("down", index)} disabled={index === workflowConfig[activeWorkflowType].length - 1}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground hover:text-foreground">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stage details */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stage Name</label>
                        <Input value={stage.name} onChange={(e) => updateStage(index, { name: e.target.value })} onBlur={saveStagesDebounced} className="mt-1 h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Required Role</label>
                        <select value={stage.role} onChange={(e) => { updateStage(index, { role: e.target.value }); setTimeout(() => saveWorkflowConfig({ ...workflowConfig, [activeWorkflowType]: workflowConfig[activeWorkflowType].map((s, i) => i === index ? { ...s, role: e.target.value } : s) }), 0); }}
                          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                          {availableRoles.map(r => <option key={r} value={r}>{roleLabels[r] || r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                        <Input value={stage.description} onChange={(e) => updateStage(index, { description: e.target.value })} onBlur={saveStagesDebounced} className="mt-1 h-9 text-sm" placeholder="Optional description" />
                      </div>
                    </div>

                    {/* Delete */}
                    <button onClick={() => removeStage(index)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all mt-4">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {workflowConfig[activeWorkflowType].length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No approval stages configured. Add one below.</div>
                )}
              </div>

              <button onClick={addStage} className="mt-4 w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Approval Stage
              </button>
            </div>

            {/* Visual pipeline preview */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Approval Pipeline Preview</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground">Request Created</div>
                {workflowConfig[activeWorkflowType].map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-2">
                    <div className="w-6 border-t border-dashed border-border" />
                    <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-xs font-medium text-primary border border-primary/20">
                      {stage.name} <span className="text-[10px] opacity-70">({roleLabels[stage.role] || stage.role})</span>
                    </div>
                  </div>
                ))}
                <div className="w-6 border-t border-dashed border-border" />
                <div className="px-3 py-1.5 rounded-lg bg-success/10 text-xs font-medium text-success">Approved ✓</div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">Admins and Super Admins can approve any stage regardless of role assignment.</p>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-foreground">Two-Factor Authentication</p><p className="text-xs text-muted-foreground">Add an extra layer of security</p></div>
                  <button onClick={() => updateSettings({ twoFactorEnabled: !settings.twoFactorEnabled })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.twoFactorEnabled ? "bg-primary" : "bg-muted"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${settings.twoFactorEnabled ? "translate-x-5" : "translate-x-1"}`} />
                  </button>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Session Timeout</label>
                  <select value={settings.sessionTimeout} onChange={(e) => updateSettings({ sessionTimeout: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option>30 minutes</option><option>1 hour</option><option>4 hours</option><option>8 hours</option>
                  </select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Password Policy</label>
                  <select value={settings.passwordPolicy} onChange={(e) => updateSettings({ passwordPolicy: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option>Strong (12+ chars, mixed case, symbols)</option><option>Medium (8+ chars, mixed case)</option><option>Basic (6+ chars)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center py-4">No API keys generated yet.</p>
                <button className="w-full py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">+ Generate New Key</button>
              </div>
            </div>
            <div className="glass-card rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
              </div>
              <div className="space-y-3">
                {activeSessions.length === 0 ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Current Session<span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success">Active</span></p>
                        <p className="text-[10px] text-muted-foreground">This device</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  activeSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {s.user_agent ? s.user_agent.slice(0, 50) : "Unknown device"}
                            {s.is_active && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success">Active</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{s.ip_address || "Unknown IP"} · {new Date(s.started_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
