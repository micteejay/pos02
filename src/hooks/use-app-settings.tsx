import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface AppSettings {
  appName: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  receiptStyle: string;
  receiptHeader: string;
  receiptFooter: string;
  receiptReturnPolicy: string;
  paperWidth: string;
  fontSize: string;
  showQRCode: boolean;
  language: string;
  timezone: string;
  logoUrl: string;
}

export type Permission =
  | "users.view" | "users.create" | "users.edit" | "users.delete"
  | "roles.view" | "roles.create" | "roles.edit" | "roles.delete"
  | "inventory.view" | "inventory.create" | "inventory.edit" | "inventory.delete"
  | "inventory.stock" | "inventory.warehouses" | "inventory.transfers" | "inventory.categories"
  | "sales.view" | "sales.create" | "sales.edit" | "sales.delete"
  | "sales.transactions" | "sales.analytics" | "sales.reps"
  | "pos.view" | "pos.create"
  | "supply.view" | "supply.create" | "supply.edit" | "supply.approve"
  | "supply.orders" | "supply.suppliers"
  | "workflows.view" | "workflows.create" | "workflows.approve" | "workflows.delete"
  | "approvals.view" | "approvals.approve" | "approvals.reject"
  | "approvals.pending" | "approvals.history"
  | "reports.view" | "reports.export"
  | "reports.overview" | "reports.sales" | "reports.inventory" | "reports.gainloss" | "reports.eod" | "reports.expenses" | "reports.operations"
  | "organization.view" | "organization.create" | "organization.edit" | "organization.delete"
  | "organization.stores" | "organization.warehouses" | "organization.departments" | "organization.hierarchy"
  | "documents.view" | "documents.create" | "documents.edit" | "documents.delete"
  | "settings.view" | "settings.edit"
  | "settings.general" | "settings.receipt" | "settings.integrations" | "settings.security"
  | "audit.view"
  | "chat.view" | "chat.create"
  | "notifications.view"
  | "dashboard.view"
  | "pages.dashboard" | "pages.inventory" | "pages.sales" | "pages.pos" | "pages.supply"
  | "pages.workflows" | "pages.approvals" | "pages.reports" | "pages.organization"
  | "pages.documents" | "pages.chat" | "pages.users" | "pages.settings" | "pages.audit"
  | "pages.notifications"
  | "pages.inventory.stock" | "pages.inventory.warehouses" | "pages.inventory.transfers" | "pages.inventory.categories"
  | "pages.sales.transactions" | "pages.sales.analytics" | "pages.sales.reps"
  | "pages.supply.orders" | "pages.supply.suppliers"
  | "pages.approvals.pending" | "pages.approvals.history"
  | "pages.reports.overview" | "pages.reports.sales" | "pages.reports.inventory" | "pages.reports.gainloss" | "pages.reports.eod" | "pages.reports.expenses" | "pages.reports.operations"
  | "pages.organization.stores" | "pages.organization.warehouses" | "pages.organization.departments" | "pages.organization.hierarchy"
  | "pages.settings.general" | "pages.settings.receipt" | "pages.settings.integrations" | "pages.settings.security"
  | "pages.users.users" | "pages.users.roles" | "pages.users.permissions";

export interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  color: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  lastActive: string;
  department: string;
  store: string;
}

export interface IntegrationConfig {
  name: string;
  description: string;
  connected: boolean;
  icon: string;
  category: "payment" | "communication" | "accounting" | "other";
  configFields: string[];
  configValues: Record<string, string>;
}

