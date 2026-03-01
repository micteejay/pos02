import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Palette,
  Shield,
  Plug,
  Receipt,
  Image,
  Sun,
  Moon,
  Globe,
  Bell,
  Lock,
  Key,
  Save,
  Upload,
  Check,
  Monitor,
} from "lucide-react";

type Tab = "general" | "receipt" | "integrations" | "security";

const receiptStyles = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional receipt with clean lines and standard layout",
    preview: { headerAlign: "center", showLogo: true, showBorder: true, accentBar: false },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sleek design with rounded elements and soft shadows",
    preview: { headerAlign: "center", showLogo: true, showBorder: false, accentBar: true },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple with essential information only",
    preview: { headerAlign: "left", showLogo: false, showBorder: false, accentBar: false },
  },
  {
    id: "branded",
    name: "Branded",
    description: "Bold branding with accent colors and prominent logo",
    preview: { headerAlign: "center", showLogo: true, showBorder: true, accentBar: true },
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [selectedReceipt, setSelectedReceipt] = useState("modern");
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("en");
  const [notifications, setNotifications] = useState({ email: true, push: true, sms: false });
  const [twoFactor, setTwoFactor] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "general", label: "General", icon: Settings },
    { key: "receipt", label: "Receipt Design", icon: Receipt },
    { key: "integrations", label: "Integrations", icon: Plug },
    { key: "security", label: "Security", icon: Shield },
  ];

  const integrations = [
    { name: "Stripe", description: "Payment processing and billing", connected: true, icon: "💳" },
    { name: "SendGrid", description: "Transactional email delivery", connected: true, icon: "📧" },
    { name: "Slack", description: "Team notifications and alerts", connected: false, icon: "💬" },
    { name: "QuickBooks", description: "Accounting and bookkeeping", connected: false, icon: "📊" },
    { name: "Shopify", description: "E-commerce platform sync", connected: true, icon: "🛒" },
    { name: "Twilio", description: "SMS and voice communications", connected: false, icon: "📱" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure system preferences, integrations, and security</p>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              saved
                ? "bg-success text-success-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* App Logo */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">App Logo</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">E</span>
                </div>
                <div className="space-y-2">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </button>
                  <p className="text-[10px] text-muted-foreground">PNG, SVG up to 2MB. Recommended 256×256px.</p>
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "light", label: "Light", icon: Sun },
                  { key: "dark", label: "Dark", icon: Moon },
                  { key: "system", label: "System", icon: Monitor },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === t.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <t.icon className={`w-5 h-5 ${theme === t.key ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${theme === t.key ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                  </button>
                ))}
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
                  <label className="text-xs font-medium text-muted-foreground">Company Name</label>
                  <Input defaultValue="Enterprise Hub Inc." className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                  <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>UTC-05:00 Eastern</option>
                    <option>UTC-06:00 Central</option>
                    <option>UTC-07:00 Mountain</option>
                    <option>UTC-08:00 Pacific</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
              </div>
              <div className="space-y-4">
                {[
                  { key: "email" as const, label: "Email Notifications", desc: "Receive updates via email" },
                  { key: "push" as const, label: "Push Notifications", desc: "Browser push notifications" },
                  { key: "sms" as const, label: "SMS Alerts", desc: "Critical alerts via SMS" },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications((prev) => ({ ...prev, [n.key]: !prev[n.key] }))}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        notifications[n.key] ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${
                          notifications[n.key] ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {receiptStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedReceipt(style.id)}
                  className={`glass-card rounded-xl p-4 text-left transition-all ${
                    selectedReceipt === style.id
                      ? "border-primary ring-1 ring-primary/30"
                      : "hover:border-muted-foreground/30"
                  }`}
                >
                  {/* Mini receipt preview */}
                  <div className="w-full aspect-[3/4] rounded-lg bg-card border border-border mb-3 p-3 flex flex-col">
                    {style.preview.accentBar && <div className="h-1 rounded-full bg-primary mb-2" />}
                    {style.preview.showLogo && (
                      <div className={`w-8 h-8 rounded-lg bg-primary/10 mb-2 ${style.preview.headerAlign === "center" ? "mx-auto" : ""}`} />
                    )}
                    <div className={`space-y-1 ${style.preview.headerAlign === "center" ? "text-center" : ""}`}>
                      <div className="h-2 rounded bg-foreground/10 w-3/4 mx-auto" />
                      <div className="h-1.5 rounded bg-foreground/5 w-1/2 mx-auto" />
                    </div>
                    <div className="flex-1 mt-3 space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-1.5 rounded bg-foreground/8 w-1/3" />
                        <div className="h-1.5 rounded bg-foreground/8 w-1/5" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-1.5 rounded bg-foreground/8 w-2/5" />
                        <div className="h-1.5 rounded bg-foreground/8 w-1/6" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-1.5 rounded bg-foreground/8 w-1/4" />
                        <div className="h-1.5 rounded bg-foreground/8 w-1/5" />
                      </div>
                    </div>
                    {style.preview.showBorder && <div className="border-t border-dashed border-foreground/10 mt-2 pt-2">
                      <div className="h-2 rounded bg-primary/20 w-1/2 mx-auto" />
                    </div>}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{style.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{style.description}</p>
                  {selectedReceipt === style.id && (
                    <div className="mt-2 flex items-center gap-1 text-primary text-[10px] font-medium">
                      <Check className="w-3 h-3" /> Active
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Receipt Customization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Receipt Content</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Header Text</label>
                    <Input defaultValue="Enterprise Hub" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Footer Message</label>
                    <Input defaultValue="Thank you for your purchase!" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Return Policy Note</label>
                    <Input defaultValue="Returns accepted within 30 days with receipt." className="mt-1" />
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Print Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Paper Width</label>
                    <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option>80mm (Standard)</option>
                      <option>58mm (Compact)</option>
                      <option>A4 (Full Page)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Font Size</label>
                    <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option>Small</option>
                      <option>Medium</option>
                      <option>Large</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Show QR Code</p>
                      <p className="text-xs text-muted-foreground">Add scannable QR code</p>
                    </div>
                    <div className="w-10 h-6 rounded-full bg-primary relative cursor-pointer">
                      <div className="absolute top-1 translate-x-5 w-4 h-4 rounded-full bg-card shadow" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((int) => (
              <div key={int.name} className="glass-card rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                      {int.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{int.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{int.description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    int.connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {int.connected ? "Connected" : "Not Connected"}
                  </span>
                  <button className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    int.connected
                      ? "bg-muted text-foreground hover:bg-muted/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}>
                    {int.connected ? "Configure" : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <button
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${twoFactor ? "bg-primary" : "bg-muted"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${twoFactor ? "translate-x-5" : "translate-x-1"}`} />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Session Timeout</label>
                  <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>8 hours</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Password Policy</label>
                  <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>Strong (12+ chars, mixed case, symbols)</option>
                    <option>Medium (8+ chars, mixed case)</option>
                    <option>Basic (6+ chars)</option>
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
                {[
                  { name: "Production Key", created: "Jan 15, 2026", lastUsed: "2 hours ago" },
                  { name: "Staging Key", created: "Feb 1, 2026", lastUsed: "3 days ago" },
                  { name: "Development Key", created: "Feb 20, 2026", lastUsed: "1 hour ago" },
                ].map((key) => (
                  <div key={key.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{key.name}</p>
                      <p className="text-[10px] text-muted-foreground">Created {key.created} · Last used {key.lastUsed}</p>
                    </div>
                    <button className="text-xs text-destructive font-medium hover:underline">Revoke</button>
                  </div>
                ))}
                <button className="w-full py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
                  + Generate New Key
                </button>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
              </div>
              <div className="space-y-3">
                {[
                  { device: "Chrome on MacOS", ip: "192.168.1.100", location: "Metro City, US", current: true },
                  { device: "Safari on iPhone", ip: "10.0.0.45", location: "Metro City, US", current: false },
                  { device: "Firefox on Windows", ip: "172.16.0.12", location: "Remote Office", current: false },
                ].map((session, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.device}
                          {session.current && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success">Current</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{session.ip} · {session.location}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <button className="text-xs text-destructive font-medium hover:underline">Revoke</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
