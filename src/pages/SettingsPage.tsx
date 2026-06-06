import { useState, useMemo, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuth } from "@/hooks/use-auth";
import { useAudit } from "@/hooks/use-audit";
import { toast } from "sonner";
import {
  Settings, Palette, Shield, Plug, Receipt, Image, Sun, Moon, Globe, Bell, Lock, Key, Save, Upload, Check, Monitor, DollarSign, X, Building2, GitBranch, Plus, Trash2, ArrowUp, ArrowDown,
  Database, Package, AlertTriangle, Calendar, Clock, FileText, Download, HardDrive, RotateCcw, CreditCard, ShieldAlert, Wifi, Printer, RefreshCw, CheckCircle2,
} from "lucide-react";

type Tab = "general" | "business" | "receipt" | "integrations" | "security" | "data" | "workflows";

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

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`w-10 h-6 rounded-full transition-colors relative ${enabled ? "bg-primary" : "bg-muted"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <div><p className="text-sm font-medium text-foreground">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, formatCurrency, integrations, connectIntegration, disconnectIntegration, hasPermission } = useAppSettings();
  const { companyProfile, user: authUser } = useAuth();
  const { logAction } = useAudit();
  const [saved, setSaved] = useState(false);

  // Printer state
  const [availablePrinters, setAvailablePrinters] = useState<{ name: string; isDefault: boolean }[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printersError, setPrintersError] = useState("");

  const loadPrinters = useCallback(async () => {
    setPrintersLoading(true);
    setPrintersError("");
    try {
      const { getPrinters } = await import("tauri-plugin-printer-v2");
      const raw = await getPrinters();
      console.log("[Printers] Raw response:", raw);

      // getPrinters() returns a JSON string — parse it
      let list: any[] = [];
      if (typeof raw === "string") {
        try { list = JSON.parse(raw); } catch { list = []; }
      } else if (Array.isArray(raw)) {
        list = raw;
      }

      console.log("[Printers] Parsed list:", list);

      if (!Array.isArray(list) || list.length === 0) {
        setPrintersError("No printers found on this system. Make sure at least one printer is installed in Windows Settings → Printers & Scanners.");
        setAvailablePrinters([]);
        return;
      }

      const mapped = list.map((p: any) => ({
        name: p.name || p.printer_name || p.Name || p.PrinterName || (typeof p === "string" ? p : String(p)),
        isDefault: !!(p.is_default || p.isDefault || p.IsDefault),
      }));

      console.log("[Printers] Mapped printers:", mapped);
      setAvailablePrinters(mapped);
      toast.success(`Found ${mapped.length} printer${mapped.length > 1 ? "s" : ""}`);
    } catch (err: any) {
      console.error("[Printers] Failed to load:", err);
      setPrintersError(
        err?.message?.includes("invoke")
          ? "Printer plugin not available. Make sure the app is running as a Tauri desktop app (not in a browser)."
          : `Could not load printers: ${err?.message || String(err)}`
      );
    } finally {
      setPrintersLoading(false);
    }
  }, []);

  // Load printers whenever the receipt/hardware tab is opened
  useEffect(() => {
    if (activeTab === "receipt") {
      loadPrinters();
    }
  }, [activeTab, loadPrinters]);

  const handleSave = () => {
    setSaved(true);
    logAction("settings.update", "Settings", "all", "Settings saved");
    toast.success("Settings saved successfully");
    setTimeout(() => setSaved(false), 2000);
  };

  // Active sessions
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  useEffect(() => {
    if (activeTab !== "security") return;
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
    { key: "business", label: "Business Rules", icon: Package },
    { key: "receipt", label: "Receipt Design", icon: Receipt },
    { key: "workflows", label: "Workflows", icon: GitBranch },
    { key: "integrations", label: "Integrations", icon: Plug },
    { key: "security", label: "Security", icon: Shield },
    { key: "data", label: "Data & Backup", icon: Database },
  ];

  const tabPermMap: Record<Tab, string> = {
    general: "pages.settings.general", business: "pages.settings.general",
    receipt: "pages.settings.receipt", workflows: "pages.settings.general",
    integrations: "pages.settings.integrations", security: "pages.settings.security",
    data: "pages.settings.general",
  };

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
    saveWorkflowConfig({ ...workflowConfig, [activeWorkflowType]: stages });
  };

  const addStage = () => {
    const stages = [...workflowConfig[activeWorkflowType]];
    stages.push({ id: Date.now().toString(), name: "New Stage", role: "manager", description: "" });
    saveWorkflowConfig({ ...workflowConfig, [activeWorkflowType]: stages });
  };

  const removeStage = (index: number) => {
    const stages = [...workflowConfig[activeWorkflowType]];
    stages.splice(index, 1);
    saveWorkflowConfig({ ...workflowConfig, [activeWorkflowType]: stages });
  };

  const updateStage = (index: number, updates: Partial<WorkflowStage>) => {
    const stages = [...workflowConfig[activeWorkflowType]];
    stages[index] = { ...stages[index], ...updates };
    setWorkflowConfig(prev => ({ ...prev, [activeWorkflowType]: stages }));
  };

  const saveStagesDebounced = () => {
    saveWorkflowConfig(workflowConfig);
  };

  const resetWorkflowToDefault = () => {
    const updated = { ...workflowConfig, [activeWorkflowType]: defaultWorkflowConfig[activeWorkflowType] };
    saveWorkflowConfig(updated);
    toast.success("Reset to default stages");
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
            <p className="text-sm text-muted-foreground mt-1">Configure system preferences, business rules, integrations, and security</p>
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

        {/* ===================== GENERAL TAB ===================== */}
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

            {/* App Branding */}
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
                <p className="text-[10px] text-muted-foreground mt-1">Changes the name across the entire app</p>
              </div>
            </div>

            {/* Appearance */}
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
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tax Rate (%)</label>
                  <Input type="number" min={0} max={100} value={settings.taxRate} onChange={(e) => updateSettings({ taxRate: Number(e.target.value) })} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Locale & Formats */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Locale & Formats</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Language</label>
                  <select value={settings.language} onChange={(e) => updateSettings({ language: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="ar">Arabic</option><option value="pt">Portuguese</option><option value="zh">Chinese</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                  <select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option>UTC-05:00 Eastern</option><option>UTC-06:00 Central</option><option>UTC-07:00 Mountain</option><option>UTC-08:00 Pacific</option><option>UTC+00:00 GMT</option><option>UTC+01:00 CET</option><option>UTC+01:00 WAT</option><option>UTC+05:30 IST</option><option>UTC+08:00 SGT</option><option>UTC+09:00 JST</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date Format</label>
                  <select value={settings.dateFormat} onChange={(e) => updateSettings({ dateFormat: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option><option value="DD.MM.YYYY">DD.MM.YYYY</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Time Format</label>
                  <select value={settings.timeFormat} onChange={(e) => updateSettings({ timeFormat: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="12h">12-hour (1:30 PM)</option><option value="24h">24-hour (13:30)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="glass-card rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { key: "notifyEmail" as const, label: "Email", desc: "Receive updates via email" },
                  { key: "notifyPush" as const, label: "Push", desc: "Browser push notifications" },
                  { key: "notifySms" as const, label: "SMS Alerts", desc: "Critical alerts via SMS" },
                  { key: "notifyLowStock" as const, label: "Low Stock", desc: "Alert when stock is low" },
                  { key: "notifyNewOrder" as const, label: "New Orders", desc: "Notify on new orders" },
                  { key: "notifyApproval" as const, label: "Approvals", desc: "Approval request alerts" },
                ]).map((n) => (
                  <SettingRow key={n.key} label={n.label} desc={n.desc}>
                    <ToggleSwitch enabled={settings[n.key]} onToggle={() => updateSettings({ [n.key]: !settings[n.key] })} />
                  </SettingRow>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== BUSINESS RULES TAB ===================== */}
        {activeTab === "business" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Rules */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Inventory Rules</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Low Stock Threshold (units)</label>
                  <Input type="number" min={1} value={settings.lowStockThreshold} onChange={(e) => updateSettings({ lowStockThreshold: Number(e.target.value) })} className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Items below this qty trigger low-stock warnings</p>
                </div>
                <SettingRow label="Allow Negative Stock" desc="Permit selling below zero inventory">
                  <ToggleSwitch enabled={settings.allowNegativeStock} onToggle={() => updateSettings({ allowNegativeStock: !settings.allowNegativeStock })} />
                </SettingRow>
                <SettingRow label="Auto-Reorder" desc="Automatically create POs when stock is low">
                  <ToggleSwitch enabled={settings.autoReorderEnabled} onToggle={() => updateSettings({ autoReorderEnabled: !settings.autoReorderEnabled })} />
                </SettingRow>
              </div>
            </div>

            {/* Approval Rules */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Approval Rules</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Require Approval Above ({settings.currencySymbol})</label>
                  <Input type="number" min={0} value={settings.requireApprovalAbove} onChange={(e) => updateSettings({ requireApprovalAbove: Number(e.target.value) })} className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Transactions above this amount need manager approval</p>
                </div>
              </div>
            </div>

            {/* Payment Defaults */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Payment Defaults</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Default Payment Method</label>
                  <select value={settings.defaultPaymentMethod} onChange={(e) => updateSettings({ defaultPaymentMethod: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="mobile">Mobile Payment</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">Pre-selected in POS checkout</p>
                </div>
              </div>
            </div>

            {/* Business Info Card */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Quick Reference</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Currency</span><span className="font-medium text-foreground">{settings.currencySymbol} {settings.currency}</span></div>
                <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Tax Rate</span><span className="font-medium text-foreground">{settings.taxRate}%</span></div>
                <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Low Stock Alert</span><span className="font-medium text-foreground">{settings.lowStockThreshold} units</span></div>
                <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Approval Threshold</span><span className="font-medium text-foreground">{formatCurrency(settings.requireApprovalAbove)}</span></div>
                <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Negative Stock</span><span className={`font-medium ${settings.allowNegativeStock ? "text-warning" : "text-success"}`}>{settings.allowNegativeStock ? "Allowed" : "Blocked"}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== RECEIPT DESIGN TAB ===================== */}
        {activeTab === "receipt" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
                    <div><label className="text-xs font-medium text-muted-foreground">Tagline (under header)</label><Input value={settings.receiptTagline || ""} onChange={(e) => updateSettings({ receiptTagline: e.target.value })} placeholder="e.g. providing you with assorted drinks" className="mt-1" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Receipt Number Label</label><Input value={settings.receiptNumberLabel || ""} onChange={(e) => updateSettings({ receiptNumberLabel: e.target.value })} placeholder="Receipt No" className="mt-1" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Footer Message</label><Input value={settings.receiptFooter} onChange={(e) => updateSettings({ receiptFooter: e.target.value })} className="mt-1" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Return Policy Note</label><Input value={settings.receiptReturnPolicy} onChange={(e) => updateSettings({ receiptReturnPolicy: e.target.value })} className="mt-1" /></div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Print Settings</h3>
                  <div className="space-y-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Paper Width</label>
                      <select value={settings.paperWidth} onChange={(e) => updateSettings({ paperWidth: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                        <option value="80mm">80mm (Standard thermal)</option>
                        <option value="58mm">58mm (Compact thermal)</option>
                        <option value="A4">A4 (Full page)</option>
                      </select>
                    </div>
                    <div><label className="text-xs font-medium text-muted-foreground">Font Size</label>
                      <select value={settings.fontSize} onChange={(e) => updateSettings({ fontSize: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                        <option>Small</option><option>Medium</option><option>Large</option>
                      </select>
                    </div>
                    <SettingRow label="Show QR Code" desc="Add scannable QR code">
                      <ToggleSwitch enabled={settings.showQRCode} onToggle={() => updateSettings({ showQRCode: !settings.showQRCode })} />
                    </SettingRow>
                  </div>
                </div>
              </div>

            {/* Hardware & Printer Selection */}
            <div className="glass-card rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Hardware &amp; Printing</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Thermal</span>
                </div>
                <button onClick={loadPrinters} disabled={printersLoading} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${printersLoading ? 'animate-spin' : ''}`} />
                  {printersLoading ? 'Detecting...' : 'Refresh Printers'}
                </button>
              </div>
              {printersError && <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">{printersError}</div>}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Select Receipt / Thermal Printer</label>
                  <p className="text-[10px] text-muted-foreground mb-2 mt-0.5">When selected, all print jobs go silently to this printer with no dialog.</p>
                  <select
                    value={settings.selectedPrinter}
                    onChange={(e) => {
                      updateSettings({ selectedPrinter: e.target.value });
                      toast.success(e.target.value ? `Silent printing set to "${e.target.value}"` : 'Reverted to standard print dialog');
                      logAction('settings.update', 'Settings', 'printer', `Printer: ${e.target.value || '(none)'}`);
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">— Use Standard Print Dialog —</option>
                    {availablePrinters.map((p) => (<option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' Default' : ''}</option>))}
                  </select>
                  {availablePrinters.length === 0 && !printersLoading && !printersError && <p className="text-[10px] text-muted-foreground mt-1">No printers detected. Click Refresh Printers.</p>}
                </div>
                <div className="flex flex-col justify-center">
                  {settings.selectedPrinter ? (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-success">Silent Printing Active</p>
                          <p className="text-xs text-muted-foreground mt-0.5">All receipts and reports go directly to:</p>
                          <p className="text-sm font-bold text-foreground mt-1 truncate">{settings.selectedPrinter}</p>
                          <button onClick={() => { updateSettings({ selectedPrinter: '' }); toast.success('Reverted to print dialog'); }} className="mt-2 text-[10px] text-destructive hover:underline">Clear selection</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
                      <Printer className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No printer selected</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Standard OS print dialog will be used</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* ===================== INTEGRATIONS TAB ===================== */}
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
                        <button onClick={() => openConfig(int)} className="text-xs text-muted-foreground hover:text-foreground">Configure</button>
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
                  <Plug className="w-4 h-4" />{configModal.connected ? "Update" : "Connect"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== WORKFLOWS TAB ===================== */}
        {activeTab === "workflows" && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Approval Stage Configuration</h3>
                </div>
                <button onClick={resetWorkflowToDefault} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-5">Define the approval stages for each workflow type. Each stage requires a specific role. Admins and Super Admins can always approve any stage.</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {([
                  { key: "purchase_order" as const, label: "Purchase Orders" },
                  { key: "stock_transfer" as const, label: "Stock Transfers" },
                  { key: "expense" as const, label: "Expenses" },
                  { key: "discount" as const, label: "Discounts" },
                  { key: "document" as const, label: "Documents" },
                  { key: "workflow" as const, label: "Workflows" },
                  { key: "general" as const, label: "General" },
                ]).map((wt) => (
                  <button key={wt.key} onClick={() => setActiveWorkflowType(wt.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeWorkflowType === wt.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {wt.label}
                    <span className="ml-2 text-[10px] opacity-70">({workflowConfig[wt.key].length} stages)</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {workflowConfig[activeWorkflowType].map((stage, index) => (
                  <div key={stage.id} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border group">
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
                {workflowConfig[activeWorkflowType].map((stage) => (
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

        {/* ===================== SECURITY TAB ===================== */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Authentication */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
              </div>
              <div className="space-y-4">
                <SettingRow label="Two-Factor Authentication" desc="Add an extra layer of security">
                  <ToggleSwitch enabled={settings.twoFactorEnabled} onToggle={() => updateSettings({ twoFactorEnabled: !settings.twoFactorEnabled })} />
                </SettingRow>
                <SettingRow label="Auto-Lock Screen" desc="Lock after inactivity period">
                  <ToggleSwitch enabled={settings.autoLockScreen} onToggle={() => updateSettings({ autoLockScreen: !settings.autoLockScreen })} />
                </SettingRow>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Session Timeout</label>
                  <select value={settings.sessionTimeout} onChange={(e) => updateSettings({ sessionTimeout: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option>15 minutes</option><option>30 minutes</option><option>1 hour</option><option>4 hours</option><option>8 hours</option><option>24 hours</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Password Policy</label>
                  <select value={settings.passwordPolicy} onChange={(e) => updateSettings({ passwordPolicy: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option>Strong (12+ chars, mixed case, symbols)</option><option>Medium (8+ chars, mixed case)</option><option>Basic (6+ chars)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Max Login Attempts</label>
                  <Input type="number" min={1} max={20} value={settings.maxLoginAttempts} onChange={(e) => updateSettings({ maxLoginAttempts: Number(e.target.value) })} className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Account locks after this many failed attempts</p>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Access Control</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">IP Whitelist</label>
                  <textarea
                    value={settings.ipWhitelist}
                    onChange={(e) => updateSettings({ ipWhitelist: e.target.value })}
                    placeholder="Enter IP addresses, one per line. Leave empty to allow all."
                    className="mt-1 w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Restrict access to specific IP addresses</p>
                </div>
              </div>
            </div>

            {/* API Keys */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">API keys allow external services to interact with your system. Generate keys for custom integrations.</p>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Read-Only Key</p>
                      <p className="text-[10px] text-muted-foreground font-mono">••••••••••••••••</p>
                    </div>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Not generated</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Full Access Key</p>
                      <p className="text-[10px] text-muted-foreground font-mono">••••••••••••••••</p>
                    </div>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Not generated</span>
                  </div>
                </div>
                <button className="w-full py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors flex items-center justify-center gap-2">
                  <Key className="w-3.5 h-3.5" /> Generate New API Key
                </button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wifi className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
              </div>
              <div className="space-y-3">
                {activeSessions.length === 0 ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Current Session<span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success">Active</span></p>
                        <p className="text-[10px] text-muted-foreground">This device · {new Date().toLocaleString()}</p>
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

        {/* ===================== DATA & BACKUP TAB ===================== */}
        {activeTab === "data" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audit Log Retention */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Audit Log Retention</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Retention Period (days)</label>
                  <Input type="number" min={30} max={3650} value={settings.auditRetentionDays} onChange={(e) => updateSettings({ auditRetentionDays: Number(e.target.value) })} className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Audit records older than this will be archived. Minimum 30 days.</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                  <p className="text-xs font-medium text-foreground">Current retention: <span className="text-primary">{settings.auditRetentionDays} days</span></p>
                  <p className="text-[10px] text-muted-foreground">≈ {Math.round(settings.auditRetentionDays / 30)} months · {(settings.auditRetentionDays / 365).toFixed(1)} years</p>
                </div>
              </div>
            </div>

            {/* Backup Settings */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <HardDrive className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Backup Settings</h3>
              </div>
              <div className="space-y-4">
                <SettingRow label="Automatic Backups" desc="Schedule regular data backups">
                  <ToggleSwitch enabled={settings.autoBackupEnabled} onToggle={() => updateSettings({ autoBackupEnabled: !settings.autoBackupEnabled })} />
                </SettingRow>
                {settings.autoBackupEnabled && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Backup Frequency</label>
                    <select value={settings.backupFrequency} onChange={(e) => updateSettings({ backupFrequency: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="hourly">Every Hour</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Data Export */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Data Export</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Default Export Format</label>
                  <select value={settings.dataExportFormat} onChange={(e) => updateSettings({ dataExportFormat: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="csv">CSV (Comma Separated)</option>
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2.5 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Export Inventory
                  </button>
                  <button className="py-2.5 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Export Sales
                  </button>
                  <button className="py-2.5 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Export Users
                  </button>
                  <button className="py-2.5 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Export Audit Log
                  </button>
                </div>
              </div>
            </div>

            {/* Storage Info */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Storage Overview</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Documents", usage: "—", color: "bg-primary" },
                  { label: "Chat Attachments", usage: "—", color: "bg-accent" },
                  { label: "Avatars", usage: "—", color: "bg-success" },
                  { label: "Logos", usage: "—", color: "bg-warning" },
                ].map(bucket => (
                  <div key={bucket.label} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${bucket.color}`} />
                      <span className="text-sm text-foreground">{bucket.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{bucket.usage}</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center mt-2">Storage is managed by Lovable Cloud</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}