const allPermissions: Permission[] = [
  "users.view","users.create","users.edit","users.delete",
  "roles.view","roles.create","roles.edit","roles.delete",
  "inventory.view","inventory.create","inventory.edit","inventory.delete",
  "sales.view","sales.create","sales.edit","sales.delete",
  "pos.view","pos.create",
  "supply.view","supply.create","supply.edit","supply.approve",
  "workflows.view","workflows.create","workflows.approve","workflows.delete",
  "approvals.view","approvals.approve","approvals.reject",
  "approvals.pending","approvals.history",
  "reports.view","reports.export",
  "reports.overview","reports.sales","reports.inventory","reports.gainloss","reports.eod","reports.expenses","reports.operations",
  "organization.view","organization.create","organization.edit","organization.delete",
  "organization.stores","organization.warehouses","organization.departments","organization.hierarchy",
  "documents.view","documents.create","documents.edit","documents.delete",
  "settings.view","settings.edit",
  "settings.general","settings.receipt","settings.integrations","settings.security",
  "audit.view",
  "chat.view","chat.create",
  "notifications.view","dashboard.view",
  "inventory.stock","inventory.warehouses","inventory.transfers","inventory.categories",
  "sales.transactions","sales.analytics","sales.reps",
  "supply.orders","supply.suppliers",
  "pages.dashboard","pages.inventory","pages.sales","pages.pos","pages.supply",
  "pages.workflows","pages.approvals","pages.reports","pages.organization",
  "pages.documents","pages.chat","pages.users","pages.settings","pages.audit",
  "pages.notifications",
  "pages.inventory.stock","pages.inventory.warehouses","pages.inventory.transfers","pages.inventory.categories",
  "pages.sales.transactions","pages.sales.analytics","pages.sales.reps",
  "pages.supply.orders","pages.supply.suppliers",
  "pages.approvals.pending","pages.approvals.history",
  "pages.reports.overview","pages.reports.sales","pages.reports.inventory","pages.reports.gainloss","pages.reports.eod","pages.reports.expenses","pages.reports.operations",
  "pages.organization.stores","pages.organization.warehouses","pages.organization.departments","pages.organization.hierarchy",
  "pages.settings.general","pages.settings.receipt","pages.settings.integrations","pages.settings.security",
  "pages.users.users","pages.users.roles","pages.users.permissions",
];

const defaultRoles: AppRole[] = [
  { id: "r1", name: "Super Admin", description: "Full system access with all permissions", permissions: [...allPermissions], isSystem: true, color: "bg-destructive/10 text-destructive" },
  { id: "r2", name: "Admin", description: "Administrative access excluding system settings", permissions: allPermissions.filter(p => !p.startsWith("roles.")), isSystem: true, color: "bg-primary/10 text-primary" },
  { id: "r3", name: "Manager", description: "Manage operations, sales, and inventory", permissions: [
    "users.view","inventory.view","inventory.create","inventory.edit",
    "inventory.stock","inventory.warehouses","inventory.transfers","inventory.categories",
    "sales.view","sales.create","sales.edit","sales.transactions","sales.analytics","sales.reps",
    "pos.view","pos.create",
    "supply.view","supply.create","supply.edit","supply.approve","supply.orders","supply.suppliers",
    "workflows.view","workflows.create","workflows.approve",
    "approvals.view","approvals.approve","approvals.reject","approvals.pending","approvals.history",
    "reports.view","reports.export","reports.overview","reports.sales","reports.inventory","reports.gainloss","reports.eod","reports.expenses","reports.operations",
    "organization.view","organization.stores","organization.warehouses","organization.departments",
    "documents.view","documents.create","documents.edit",
    "settings.view","settings.general","settings.receipt",
    "chat.view","chat.create","audit.view","notifications.view","dashboard.view",
    "pages.dashboard","pages.inventory","pages.sales","pages.pos","pages.supply","pages.workflows","pages.approvals","pages.reports","pages.organization","pages.documents","pages.chat","pages.settings","pages.audit","pages.notifications",
    "pages.inventory.stock","pages.inventory.warehouses","pages.inventory.transfers","pages.inventory.categories",
    "pages.sales.transactions","pages.sales.analytics","pages.sales.reps",
    "pages.supply.orders","pages.supply.suppliers",
    "pages.approvals.pending","pages.approvals.history",
    "pages.reports.overview","pages.reports.sales","pages.reports.inventory","pages.reports.gainloss","pages.reports.eod","pages.reports.expenses","pages.reports.operations",
    "pages.organization.stores","pages.organization.warehouses","pages.organization.departments",
    "pages.settings.general","pages.settings.receipt",
  ], isSystem: false, color: "bg-info/10 text-info" },
  { id: "r4", name: "Sales Rep", description: "Point of sale and sales management", permissions: [
    "sales.view","sales.create","sales.transactions","sales.analytics",
    "pos.view","pos.create","inventory.view","inventory.stock",
    "reports.view","reports.sales","reports.eod",
    "chat.view","chat.create","documents.view","notifications.view","dashboard.view",
    "pages.dashboard","pages.sales","pages.pos","pages.inventory","pages.reports","pages.documents","pages.chat","pages.notifications",
    "pages.sales.transactions","pages.sales.analytics",
    "pages.inventory.stock",
    "pages.reports.sales","pages.reports.eod",
  ], isSystem: false, color: "bg-success/10 text-success" },
  { id: "r5", name: "Warehouse Staff", description: "Inventory and supply chain operations", permissions: [
    "inventory.view","inventory.create","inventory.edit","inventory.stock","inventory.warehouses","inventory.transfers",
    "supply.view","supply.create","supply.orders",
    "workflows.view","documents.view","chat.view","chat.create","notifications.view","dashboard.view",
    "pages.dashboard","pages.inventory","pages.supply","pages.workflows","pages.documents","pages.chat","pages.notifications",
    "pages.inventory.stock","pages.inventory.warehouses","pages.inventory.transfers",
    "pages.supply.orders",
    "workflows.view","documents.view","chat.view","chat.create","notifications.view","dashboard.view",
  ], isSystem: false, color: "bg-warning/10 text-warning" },
  { id: "r6", name: "Viewer", description: "Read-only access to all modules", permissions: allPermissions.filter(p => p.endsWith(".view")), isSystem: false, color: "bg-muted text-muted-foreground" },
];

const defaultUsers: AppUser[] = [
  { id: "u1", name: "Admin", email: "admin@app.com", avatar: "A", role: "Super Admin", status: "active", lastActive: "Now", department: "", store: "" },
];

const defaultIntegrations: IntegrationConfig[] = [
  { name: "Stripe", description: "Payment processing and billing", connected: false, icon: "💳", category: "payment", configFields: ["API Key", "Secret Key", "Webhook Secret"], configValues: {} },
  { name: "Paystack", description: "African payment processing", connected: false, icon: "💰", category: "payment", configFields: ["Public Key", "Secret Key"], configValues: {} },
  { name: "Flutterwave", description: "Pan-African payments", connected: false, icon: "🦋", category: "payment", configFields: ["Public Key", "Secret Key", "Encryption Key"], configValues: {} },
  { name: "SendGrid", description: "Transactional email delivery", connected: false, icon: "📧", category: "communication", configFields: ["API Key", "From Email", "From Name"], configValues: {} },
  { name: "Twilio", description: "SMS and voice communications", connected: false, icon: "📱", category: "communication", configFields: ["Account SID", "Auth Token", "Phone Number"], configValues: {} },
  { name: "WhatsApp Business", description: "WhatsApp messaging API", connected: false, icon: "💬", category: "communication", configFields: ["Phone Number ID", "Access Token", "Business Account ID"], configValues: {} },
  { name: "SMTP Email", description: "Custom SMTP email server", connected: false, icon: "✉️", category: "communication", configFields: ["Host", "Port", "Username", "Password"], configValues: {} },
  { name: "QuickBooks", description: "Accounting and bookkeeping", connected: false, icon: "📊", category: "accounting", configFields: ["Client ID", "Client Secret", "Realm ID"], configValues: {} },
  { name: "Xero", description: "Cloud-based accounting", connected: false, icon: "📒", category: "accounting", configFields: ["Client ID", "Client Secret", "Tenant ID"], configValues: {} },
  { name: "Slack", description: "Team notifications and alerts", connected: false, icon: "🔔", category: "communication", configFields: ["Webhook URL", "Channel"], configValues: {} },
  { name: "Shopify", description: "E-commerce platform sync", connected: false, icon: "🛒", category: "other", configFields: ["Store URL", "API Key", "Secret Key"], configValues: {} },
];

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  roles: AppRole[];
  addRole: (role: Omit<AppRole, "id">) => void;
  updateRole: (id: string, updates: Partial<AppRole>) => void;
  deleteRole: (id: string) => void;
  users: AppUser[];
  addUser: (user: Omit<AppUser, "id">) => void;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  currentUser: AppUser;
  hasPermission: (permission: Permission) => boolean;
  allPermissions: Permission[];
  formatCurrency: (amount: number) => string;
  // Integrations
  integrations: IntegrationConfig[];
  connectIntegration: (name: string, configValues: Record<string, string>) => void;
  disconnectIntegration: (name: string) => void;
  isIntegrationConnected: (name: string) => boolean;
  getIntegrationConfig: (name: string) => IntegrationConfig | undefined;
}

const AppSettingsContext = createContext<AppSettingsContextType>(null!);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem("app-settings");
    return stored ? JSON.parse(stored) : {
      appName: "Enterprise Hub",
      currency: "USD",
      currencySymbol: "$",
      taxRate: 8,
      receiptStyle: "modern",
      receiptHeader: "",
      receiptFooter: "Thank you for your purchase!",
      receiptReturnPolicy: "Returns accepted within 30 days with receipt.",
      paperWidth: "80mm",
      fontSize: "Medium",
      showQRCode: true,
      language: "en",
      timezone: "UTC-05:00 Eastern",
      logoUrl: "",
    };
  });

  const [roles, setRoles] = useState<AppRole[]>(() => {
    const stored = localStorage.getItem("app-roles");
    return stored ? JSON.parse(stored) : defaultRoles;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const stored = localStorage.getItem("app-users");
    return stored ? JSON.parse(stored) : defaultUsers;
  });

  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => {
    const stored = localStorage.getItem("app-integrations");
    return stored ? JSON.parse(stored) : defaultIntegrations;
  });

  const currentUser = users[0];
  const currentRole = roles.find(r => r.name === currentUser.role);

  const hasPermission = useCallback((permission: Permission) => {
    if (!currentRole) return false;
    return currentRole.permissions.includes(permission);
  }, [currentRole]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem("app-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const addRole = useCallback((role: Omit<AppRole, "id">) => {
    setRoles(prev => {
      const next = [...prev, { ...role, id: `r${Date.now()}` }];
      localStorage.setItem("app-roles", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateRole = useCallback((id: string, updates: Partial<AppRole>) => {
    setRoles(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      localStorage.setItem("app-roles", JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteRole = useCallback((id: string) => {
    setRoles(prev => {
      const next = prev.filter(r => r.id !== id);
      localStorage.setItem("app-roles", JSON.stringify(next));
      return next;
    });
  }, []);

  const addUser = useCallback((user: Omit<AppUser, "id">) => {
    setUsers(prev => {
      const next = [...prev, { ...user, id: `u${Date.now()}` }];
      localStorage.setItem("app-users", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<AppUser>) => {
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      localStorage.setItem("app-users", JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => {
      const next = prev.filter(u => u.id !== id);
      localStorage.setItem("app-users", JSON.stringify(next));
      return next;
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `${settings.currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [settings.currencySymbol]);

  // Integration methods
  const connectIntegration = useCallback((name: string, configValues: Record<string, string>) => {
    setIntegrations(prev => {
      const next = prev.map(i => i.name === name ? { ...i, connected: true, configValues } : i);
      localStorage.setItem("app-integrations", JSON.stringify(next));
      return next;
    });
  }, []);

  const disconnectIntegration = useCallback((name: string) => {
    setIntegrations(prev => {
      const next = prev.map(i => i.name === name ? { ...i, connected: false, configValues: {} } : i);
      localStorage.setItem("app-integrations", JSON.stringify(next));
      return next;
    });
  }, []);

  const isIntegrationConnected = useCallback((name: string) => {
    return integrations.find(i => i.name === name)?.connected || false;
  }, [integrations]);

  const getIntegrationConfig = useCallback((name: string) => {
    return integrations.find(i => i.name === name);
  }, [integrations]);

  return (
    <AppSettingsContext.Provider value={{
      settings, updateSettings,
      roles, addRole, updateRole, deleteRole,
      users, addUser, updateUser, deleteUser,
      currentUser, hasPermission, allPermissions,
      formatCurrency,
      integrations, connectIntegration, disconnectIntegration, isIntegrationConnected, getIntegrationConfig,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
